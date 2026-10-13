import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { glob } from 'glob';
import { minimatch } from 'minimatch';
import { platform } from './platform';
import { Categorizer } from './categorizer';
import type { FileInfo, FileChange, CategoryRule } from '../types';

import type { FileDiff } from '../native.d';

// 尝试加载 Rust native 模块
type NativeModule = { scanDir: (dir: string, ignore: string[]) => { path: string; size: number; hash: string }[]; compareDirs: (t: string, c: string, ignore: string[], orphans: boolean) => FileDiff[] };

async function mapConcurrent<T, R>(items: T[], mapper: (item: T) => Promise<R>, limit = 8): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await mapper(items[index]);
    }
  }));
  return results;
}
let native: NativeModule | null = null;
try {
  native = require('../../native/index');
} catch {
  // fallback to pure JS
}

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
  '*~',
  '.template-sync.json'
];

export class Scanner {
  private ignorePatterns: string[];
  private categorizer: Categorizer;

  constructor(customIgnore: string[] = [], customCategories: CategoryRule[] = []) {
    this.ignorePatterns = [...DEFAULT_IGNORE, ...customIgnore];
    this.categorizer = new Categorizer(customCategories);
  }

  async scan(dir: string): Promise<FileInfo[]> {
    if (!fs.existsSync(dir)) throw new Error(`目录不存在: ${dir}`);

    const files = await glob('**/*', {
      cwd: dir,
      ignore: this.ignorePatterns,
      dot: true,
      nodir: true
    });

    // 并发处理所有文件的 stat + 分类
    return mapConcurrent(files, async (file) => {
        const normalizedPath = file.replace(/\\/g, '/');
        const fullPath = path.join(dir, file);
        const stat = await fs.promises.lstat(fullPath);
        if (stat.isSymbolicLink()) return null;
        if (!stat.isFile()) return null;

        const { category, icon } = this.categorizer.categorize(normalizedPath);
        return {
          path: normalizedPath,
          fullPath,
          size: stat.size,
          isBinary: platform.isBinary(fullPath),
          category,
          icon
        } satisfies FileInfo;
      }).then(results => results.filter((file): file is FileInfo => file !== null)
      .sort((a, b) => a.path.localeCompare(b.path)));
  }

  async compare(templateDir: string, currentDir: string, detectOrphans = false): Promise<FileChange[]> {
    // 优先使用 Rust native 实现
    if (native) {
      return this.compareNative(templateDir, currentDir, detectOrphans);
    }
    return this.compareJs(templateDir, currentDir, detectOrphans);
  }

  /** Rust native 实现：并行 hash 比较 */
  private async compareNative(templateDir: string, currentDir: string, detectOrphans: boolean): Promise<FileChange[]> {
    const diffs = native!.compareDirs(templateDir, currentDir, this.ignorePatterns, detectOrphans);

    // 并发补充 FileChange 所需的 category/icon/size 信息
    return mapConcurrent(diffs, async (diff: FileDiff): Promise<FileChange> => {
        const isDeleted = diff.status === 'deleted';
        const basePath = isDeleted ? currentDir : templateDir;
        const fullPath = path.join(basePath, diff.path);

        let size = 0;
        try { size = (await fs.promises.stat(fullPath)).size; } catch {}

        const { category, icon } = this.categorizer.categorize(diff.path);

        return {
          path: diff.path,
          fullPath,
          size,
          isBinary: platform.isBinary(fullPath),
          category,
          icon,
          status: diff.status as 'new' | 'modified' | 'deleted',
          templatePath: isDeleted ? '' : fullPath,
          currentPath: isDeleted ? fullPath : path.join(currentDir, diff.path),
          selected: diff.status !== 'deleted',
        };
      }).then(results => results.sort((a, b) => a.path.localeCompare(b.path)));
  }

  /** 纯 JS fallback 实现 */
  private async compareJs(templateDir: string, currentDir: string, detectOrphans: boolean): Promise<FileChange[]> {
    const [templateFiles, currentFiles] = await Promise.all([
      this.scan(templateDir),
      this.scan(currentDir)
    ]);

    const currentMap = new Map(currentFiles.map(f => [f.path, f]));
    const templateMap = new Map(templateFiles.map(f => [f.path, f]));

    // 并发检查所有模板文件的变更状态
    const changeResults = await mapConcurrent(templateFiles, async (templateFile): Promise<FileChange | null> => {
        const currentFile = currentMap.get(templateFile.path);
        const templatePath = templateFile.fullPath;
        const currentPath = path.join(currentDir, templateFile.path);

        if (!currentFile) {
          return { ...templateFile, status: 'new', templatePath, currentPath, selected: true };
        }

        const changed = await this.hasChanged(templatePath, currentFile.fullPath);
        if (changed) {
          return { ...templateFile, status: 'modified', templatePath, currentPath: currentFile.fullPath, selected: true };
        }
        return null;
      });

    const changes: FileChange[] = changeResults.filter((change): change is FileChange => change !== null);

    if (detectOrphans) {
      for (const currentFile of currentFiles) {
        if (!templateMap.has(currentFile.path)) {
          changes.push({
            ...currentFile,
            status: 'deleted',
            templatePath: '',
            currentPath: currentFile.fullPath,
            selected: false
          });
        }
      }
    }

    return changes.sort((a, b) => a.path.localeCompare(b.path));
  }

  private async hasChanged(file1: string, file2: string): Promise<boolean> {
    try {
      const [stat1, stat2] = await Promise.all([
        fs.promises.stat(file1),
        fs.promises.stat(file2)
      ]);

      if (stat1.size !== stat2.size) return true;

      const [hash1, hash2] = await Promise.all([this.hashFile(file1), this.hashFile(file2)]);
      return hash1 !== hash2;
    } catch {
      return true;
    }
  }

  private async hashFile(filePath: string): Promise<string> {
    const hash = createHash('sha256');
    await new Promise<void>((resolve, reject) => {
      const stream = fs.createReadStream(filePath);
      stream.on('data', chunk => hash.update(chunk));
      stream.once('error', reject);
      stream.once('end', resolve);
    });
    return hash.digest('hex');
  }

  filterOrphans(orphans: FileChange[], deletePatterns: string[] = ['**'], protectPatterns: string[] = []): FileChange[] {
    return orphans.filter(file => {
      const isProtected = protectPatterns.some(p => minimatch(file.path, p, { dot: true, matchBase: true }));
      if (isProtected) return false;

      return deletePatterns.some(p => p === '**' || minimatch(file.path, p, { dot: true, matchBase: true }));
    });
  }

  addIgnore(pattern: string): void { this.ignorePatterns.push(pattern); }
  addCategory(rule: CategoryRule): void { this.categorizer.addRule(rule); }
}
