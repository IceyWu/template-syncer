import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as inquirer from 'inquirer';
const chalk = require('chalk');
import { glob } from 'glob';
import { promisify } from 'util';
import { 
  FileConfig, 
  FileType, 
  TemplateSyncerOptions, 
  FileTypeConfig, 
  ProcessResult, 
  BatchResults, 
  Recommendation,
  SyncConfig 
} from './types';

/**
 * 智能模板同步工具
 * 用于将项目与模板仓库保持同步
 */
export class TemplateSyncer {
  private tempDir: string;
  private templateRepo: string | undefined;
  private configFile: string;
  private changes: string[];
  private verbose: boolean;
  private ignorePatterns: string[];
  private fileTypeConfig: Record<string, FileTypeConfig>;
  private specialFiles: Record<string, FileTypeConfig>;

  constructor(options: TemplateSyncerOptions = {}) {
    this.tempDir = options.tempDir || '.temp-template';
    this.templateRepo = options.templateRepo;
    this.configFile = '.template-sync.json';
    this.changes = [];
    this.verbose = options.verbose || false;
    
    // 忽略的文件和目录模式
    this.ignorePatterns = [
      'node_modules/**',
      '.git/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.nyc_output/**',
      'logs/**',
      '*.log',
      '.DS_Store',
      'Thumbs.db',
      '.vscode/**',
      '.idea/**',
      '*.tmp',
      '*.temp',
      '.cache/**',
      '.nuxt/**',
      '.next/**',
      '.output/**',
      this.tempDir + '/**'
    ];

    // 扩展的文件类型支持
    this.fileTypeConfig = {
      // JavaScript/TypeScript 相关
      '.js': { type: 'js', category: '脚本文件', icon: '📜' },
      '.mjs': { type: 'js', category: '脚本文件', icon: '📜' },
      '.cjs': { type: 'js', category: '脚本文件', icon: '📜' },
      '.ts': { type: 'js', category: '脚本文件', icon: '📜' },
      '.jsx': { type: 'react', category: 'React 组件', icon: '⚛️' },
      '.tsx': { type: 'react', category: 'React 组件', icon: '⚛️' },
      
      // Vue 相关
      '.vue': { type: 'vue', category: 'Vue 组件', icon: '💚' },
      
      // Angular 相关  
      '.component.ts': { type: 'angular', category: 'Angular 组件', icon: '🅰️' },
      '.service.ts': { type: 'angular', category: 'Angular 服务', icon: '🅰️' },
      '.module.ts': { type: 'angular', category: 'Angular 模块', icon: '🅰️' },
      '.directive.ts': { type: 'angular', category: 'Angular 指令', icon: '🅰️' },
      
      // Svelte 相关
      '.svelte': { type: 'svelte', category: 'Svelte 组件', icon: '🔥' },
      
      // 样式文件
      '.css': { type: 'css', category: '样式文件', icon: '🎨' },
      '.scss': { type: 'css', category: '样式文件', icon: '🎨' },
      '.sass': { type: 'css', category: '样式文件', icon: '🎨' },
      '.less': { type: 'css', category: '样式文件', icon: '🎨' },
      '.styl': { type: 'css', category: '样式文件', icon: '🎨' },
      '.stylus': { type: 'css', category: '样式文件', icon: '🎨' },
      
      // 配置文件
      '.json': { type: 'json', category: '配置文件', icon: '⚙️' },
      '.yml': { type: 'yaml', category: '配置文件', icon: '⚙️' },
      '.yaml': { type: 'yaml', category: '配置文件', icon: '⚙️' },
      '.toml': { type: 'config', category: '配置文件', icon: '⚙️' },
      '.ini': { type: 'config', category: '配置文件', icon: '⚙️' },
      '.xml': { type: 'config', category: '配置文件', icon: '⚙️' },
      
      // 文档文件
      '.md': { type: 'text', category: '文档文件', icon: '📝' },
      '.txt': { type: 'text', category: '文档文件', icon: '📝' },
      '.rst': { type: 'text', category: '文档文件', icon: '📝' },
      
      // 图片文件
      '.png': { type: 'image', category: '图片文件', icon: '🖼️' },
      '.jpg': { type: 'image', category: '图片文件', icon: '🖼️' },
      '.jpeg': { type: 'image', category: '图片文件', icon: '🖼️' },
      '.gif': { type: 'image', category: '图片文件', icon: '🖼️' },
      '.svg': { type: 'image', category: '图片文件', icon: '🖼️' },
      '.webp': { type: 'image', category: '图片文件', icon: '🖼️' },
      '.ico': { type: 'image', category: '图片文件', icon: '🖼️' },
      
      // 其他文件
      '.sh': { type: 'text', category: '脚本文件', icon: '🐚' },
      '.bat': { type: 'text', category: '脚本文件', icon: '🪟' },
      '.ps1': { type: 'text', category: '脚本文件', icon: '💙' },
      '.env': { type: 'config', category: '环境配置', icon: '🌍' },
      '.example': { type: 'config', category: '示例文件', icon: '📄' },
      '.sample': { type: 'config', category: '示例文件', icon: '📄' }
    };

    // 特殊文件配置（无扩展名或特殊命名）
    this.specialFiles = {
      // Git 相关
      '.gitignore': { type: 'config', category: '版本控制', icon: '📋' },
      '.gitattributes': { type: 'config', category: '版本控制', icon: '📋' },
      '.gitmessage': { type: 'text', category: '版本控制', icon: '📋' },
      
      // Node.js 相关
      '.npmrc': { type: 'config', category: '包管理', icon: '📦' },
      '.nvmrc': { type: 'config', category: '环境配置', icon: '🔧' },
      'package.json': { type: 'json', category: '项目配置', icon: '📦' },
      'package-lock.json': { type: 'json', category: '包管理', icon: '🔒' },
      'yarn.lock': { type: 'text', category: '包管理', icon: '🧶' },
      'pnpm-lock.yaml': { type: 'yaml', category: '包管理', icon: '📦' },
      
      // 编辑器配置
      '.editorconfig': { type: 'config', category: '编辑器配置', icon: '✏️' },
      '.vscode/settings.json': { type: 'json', category: 'VS Code', icon: '💙' },
      '.vscode/extensions.json': { type: 'json', category: 'VS Code', icon: '💙' },
      '.vscode/launch.json': { type: 'json', category: 'VS Code', icon: '💙' },
      
      // 代码质量工具
      '.eslintrc': { type: 'json', category: '代码质量', icon: '🔍' },
      '.eslintrc.js': { type: 'js', category: '代码质量', icon: '🔍' },
      '.eslintrc.json': { type: 'json', category: '代码质量', icon: '🔍' },
      '.eslintrc.yml': { type: 'yaml', category: '代码质量', icon: '🔍' },
      '.eslintrc.yaml': { type: 'yaml', category: '代码质量', icon: '🔍' },
      '.prettierrc': { type: 'json', category: '代码格式化', icon: '💄' },
      '.prettierrc.js': { type: 'js', category: '代码格式化', icon: '💄' },
      '.prettierrc.json': { type: 'json', category: '代码格式化', icon: '💄' },
      '.prettierrc.yml': { type: 'yaml', category: '代码格式化', icon: '💄' },
      '.stylelintrc': { type: 'json', category: '样式检查', icon: '🎨' },
      '.stylelintrc.js': { type: 'js', category: '样式检查', icon: '🎨' },
      '.stylelintrc.json': { type: 'json', category: '样式检查', icon: '🎨' },
      
      // 构建工具配置
      'vite.config.js': { type: 'js', category: '构建配置', icon: '⚡' },
      'vite.config.ts': { type: 'js', category: '构建配置', icon: '⚡' },
      'webpack.config.js': { type: 'js', category: '构建配置', icon: '📦' },
      'rollup.config.js': { type: 'js', category: '构建配置', icon: '🎯' },
      'nuxt.config.js': { type: 'js', category: '构建配置', icon: '💚' },
      'nuxt.config.ts': { type: 'js', category: '构建配置', icon: '💚' },
      'next.config.js': { type: 'js', category: '构建配置', icon: '⚫' },
      'tailwind.config.js': { type: 'js', category: '样式配置', icon: '🌊' },
      'unocss.config.js': { type: 'js', category: '样式配置', icon: '🎨' },
      'unocss.config.ts': { type: 'js', category: '样式配置', icon: '🎨' },
      'postcss.config.js': { type: 'js', category: '样式配置', icon: '📮' },
      
      // TypeScript 配置
      'tsconfig.json': { type: 'json', category: 'TypeScript', icon: '🔷' },
      'jsconfig.json': { type: 'json', category: 'JavaScript', icon: '🟨' },
      
      // 测试配置
      'jest.config.js': { type: 'js', category: '测试配置', icon: '🃏' },
      'vitest.config.js': { type: 'js', category: '测试配置', icon: '🧪' },
      'vitest.config.ts': { type: 'js', category: '测试配置', icon: '🧪' },
      'cypress.config.js': { type: 'js', category: '测试配置', icon: '🌀' },
      'playwright.config.js': { type: 'js', category: '测试配置', icon: '🎭' },
      'playwright.config.ts': { type: 'js', category: '测试配置', icon: '🎭' },
      
      // 容器化
      'Dockerfile': { type: 'text', category: '容器化', icon: '🐳' },
      '.dockerignore': { type: 'text', category: '容器化', icon: '🐳' },
      'docker-compose.yml': { type: 'yaml', category: '容器化', icon: '🐳' },
      'docker-compose.yaml': { type: 'yaml', category: '容器化', icon: '🐳' },
      
      // 其他重要文件
      'LICENSE': { type: 'text', category: '许可证', icon: '📄' },
      'README.md': { type: 'text', category: '文档', icon: '📖' },
      'CHANGELOG.md': { type: 'text', category: '文档', icon: '📋' },
      'CONTRIBUTING.md': { type: 'text', category: '文档', icon: '🤝' },
      'Makefile': { type: 'text', category: '构建脚本', icon: '🔨' },
      'renovate.json': { type: 'json', category: '自动化', icon: '🔄' },
      'netlify.toml': { type: 'config', category: '部署配置', icon: '🌐' },      'vercel.json': { type: 'json', category: '部署配置', icon: '▲' }
    };
  }

  /**
   * 创建 Git 备份
   */
  createBackup(): void {
    console.log('📦 创建备份...');
    try {
      execSync('git add . && git stash push -m "Template sync backup"', { 
        stdio: this.verbose ? 'inherit' : 'ignore' 
      });
      console.log('✅ 备份已创建');
    } catch (error) {
      console.log('⚠️  Git 备份失败，请确保有 Git 变更需要备份');
    }
  }

  /**
   * 克隆模板仓库
   */
  async cloneTemplate(): Promise<void> {
    console.log('📦 克隆最新模板...');

    if (fs.existsSync(this.tempDir)) {
      execSync(`rmdir /s /q ${this.tempDir}`, { stdio: 'ignore' });
    }

    try {
      execSync(`git clone --depth 1 "${this.templateRepo}" ${this.tempDir}`, { 
        stdio: this.verbose ? 'inherit' : 'ignore' 
      });
      execSync(`rmdir /s /q ${this.tempDir}\\.git`, { stdio: 'ignore' });
      console.log('✅ 模板克隆完成');
    } catch (error) {
      console.log('❌ 模板克隆失败');
      console.log('可能的原因:');
      console.log('  • 网络连接问题');
      console.log('  • 仓库不存在或无访问权限');
      console.log('  • Git 未正确安装');
      if (this.verbose && error instanceof Error) {
        console.log(`错误详情: ${error.message}`);
      }
      throw new Error('模板克隆失败');
    }
  }  /**
   * 获取或设置模板仓库
   */
  async getTemplateRepo(): Promise<string> {
    if (this.templateRepo) {
      return this.templateRepo;
    }

    // 尝试从配置文件读取
    const config = this.loadConfig();
    if (config.templateRepo) {
      this.templateRepo = config.templateRepo;
      return this.templateRepo;
    }

    // 交互式获取
    const { templateRepo } = await inquirer.prompt([
      {
        type: 'input',
        name: 'templateRepo',
        message: '请输入模板仓库 URL:',
        validate: (input: string) => {
          if (!input.trim()) {
            return '模板仓库 URL 不能为空';
          }
          return true;
        }
      }
    ]);    this.templateRepo = templateRepo;
    
    // 保存到配置文件
    this.saveConfig({ ...config, templateRepo });
    
    return templateRepo;
  }

  /**
   * 测试仓库连接
   */
  async testRepository(repo: string): Promise<boolean> {
    console.log(`🔍 测试仓库连接: ${repo}`);
    try {
      // 尝试获取仓库信息
      execSync(`git ls-remote --heads ${repo}`, { stdio: 'ignore' });
      console.log('✅ 仓库连接成功');
      return true;
    } catch (error) {
      console.log('❌ 仓库连接失败');
      return false;
    }
  }
  /**
   * 扫描模板文件
   */
  async scanTemplateFiles(): Promise<FileConfig[]> {
    const files: FileConfig[] = [];
    
    if (!fs.existsSync(this.tempDir)) {
      throw new Error('模板目录不存在，请先克隆模板');
    }

    const globPattern = '**/*';
    const foundFiles = await glob(globPattern, {
      cwd: this.tempDir,
      ignore: this.ignorePatterns,
      dot: true
    });

    for (const file of foundFiles) {
      const fullPath = path.join(this.tempDir, file);
      
      try {
        const stat = fs.statSync(fullPath);
        
        if (stat.isFile()) {
          const fileConfig = this.analyzeFile(file, fullPath);
          files.push(fileConfig);
        }
      } catch (error) {
        // 忽略无法访问的文件
        continue;
      }
    }

    return files.sort((a, b) => a.path.localeCompare(b.path));
  }
  /**
   * 扫描当前项目文件
   */
  async scanCurrentFiles(): Promise<FileConfig[]> {
    const files: FileConfig[] = [];
    
    const globPattern = '**/*';
    const foundFiles = await glob(globPattern, {
      cwd: process.cwd(),
      ignore: this.ignorePatterns,
      dot: true
    });

    for (const file of foundFiles) {
      const fullPath = path.join(process.cwd(), file);
      
      try {
        const stat = fs.statSync(fullPath);
        
        if (stat.isFile()) {
          const fileConfig = this.analyzeFile(file, fullPath);
          fileConfig.exists = true;
          files.push(fileConfig);
        }
      } catch (error) {
        // 忽略无法访问的文件
        continue;
      }
    }

    return files.sort((a, b) => a.path.localeCompare(b.path));
  }

  /**
   * 分析文件类型和特征
   */
  private analyzeFile(relativePath: string, fullPath: string): FileConfig {
    const fileName = path.basename(relativePath);
    const ext = path.extname(fileName);
    
    // 检查特殊文件
    if (this.specialFiles[fileName]) {
      const config = this.specialFiles[fileName];
      return {
        path: relativePath,
        fullPath,
        type: config.type,
        category: config.category,
        selected: true,
        icon: config.icon
      };
    }

    // 检查扩展名
    if (ext && this.fileTypeConfig[ext]) {
      const config = this.fileTypeConfig[ext];
      return {
        path: relativePath,
        fullPath,
        type: config.type,
        category: config.category,
        selected: true,
        icon: config.icon
      };
    }

    // 默认配置
    return {
      path: relativePath,
      fullPath,
      type: 'text',
      category: '其他文件',
      selected: true,
      icon: '📄'
    };
  }

  /**
   * 对比文件并生成变更列表
   */
  async compareFiles(templateFiles: FileConfig[], currentFiles: FileConfig[]): Promise<FileConfig[]> {
    const changes: FileConfig[] = [];
    const currentFileMap = new Map(currentFiles.map(f => [f.path, f]));

    for (const templateFile of templateFiles) {
      const currentFile = currentFileMap.get(templateFile.path);
      
      if (!currentFile) {
        // 新文件
        changes.push({
          ...templateFile,
          status: 'new',
          isNew: true,
          exists: false,
          templatePath: templateFile.fullPath,
          currentPath: path.join(process.cwd(), templateFile.path)
        });
      } else {
        // 检查文件是否有变更
        const templateContent = fs.readFileSync(templateFile.fullPath!, 'utf8');
        const currentContent = fs.readFileSync(currentFile.fullPath!, 'utf8');
        
        if (templateContent !== currentContent) {
          changes.push({
            ...templateFile,
            status: 'modified',
            isNew: false,
            exists: true,
            templatePath: templateFile.fullPath,
            currentPath: currentFile.fullPath
          });
        }
      }
    }

    return changes;
  }

  /**
   * 交互式选择要应用的变更
   */
  async selectChangesToApply(changes: FileConfig[]): Promise<FileConfig[]> {
    if (changes.length === 0) {
      console.log('✅ 没有发现任何变更');
      return [];
    }

    console.log(`\n发现 ${changes.length} 个文件需要处理:\n`);

    // 按类别分组显示
    const categories = new Map<string, FileConfig[]>();
    changes.forEach(file => {
      const category = file.category;
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(file);
    });

    // 显示分类统计
    for (const [category, files] of categories) {
      const newFiles = files.filter(f => f.status === 'new').length;
      const modifiedFiles = files.filter(f => f.status === 'modified').length;
      console.log(`${files[0].icon} ${category}: ${files.length} 个文件 (新增: ${newFiles}, 修改: ${modifiedFiles})`);
    }

    // 询问用户如何处理
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: '选择处理方式:',
        choices: [
          { name: '📋 按分类选择文件', value: 'category' },
          { name: '📝 逐一选择文件', value: 'individual' },
          { name: '✅ 应用所有变更', value: 'all' },
          { name: '❌ 取消操作', value: 'cancel' }
        ]
      }
    ]);

    if (action === 'cancel') {
      return [];
    }

    if (action === 'all') {
      return changes;
    }

    if (action === 'category') {
      return await this.selectByCategory(categories);
    }

    return await this.selectIndividually(changes);
  }

  /**
   * 按分类选择文件
   */
  private async selectByCategory(categories: Map<string, FileConfig[]>): Promise<FileConfig[]> {
    const selectedFiles: FileConfig[] = [];

    for (const [category, files] of categories) {
      const { shouldProcess } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'shouldProcess',
          message: `处理 ${files[0].icon} ${category} (${files.length} 个文件)?`,
          default: true
        }
      ]);

      if (shouldProcess) {
        selectedFiles.push(...files);
      }
    }

    return selectedFiles;
  }

  /**
   * 逐一选择文件
   */
  private async selectIndividually(changes: FileConfig[]): Promise<FileConfig[]> {
    const choices = changes.map(file => ({
      name: `${file.icon} ${file.path} (${file.status === 'new' ? '新增' : '修改'})`,
      value: file,
      checked: true
    }));

    const { selectedFiles } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedFiles',
        message: '选择要处理的文件:',
        choices,
        pageSize: 15
      }
    ]);

    return selectedFiles;
  }

  /**
   * 批量更新文件
   */
  async batchUpdateFiles(files: FileConfig[]): Promise<BatchResults> {
    const results: BatchResults = {
      success: [],
      skipped: [],
      failed: []
    };

    console.log(`\n开始处理 ${files.length} 个文件...\n`);

    for (const file of files) {
      try {
        console.log(`处理: ${file.icon} ${file.path}`);
        
        const result = await this.updateSingleFile(file);
        
        if (result.applied) {
          results.success.push(file.path);
          console.log(`✅ ${result.message}`);
        } else {
          results.skipped.push(file.path);
          console.log(`⏭️  ${result.message}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.failed.push({ path: file.path, error: errorMessage });
        console.log(`❌ 失败: ${errorMessage}`);
      }
    }

    return results;
  }

  /**
   * 更新单个文件
   */
  private async updateSingleFile(file: FileConfig): Promise<ProcessResult> {
    if (!file.templatePath) {
      return { applied: false, message: '模板文件路径不存在' };
    }

    // 确保目标目录存在
    const targetDir = path.dirname(file.currentPath!);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 特殊处理 package.json
    if (file.path === 'package.json') {
      return await this.mergePackageJson(file);
    }

    // 复制文件
    fs.copyFileSync(file.templatePath, file.currentPath!);
    
    return { 
      applied: true, 
      message: file.status === 'new' ? '文件已创建' : '文件已更新' 
    };
  }

  /**
   * 智能合并 package.json
   */
  private async mergePackageJson(file: FileConfig): Promise<ProcessResult> {
    const templateContent = JSON.parse(fs.readFileSync(file.templatePath!, 'utf8'));
    
    if (!fs.existsSync(file.currentPath!)) {
      // 如果当前文件不存在，直接复制
      fs.writeFileSync(file.currentPath!, JSON.stringify(templateContent, null, 2));
      return { applied: true, message: 'package.json 已创建' };
    }

    const currentContent = JSON.parse(fs.readFileSync(file.currentPath!, 'utf8'));
    
    // 智能合并逻辑
    const merged = {
      ...currentContent,
      ...templateContent,
      // 保留当前项目的基本信息
      name: currentContent.name || templateContent.name,
      version: currentContent.version || templateContent.version,
      description: currentContent.description || templateContent.description,
      // 合并依赖
      dependencies: {
        ...currentContent.dependencies,
        ...templateContent.dependencies
      },
      devDependencies: {
        ...currentContent.devDependencies,
        ...templateContent.devDependencies
      },
      // 合并脚本
      scripts: {
        ...currentContent.scripts,
        ...templateContent.scripts
      }
    };

    fs.writeFileSync(file.currentPath!, JSON.stringify(merged, null, 2));
    return { applied: true, message: 'package.json 已智能合并' };
  }

  /**
   * 显示操作摘要
   */
  showSummary(results: BatchResults): void {
    console.log('\n' + '='.repeat(50));
    console.log('📊 操作摘要');
    console.log('='.repeat(50));
    
    console.log(`✅ 成功: ${results.success.length} 个文件`);
    if (results.success.length > 0) {
      results.success.forEach(file => console.log(`   • ${file}`));
    }
    
    console.log(`⏭️  跳过: ${results.skipped.length} 个文件`);
    if (results.skipped.length > 0) {
      results.skipped.forEach(file => console.log(`   • ${file}`));
    }
    
    console.log(`❌ 失败: ${results.failed.length} 个文件`);
    if (results.failed.length > 0) {
      results.failed.forEach(item => console.log(`   • ${item.path}: ${item.error}`));
    }

    console.log('\n' + '='.repeat(50));
  }

  /**
   * 清理临时文件
   */
  cleanup(): void {
    if (fs.existsSync(this.tempDir)) {
      try {
        execSync(`rmdir /s /q ${this.tempDir}`, { stdio: 'ignore' });
        console.log('🧹 清理临时文件完成');
      } catch (error) {
        console.log('⚠️  清理临时文件失败');
      }
    }
  }

  /**
   * 加载配置文件
   */
  private loadConfig(): SyncConfig {
    if (fs.existsSync(this.configFile)) {
      try {
        return JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
      } catch (error) {
        console.log('⚠️  配置文件格式错误，将使用默认配置');
      }
    }
    return {};
  }

  /**
   * 保存配置文件
   */
  private saveConfig(config: SyncConfig): void {
    try {
      fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
    } catch (error) {
      console.log('⚠️  保存配置文件失败');
    }
  }

  /**
   * 主同步流程
   */
  async sync(options: TemplateSyncerOptions = {}): Promise<void> {
    try {
      console.log(chalk.blue('🚀 开始模板同步...'));
      
      // 获取模板仓库
      const repo = await this.getTemplateRepo();
      
      // 测试仓库连接
      const isReachable = await this.testRepository(repo);
      if (!isReachable) {
        throw new Error('无法连接到模板仓库');
      }

      // 创建备份
      this.createBackup();
      
      // 克隆模板
      await this.cloneTemplate();
      
      // 扫描文件
      console.log('📁 扫描模板文件...');
      const templateFiles = await this.scanTemplateFiles();
      
      console.log('📁 扫描当前文件...');
      const currentFiles = await this.scanCurrentFiles();
      
      // 对比文件
      console.log('🔍 对比文件差异...');
      const changes = await this.compareFiles(templateFiles, currentFiles);
      
      // 选择要应用的变更
      const selectedFiles = await this.selectChangesToApply(changes);
      
      if (selectedFiles.length === 0) {
        console.log('ℹ️  没有选择任何文件进行处理');
        return;
      }

      // 最终确认
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `确定要处理 ${selectedFiles.length} 个文件吗?`,
          default: true
        }
      ]);

      if (!confirm) {
        console.log('❌ 操作已取消');
        return;
      }

      // 批量更新文件
      const results = await this.batchUpdateFiles(selectedFiles);
      
      // 显示摘要
      this.showSummary(results);
      
      console.log(chalk.green('🎉 模板同步完成!'));
      
    } catch (error) {
      console.error(chalk.red('❌ 同步失败:'), error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      // 清理临时文件
      this.cleanup();
    }
  }

  /**
   * 初始化配置向导
   */
  async initConfig(): Promise<void> {
    console.log(chalk.blue('🔧 初始化配置向导'));
    console.log('');

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'templateRepo',
        message: '请输入默认模板仓库 URL:',
        default: 'https://github.com/antfu/vitesse-lite.git',
        validate: (input: string) => {
          if (!input.trim()) {
            return '模板仓库 URL 不能为空';
          }
          return true;
        }
      },
      {
        type: 'checkbox',
        name: 'ignorePatterns',
        message: '选择要忽略的文件和目录:',
        choices: [
          { name: 'node_modules/', value: 'node_modules/**', checked: true },
          { name: '.git/', value: '.git/**', checked: true },
          { name: 'dist/', value: 'dist/**', checked: true },
          { name: 'build/', value: 'build/**', checked: true },
          { name: 'coverage/', value: 'coverage/**', checked: true },
          { name: '*.log', value: '*.log', checked: true },
          { name: '.DS_Store', value: '.DS_Store', checked: true },
          { name: '.env.local', value: '.env.local', checked: false },
          { name: 'README.md', value: 'README.md', checked: false }
        ]
      },
      {
        type: 'confirm',
        name: 'verbose',
        message: '是否默认启用详细输出?',
        default: false
      }
    ]);

    const config: SyncConfig = {
      templateRepo: answers.templateRepo,
      ignorePatterns: answers.ignorePatterns,
      verbose: answers.verbose,
      lastSync: new Date().toISOString()
    };

    this.saveConfig(config);
    console.log(chalk.green('✅ 配置已保存到 .template-sync.json'));
  }

  /**
   * 批量处理模式
   */
  async batchProcess(): Promise<void> {
    console.log(chalk.blue('🔄 高级批量操作模式'));
    
    // 获取模板仓库
    const repo = await this.getTemplateRepo();
    
    // 测试连接
    const isReachable = await this.testRepository(repo);
    if (!isReachable) {
      throw new Error('无法连接到模板仓库');
    }

    // 克隆模板
    await this.cloneTemplate();
    
    // 扫描所有文件
    const templateFiles = await this.scanTemplateFiles();
    const currentFiles = await this.scanCurrentFiles();
    
    // 生成推荐
    const recommendations = await this.generateRecommendations(templateFiles, currentFiles);
    
    if (recommendations.length === 0) {
      console.log('✅ 没有发现需要处理的文件');
      return;
    }

    // 显示推荐
    console.log('\n📊 批量处理推荐:');
    for (const rec of recommendations) {
      const icon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
      console.log(`${icon} ${rec.title}`);
      console.log(`   ${rec.description}`);
      console.log(`   影响: ${rec.impact}`);
      console.log(`   文件数: ${rec.files.length}`);
      console.log('');
    }

    // 选择要处理的推荐
    const { selectedRecs } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedRecs',
        message: '选择要执行的操作:',
        choices: recommendations.map(rec => ({
          name: `${rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢'} ${rec.title} (${rec.files.length} 个文件)`,
          value: rec,
          checked: rec.priority === 'high'
        }))
      }
    ]);

    // 执行批量处理
    const allFiles: FileConfig[] = [];
    selectedRecs.forEach((rec: Recommendation) => {
      allFiles.push(...rec.files);
    });

    if (allFiles.length > 0) {
      const results = await this.batchUpdateFiles(allFiles);
      this.showSummary(results);
    }
  }

  /**
   * 生成智能推荐
   */
  private async generateRecommendations(templateFiles: FileConfig[], currentFiles: FileConfig[]): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    const changes = await this.compareFiles(templateFiles, currentFiles);
    
    if (changes.length === 0) {
      return recommendations;
    }

    // 按优先级分组
    const highPriority: FileConfig[] = [];
    const mediumPriority: FileConfig[] = [];
    const lowPriority: FileConfig[] = [];

    changes.forEach(file => {
      // 高优先级：核心配置文件
      if (['package.json', 'tsconfig.json', 'vite.config.ts', 'vite.config.js'].includes(file.path)) {
        highPriority.push(file);
      }
      // 中优先级：开发工具配置
      else if (file.category === '代码质量' || file.category === '构建配置' || file.category === 'TypeScript') {
        mediumPriority.push(file);
      }
      // 低优先级：其他文件
      else {
        lowPriority.push(file);
      }
    });

    if (highPriority.length > 0) {
      recommendations.push({
        priority: 'high',
        title: '核心配置更新',
        description: '更新项目的核心配置文件，包括 package.json、构建配置等',
        impact: '可能影响项目构建和依赖管理',
        files: highPriority
      });
    }

    if (mediumPriority.length > 0) {
      recommendations.push({
        priority: 'medium',
        title: '开发工具配置',
        description: '更新代码质量工具、构建工具等配置',
        impact: '改善开发体验和代码质量',
        files: mediumPriority
      });
    }

    if (lowPriority.length > 0) {
      recommendations.push({
        priority: 'low',
        title: '其他文件更新',
        description: '更新文档、样式等其他文件',
        impact: '对项目功能影响较小',
        files: lowPriority
      });
    }

    return recommendations;
  }

  /**
   * 预览所有差异
   */
  async previewAllDifferences(files: FileConfig[]): Promise<void> {
    console.log(chalk.blue('🔍 预览所有差异'));
    
    if (files.length === 0) {
      console.log('✅ 没有差异需要预览');
      return;
    }

    for (const file of files) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`${file.icon} ${file.path} (${file.status})`);
      console.log('='.repeat(60));
      
      if (file.templatePath && file.currentPath && fs.existsSync(file.currentPath)) {
        // 显示文件差异（简化版）
        const templateContent = fs.readFileSync(file.templatePath, 'utf8');
        const currentContent = fs.readFileSync(file.currentPath, 'utf8');
        
        if (templateContent !== currentContent) {
          console.log('📝 文件内容有差异');
          console.log(`模板文件长度: ${templateContent.length} 字符`);
          console.log(`当前文件长度: ${currentContent.length} 字符`);
        }
      } else if (file.status === 'new') {
        console.log('📄 这是一个新文件');
      }
      
      console.log(`📁 分类: ${file.category}`);
      console.log(`🏷️  类型: ${file.type}`);
    }
    
    console.log(`\n总计: ${files.length} 个文件有差异`);
  }

  /**
   * 智能同步模式
   */
  async intelligentSync(): Promise<void> {
    console.log(chalk.blue('🤖 智能同步模式'));
    
    // 扫描文件
    const templateFiles = await this.scanTemplateFiles();
    const currentFiles = await this.scanCurrentFiles();
    
    // 生成推荐
    const recommendations = await this.generateRecommendations(templateFiles, currentFiles);
    
    if (recommendations.length === 0) {
      console.log('✅ 项目已经是最新的，无需同步');
      return;
    }

    // 自动选择高优先级推荐
    const highPriorityRecs = recommendations.filter(rec => rec.priority === 'high');
    
    if (highPriorityRecs.length > 0) {
      console.log('🔴 发现高优先级更新，建议立即处理:');
      
      for (const rec of highPriorityRecs) {
        console.log(`• ${rec.title}: ${rec.files.length} 个文件`);
      }
      
      const { autoApply } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'autoApply',
          message: '是否自动应用高优先级更新?',
          default: true
        }
      ]);
      
      if (autoApply) {
        const allFiles: FileConfig[] = [];
        highPriorityRecs.forEach(rec => {
          allFiles.push(...rec.files);
        });
        
        const results = await this.batchUpdateFiles(allFiles);
        this.showSummary(results);
      }
    }

    // 显示其他推荐
    const otherRecs = recommendations.filter(rec => rec.priority !== 'high');
    if (otherRecs.length > 0) {
      console.log('\n其他可选更新:');
      otherRecs.forEach(rec => {
        const icon = rec.priority === 'medium' ? '🟡' : '🟢';
        console.log(`${icon} ${rec.title}: ${rec.files.length} 个文件`);
      });
      
      console.log('\n💡 提示: 使用 --batch 模式可以手动选择这些更新');
    }
  }
}
