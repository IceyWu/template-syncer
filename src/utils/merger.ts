import * as fs from 'fs';
import * as path from 'path';
import { platform } from './platform';
import type { MergeStrategy } from '../types';

export class Merger {
  private strategies: Record<string, MergeStrategy>;

  constructor(customStrategies: Record<string, MergeStrategy> = {}) {
    this.strategies = {
      'package.json': 'smart',
      'tsconfig.json': 'smart',
      'jsconfig.json': 'smart',
      ...customStrategies
    };
  }

  getStrategy(filePath: string): MergeStrategy {
    const fileName = path.basename(filePath);
    return this.strategies[fileName] ?? this.strategies[filePath] ?? 'overwrite';
  }

  async merge(templatePath: string, currentPath: string, targetPath: string): Promise<{ success: boolean; message: string }> {
    const strategy = this.getStrategy(targetPath);
    const fileName = path.basename(targetPath);

    if (strategy === 'skip') return { success: false, message: '已跳过' };
    if (strategy === 'smart') return this.smartMerge(templatePath, currentPath, targetPath, fileName);

    // overwrite
    platform.copyFile(templatePath, targetPath);
    return { success: true, message: '已覆盖' };
  }

  private async smartMerge(templatePath: string, currentPath: string, targetPath: string, fileName: string): Promise<{ success: boolean; message: string }> {
    const exists = await fs.promises.access(currentPath).then(() => true).catch(() => false);
    if (!exists) {
      platform.copyFile(templatePath, targetPath);
      return { success: true, message: '已创建' };
    }

    if (fileName === 'package.json') return this.mergePackageJson(templatePath, currentPath, targetPath);
    if (fileName.endsWith('.json')) return this.mergeJson(templatePath, currentPath, targetPath);

    platform.copyFile(templatePath, targetPath);
    return { success: true, message: '已覆盖' };
  }

  private async mergePackageJson(templatePath: string, currentPath: string, targetPath: string): Promise<{ success: boolean; message: string }> {
    try {
      const [template, current] = await Promise.all([
        platform.readJsonAsync<Record<string, unknown>>(templatePath),
        platform.readJsonAsync<Record<string, unknown>>(currentPath)
      ]);

      if (!template || !current) {
        platform.copyFile(templatePath, targetPath);
        return { success: true, message: '已覆盖 (无法解析)' };
      }

      const merged: Record<string, unknown> = {
        name: current.name ?? template.name,
        version: current.version ?? template.version,
        description: current.description ?? template.description,
        author: current.author ?? template.author,
        license: current.license ?? template.license,
        repository: current.repository ?? template.repository,
        homepage: current.homepage ?? template.homepage,
        bugs: current.bugs ?? template.bugs,
        keywords: current.keywords ?? template.keywords,
        type: template.type ?? current.type,
        main: template.main ?? current.main,
        module: template.module ?? current.module,
        types: template.types ?? current.types,
        exports: template.exports ?? current.exports,
        bin: template.bin ?? current.bin,
        files: template.files ?? current.files,
        engines: template.engines ?? current.engines,
        scripts: { ...(current.scripts as object ?? {}), ...(template.scripts as object ?? {}) },
        dependencies: { ...(current.dependencies as object ?? {}), ...(template.dependencies as object ?? {}) },
        devDependencies: { ...(current.devDependencies as object ?? {}), ...(template.devDependencies as object ?? {}) },
        peerDependencies: { ...(current.peerDependencies as object ?? {}), ...(template.peerDependencies as object ?? {}) },
        optionalDependencies: { ...(current.optionalDependencies as object ?? {}), ...(template.optionalDependencies as object ?? {}) }
      };

      for (const key of Object.keys(template)) {
        if (!(key in merged)) merged[key] = template[key];
      }

      // 清理空对象
      for (const key of Object.keys(merged)) {
        const v = merged[key];
        if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) {
          delete merged[key];
        }
      }

      platform.writeJson(targetPath, merged);
      return { success: true, message: '已智能合并' };
    } catch {
      platform.copyFile(templatePath, targetPath);
      return { success: true, message: '已覆盖 (合并失败)' };
    }
  }

  private async mergeJson(templatePath: string, currentPath: string, targetPath: string): Promise<{ success: boolean; message: string }> {
    try {
      const [template, current] = await Promise.all([
        platform.readJsonAsync<Record<string, unknown>>(templatePath),
        platform.readJsonAsync<Record<string, unknown>>(currentPath)
      ]);

      if (!template || !current) {
        platform.copyFile(templatePath, targetPath);
        return { success: true, message: '已覆盖' };
      }

      platform.writeJson(targetPath, this.deepMerge(current, template));
      return { success: true, message: '已合并' };
    } catch {
      platform.copyFile(templatePath, targetPath);
      return { success: true, message: '已覆盖' };
    }
  }

  private deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      const s = source[key], t = target[key];
      if (s && typeof s === 'object' && !Array.isArray(s) && t && typeof t === 'object' && !Array.isArray(t)) {
        result[key] = this.deepMerge(t as Record<string, unknown>, s as Record<string, unknown>);
      } else {
        result[key] = s;
      }
    }
    return result;
  }

  setStrategy(pattern: string, strategy: MergeStrategy): void {
    this.strategies[pattern] = strategy;
  }
}
