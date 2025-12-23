import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { platform } from './platform';
import { Categorizer } from './categorizer';
import type { FileInfo, FileChange, CategoryRule } from '../types';

/**
 * 默认忽略模式
 */
const DEFAULT_IGNORE = [
  'node_modules/**',
  '.git/**',
  'dist/**',
  'build/**',
  'out/**',
  '.output/**',
  'coverage/**',
  '.nyc_output/**',
  '.cache/**',
  '.nuxt/**',
  '.next/**',
  '.svelte-kit/**',
  '.vercel/**',
  '.netlify/**',
  'logs/**',
  '*.log',
  '.DS_Store',
  'Thumbs.db',
  '*.tmp',
  '*.temp',
  '*.swp',
  '*~'
];

/**
 * 文件扫描器
 */
export class Scanner {
  private ignorePatterns: string[];
  private categorizer: Categorizer;

  constructor(
    customIgnore: string[] = [], 
    customCategories: CategoryRule[] = []
  ) {
    this.ignorePatterns = [...DEFAULT_IGNORE, ...customIgnore];
    this.categorizer = new Categorizer(customCategories);
  }

  /**
   * 扫描目录
   */
  async scan(dir: string): Promise<FileInfo[]> {
    if (!fs.existsSync(dir)) {
      throw new Error(`目录不存在: ${dir}`);
    }

    const files = await glob('**/*', {
      cwd: dir,
      ignore: this.ignorePatterns,
      dot: true,
      nodir: true
    });

    const result: FileInfo[] = [];

    for (const file of files) {
      const fullPath = path.join(dir, file);
      
      try {
        const stat = fs.statSync(fullPath);
        if (!stat.isFile()) continue;

        const { category, icon } = this.categorizer.categorize(file);
        
        result.push({
          path: file,
          fullPath,
          size: stat.size,
          isBinary: platform.isBinary(fullPath),
          category,
          icon
        });
      } catch {
        // 跳过无法访问的文件
      }
    }

    return result.sort((a, b) => a.path.localeCompare(b.path));
  }

  /**
   * 比较两个目录的文件差异
   */
  async compare(templateDir: string, currentDir: string): Promise<FileChange[]> {
    const templateFiles = await this.scan(templateDir);
    const currentFiles = await this.scan(currentDir);
    
    const currentMap = new Map(currentFiles.map(f => [f.path, f]));
    const changes: FileChange[] = [];

    for (const templateFile of templateFiles) {
      const currentFile = currentMap.get(templateFile.path);
      const templatePath = templateFile.fullPath;
      const currentPath = path.join(currentDir, templateFile.path);

      if (!currentFile) {
        // 新文件
        changes.push({
          ...templateFile,
          status: 'new',
          templatePath,
          currentPath,
          selected: true
        });
      } else {
        // 检查是否有变更
        if (this.hasChanged(templatePath, currentFile.fullPath)) {
          changes.push({
            ...templateFile,
            status: 'modified',
            templatePath,
            currentPath: currentFile.fullPath,
            selected: true
          });
        }
      }
    }

    return changes;
  }

  /**
   * 检查文件是否有变更
   */
  private hasChanged(file1: string, file2: string): boolean {
    try {
      const stat1 = fs.statSync(file1);
      const stat2 = fs.statSync(file2);

      // 大小不同肯定有变更
      if (stat1.size !== stat2.size) {
        return true;
      }

      // 比较内容
      const content1 = fs.readFileSync(file1);
      const content2 = fs.readFileSync(file2);
      
      return !content1.equals(content2);
    } catch {
      return true;
    }
  }

  /**
   * 添加忽略模式
   */
  addIgnore(pattern: string): void {
    this.ignorePatterns.push(pattern);
  }

  /**
   * 添加分类规则
   */
  addCategory(rule: CategoryRule): void {
    this.categorizer.addRule(rule);
  }
}
