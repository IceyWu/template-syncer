import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { platform, Git, Scanner, Merger } from './utils';
import { prompts, logger, formatFileTree } from './ui';
import type { 
  SyncerOptions, 
  SyncConfig, 
  FileChange, 
  BatchResult, 
  Recommendation,
  SyncRules
} from './types';

const CONFIG_FILE = '.template-sync.json';

/**
 * 模板同步器
 */
export class TemplateSyncer {
  private options: Required<Pick<SyncerOptions, 'tempDir' | 'verbose'>> & SyncerOptions;
  private git: Git;
  private scanner: Scanner;
  private merger: Merger;
  private rules: SyncRules;
  private stagingDir: string | null = null;

  constructor(options: SyncerOptions = {}) {
    this.options = {
      tempDir: path.join(os.tmpdir(), 'template-sync'),
      verbose: false,
      ...options
    };

    this.rules = {
      deleteOrphans: false,
      deletePatterns: [],
      protectPatterns: [],
      autoBackup: true,
      defaultMergeStrategy: 'overwrite',
      ...options.rules
    };

    this.git = new Git(this.options.verbose);
    this.scanner = new Scanner(options.ignore, options.categories);
    this.merger = new Merger(options.mergers, this.rules.defaultMergeStrategy);
  }

  /**
   * 加载配置
   */
  private loadConfig(): SyncConfig {
    const config = platform.readJson<SyncConfig>(CONFIG_FILE) || {};
    this.rules = {
      deleteOrphans: false,
      deletePatterns: [],
      protectPatterns: [],
      autoBackup: true,
      defaultMergeStrategy: 'overwrite',
      ...config.rules,
      ...this.options.rules
    };
    this.scanner = new Scanner(
      [...(config.ignore || []), ...(this.options.ignore || [])],
      [...(config.categories || []), ...(this.options.categories || [])]
    );
    this.merger = new Merger(
      { ...(config.mergers || {}), ...(this.options.mergers || {}) },
      this.rules.defaultMergeStrategy
    );
    return config;
  }

  /**
   * 保存配置
   */
  private saveConfig(config: SyncConfig): void {
    platform.writeJson(CONFIG_FILE, config);
  }

  /**
   * 获取模板仓库
   */
  async getRepo(): Promise<string> {
    const config = this.loadConfig();
    if (!this.options.branch) this.options.branch = config.branch;
    if (!this.options.repo) this.options.repo = config.repo;

    if (this.options.repo) return this.options.repo;

    const repo = await prompts.inputRepo();
    this.options.repo = repo;
    this.saveConfig({ ...config, repo });
    return repo;
  }

  private createStagingDir(): string {
    const dir = fs.mkdtempSync(`${path.resolve(this.options.tempDir)}-`);
    this.stagingDir = dir;
    const relative = path.relative(process.cwd(), dir).replace(/\\/g, '/');
    if (relative && !relative.startsWith('../') && !path.isAbsolute(relative)) {
      this.scanner.addIgnore(`${relative}/**`);
    }
    return dir;
  }

  /**
   * 克隆模板
   */
  async cloneTemplate(): Promise<void> {
    const repo = await this.getRepo();

    const tempDir = this.createStagingDir();
    logger.step('克隆模板...');
    this.git.clone(repo, tempDir);

    // 选择分支
    if (!this.options.branch) {
      const branches = this.git.getBranches(tempDir);
      if (branches.length > 1) {
        console.log(`\n发现 ${branches.length} 个分支`);
        this.options.branch = await prompts.selectBranch(branches);
      } else {
        this.options.branch = branches[0] || 'main';
      }
    }

    // 切换分支
    if (this.options.branch) {
      logger.step(`选择分支: ${this.options.branch}`);
      this.git.checkout(this.options.branch, tempDir);
    }

    logger.success('模板克隆完成');
  }

  /**
   * 扫描变更
   */
  async scanChanges(): Promise<FileChange[]> {
    logger.step('扫描文件差异...');
    const detectOrphans = this.rules.deleteOrphans || 
      (this.rules.deletePatterns && this.rules.deletePatterns.length > 0);
    
    let changes = await this.scanner.compare(
      this.stagingDir!,
      process.cwd(),
      detectOrphans
    );

    // 过滤要删除的文件
    if (detectOrphans) {
      const orphans = changes.filter(c => c.status === 'deleted');
      const others = changes.filter(c => c.status !== 'deleted');
      
      // 如果 deletePatterns 为空数组，使用默认值 ['**'] 匹配所有文件
      const patterns = this.rules.deletePatterns && this.rules.deletePatterns.length > 0 
        ? this.rules.deletePatterns 
        : ['**'];
      
      const filteredOrphans = this.scanner.filterOrphans(
        orphans,
        patterns,
        this.rules.protectPatterns || []
      );

      changes = [...others, ...filteredOrphans];
    }

    return changes;
  }

  /**
   * 应用变更
   */
  async applyChanges(changes: FileChange[]): Promise<BatchResult> {
    const result: BatchResult = { success: [], skipped: [], failed: [] };

    console.log(`\n开始处理 ${changes.length} 个文件...\n`);

    for (const file of changes) {
        try {
          const root = path.resolve(process.cwd());
          const targetPath = path.resolve(root, file.path);
          const relative = path.relative(root, targetPath);
          if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
            throw new Error(`目标路径超出项目目录: ${file.path}`);
          }
          let cursor = root;
          for (const segment of relative.split(path.sep)) {
            cursor = path.join(cursor, segment);
            try {
              const stat = await fs.promises.lstat(cursor);
              if (stat.isSymbolicLink()) throw new Error(`目标路径包含符号链接: ${file.path}`);
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
            }
          }
          if (file.status === 'deleted') {
            platform.removeFile(targetPath);
            result.success.push(file.path);
            logger.file('🗑️', file.path, '已删除');
          } else {
            const mergeResult = await this.merger.merge(file.templatePath, file.currentPath, targetPath);
            if (mergeResult.success) {
              result.success.push(file.path);
            } else {
              result.skipped.push(file.path);
            }
            logger.file(file.icon, file.path, mergeResult.message);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          result.failed.push({ path: file.path, error: message });
          logger.file(file.icon, file.path, `失败: ${message}`);
        }
    }

    return result;
  }

  /**
   * 生成推荐
   */
  generateRecommendations(changes: FileChange[]): Recommendation[] {
    if (changes.length === 0) return [];

    const high: FileChange[] = [];
    const medium: FileChange[] = [];
    const low: FileChange[] = [];

    // 核心配置文件
    const coreFiles = new Set([
      'package.json', 'tsconfig.json', 'jsconfig.json',
      'vite.config.ts', 'vite.config.js', 'vite.config.mjs'
    ]);

    // 开发工具配置
    const devCategories = new Set([
      '代码质量', '代码格式化', '构建配置', 'TypeScript', '测试配置'
    ]);

    for (const file of changes) {
      const fileName = path.basename(file.path);
      
      if (coreFiles.has(fileName)) {
        high.push(file);
      } else if (devCategories.has(file.category)) {
        medium.push(file);
      } else {
        low.push(file);
      }
    }

    const recommendations: Recommendation[] = [];

    if (high.length > 0) {
      recommendations.push({
        priority: 'high',
        title: '核心配置更新',
        description: '更新项目核心配置文件',
        files: high
      });
    }

    if (medium.length > 0) {
      recommendations.push({
        priority: 'medium',
        title: '开发工具配置',
        description: '更新代码质量和构建工具配置',
        files: medium
      });
    }

    if (low.length > 0) {
      recommendations.push({
        priority: 'low',
        title: '其他文件',
        description: '更新文档、样式等其他文件',
        files: low
      });
    }

    return recommendations;
  }

  /**
   * 清理临时文件
   */
  cleanup(): void {
    if (!this.stagingDir) return;
    platform.removeDir(this.stagingDir);
    this.stagingDir = null;
    logger.step('清理临时文件完成');
  }

  /**
   * 主同步流程
   */
  async sync(): Promise<void> {
    try {
      logger.info('🚀 开始模板同步...');

      // 创建备份
      logger.step('创建 Git 备份...');
      this.loadConfig();
      if (!this.rules.autoBackup) {
        logger.info('已按配置跳过 Git 备份');
      } else if (this.git.backup()) {
        logger.success('备份已创建');
      } else {
        logger.warn('Git 备份失败，请确保有变更需要备份');
      }

      // 克隆模板
      await this.cloneTemplate();

      // 扫描变更
      const changes = await this.scanChanges();

      if (changes.length === 0) {
        logger.success('没有发现任何变更，项目已是最新');
        return;
      }

      // 显示变更统计
      prompts.showChangeSummary(changes);

      // 选择处理方式
      const action = await prompts.selectAction();

      if (action === 'cancel') {
        logger.warn('操作已取消');
        return;
      }

      let selected: FileChange[];

      if (action === 'all') {
        selected = changes;
      } else if (action === 'category') {
        selected = await prompts.selectByCategory(changes);
      } else {
        selected = await prompts.selectIndividually(changes);
      }

      if (selected.length === 0) {
        logger.warn('没有选择任何文件');
        return;
      }

      // 确认
      const confirmed = await prompts.confirm(`确定要处理 ${selected.length} 个文件吗?`);
      if (!confirmed) {
        logger.warn('操作已取消');
        return;
      }

      // 应用变更
      const result = await this.applyChanges(selected);
      logger.summary(result);

      if (result.failed.length > 0) throw new Error(`${result.failed.length} 个文件同步失败`);

      logger.info('🎉 模板同步完成!');
    } finally {
      this.cleanup();
    }
  }

  async batch(): Promise<void> {
    try {
      logger.info('🔄 批量处理模式');

      await this.cloneTemplate();
      const changes = await this.scanChanges();

      if (changes.length === 0) {
        logger.success('没有发现需要处理的文件');
        return;
      }

      const recommendations = this.generateRecommendations(changes);
      const selected = await prompts.selectRecommendations(recommendations);
      const files = selected.flatMap(r => r.files);

      if (files.length > 0) {
        const result = await this.applyChanges(files);
        logger.summary(result);
        if (result.failed.length > 0) throw new Error(`${result.failed.length} 个文件同步失败`);
      }
    } finally {
      this.cleanup();
    }
  }

  /**
   * 预览模式
   */
  async preview(): Promise<void> {
    try {
      logger.info('🔍 预览模式');

      await this.cloneTemplate();
      const changes = await this.scanChanges();

      if (changes.length === 0) {
        logger.success('没有发现任何差异');
        return;
      }

      prompts.showChangeSummary(changes);
      
      // 显示完整文件树
      console.log('📁 文件结构:\n');
      console.log(formatFileTree(changes));
    } finally {
      this.cleanup();
    }
  }

  async smart(): Promise<void> {
    try {
      logger.info('🤖 智能同步模式');

      await this.cloneTemplate();
      const changes = await this.scanChanges();

      if (changes.length === 0) {
        logger.success('项目已是最新，无需同步');
        return;
      }

      const recommendations = this.generateRecommendations(changes);
      const selected = await prompts.selectRecommendations(recommendations);
      const files = selected.flatMap(r => r.files);

      if (files.length > 0) {
        const confirmed = await prompts.confirm(`确定要处理 ${files.length} 个文件吗?`);
        if (confirmed) {
          const result = await this.applyChanges(files);
          logger.summary(result);
          if (result.failed.length > 0) throw new Error(`${result.failed.length} 个文件同步失败`);
        }
      }
    } finally {
      this.cleanup();
    }
  }

  async init(): Promise<void> {
    logger.info('🔧 初始化配置向导\n');

    const answers = await prompts.initConfig();

    const config: SyncConfig = {
      repo: answers.repo || undefined,
      branch: answers.branch || undefined,
      ignore: answers.ignore.length > 0 ? answers.ignore : undefined,
      lastSync: new Date().toISOString()
    };

    this.saveConfig(config);
    logger.success(`配置已保存到 ${CONFIG_FILE}`);
  }
}
