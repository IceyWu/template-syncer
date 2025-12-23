import * as path from 'path';
import { platform } from './platform';
import type { MergeStrategy } from '../types';

/**
 * 文件合并器
 */
export class Merger {
  private strategies: Record<string, MergeStrategy>;

  constructor(customStrategies: Record<string, MergeStrategy> = {}) {
    this.strategies = {
      // 默认智能合并的文件
      'package.json': 'smart',
      'tsconfig.json': 'smart',
      'jsconfig.json': 'smart',
      ...customStrategies
    };
  }

  /**
   * 获取文件的合并策略
   */
  getStrategy(filePath: string): MergeStrategy {
    const fileName = path.basename(filePath);
    return this.strategies[fileName] || this.strategies[filePath] || 'overwrite';
  }

  /**
   * 合并文件
   */
  merge(templatePath: string, currentPath: string, targetPath: string): { success: boolean; message: string } {
    const strategy = this.getStrategy(targetPath);
    const fileName = path.basename(targetPath);

    switch (strategy) {
      case 'skip':
        return { success: false, message: '已跳过' };

      case 'smart':
        return this.smartMerge(templatePath, currentPath, targetPath, fileName);

      case 'overwrite':
      default:
        platform.copyFile(templatePath, targetPath);
        return { success: true, message: '已覆盖' };
    }
  }

  /**
   * 智能合并
   */
  private smartMerge(
    templatePath: string, 
    currentPath: string, 
    targetPath: string,
    fileName: string
  ): { success: boolean; message: string } {
    // 如果当前文件不存在，直接复制
    if (!require('fs').existsSync(currentPath)) {
      platform.copyFile(templatePath, targetPath);
      return { success: true, message: '已创建' };
    }

    // 根据文件类型选择合并方式
    if (fileName === 'package.json') {
      return this.mergePackageJson(templatePath, currentPath, targetPath);
    }

    if (fileName.endsWith('.json')) {
      return this.mergeJson(templatePath, currentPath, targetPath);
    }

    // 默认覆盖
    platform.copyFile(templatePath, targetPath);
    return { success: true, message: '已覆盖' };
  }

  /**
   * 合并 package.json
   */
  private mergePackageJson(
    templatePath: string, 
    currentPath: string, 
    targetPath: string
  ): { success: boolean; message: string } {
    try {
      const template = platform.readJson<Record<string, unknown>>(templatePath);
      const current = platform.readJson<Record<string, unknown>>(currentPath);

      if (!template || !current) {
        platform.copyFile(templatePath, targetPath);
        return { success: true, message: '已覆盖 (无法解析)' };
      }

      // 智能合并
      const merged: Record<string, unknown> = {
        // 保留当前项目的基本信息
        name: current.name || template.name,
        version: current.version || template.version,
        description: current.description || template.description,
        author: current.author || template.author,
        license: current.license || template.license,
        repository: current.repository || template.repository,
        homepage: current.homepage || template.homepage,
        bugs: current.bugs || template.bugs,
        keywords: current.keywords || template.keywords,
        
        // 使用模板的配置
        type: template.type || current.type,
        main: template.main || current.main,
        module: template.module || current.module,
        types: template.types || current.types,
        exports: template.exports || current.exports,
        bin: template.bin || current.bin,
        files: template.files || current.files,
        engines: template.engines || current.engines,
        
        // 合并脚本 (模板优先)
        scripts: {
          ...(current.scripts as Record<string, string> || {}),
          ...(template.scripts as Record<string, string> || {})
        },
        
        // 合并依赖 (模板版本优先)
        dependencies: {
          ...(current.dependencies as Record<string, string> || {}),
          ...(template.dependencies as Record<string, string> || {})
        },
        devDependencies: {
          ...(current.devDependencies as Record<string, string> || {}),
          ...(template.devDependencies as Record<string, string> || {})
        },
        peerDependencies: {
          ...(current.peerDependencies as Record<string, string> || {}),
          ...(template.peerDependencies as Record<string, string> || {})
        },
        optionalDependencies: {
          ...(current.optionalDependencies as Record<string, string> || {}),
          ...(template.optionalDependencies as Record<string, string> || {})
        }
      };

      // 复制其他字段
      for (const key of Object.keys(template)) {
        if (!(key in merged)) {
          merged[key] = template[key];
        }
      }

      // 清理空对象
      for (const key of Object.keys(merged)) {
        const value = merged[key];
        if (value && typeof value === 'object' && Object.keys(value).length === 0) {
          delete merged[key];
        }
      }

      platform.writeJson(targetPath, merged);
      return { success: true, message: '已智能合并' };
    } catch (error) {
      platform.copyFile(templatePath, targetPath);
      return { success: true, message: '已覆盖 (合并失败)' };
    }
  }

  /**
   * 合并普通 JSON 文件
   */
  private mergeJson(
    templatePath: string, 
    currentPath: string, 
    targetPath: string
  ): { success: boolean; message: string } {
    try {
      const template = platform.readJson<Record<string, unknown>>(templatePath);
      const current = platform.readJson<Record<string, unknown>>(currentPath);

      if (!template || !current) {
        platform.copyFile(templatePath, targetPath);
        return { success: true, message: '已覆盖' };
      }

      // 深度合并
      const merged = this.deepMerge(current, template);
      platform.writeJson(targetPath, merged);
      return { success: true, message: '已合并' };
    } catch {
      platform.copyFile(templatePath, targetPath);
      return { success: true, message: '已覆盖' };
    }
  }

  /**
   * 深度合并对象
   */
  private deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    const result = { ...target };

    for (const key of Object.keys(source)) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (
        sourceValue && 
        typeof sourceValue === 'object' && 
        !Array.isArray(sourceValue) &&
        targetValue && 
        typeof targetValue === 'object' && 
        !Array.isArray(targetValue)
      ) {
        result[key] = this.deepMerge(
          targetValue as Record<string, unknown>, 
          sourceValue as Record<string, unknown>
        );
      } else {
        result[key] = sourceValue;
      }
    }

    return result;
  }

  /**
   * 设置合并策略
   */
  setStrategy(pattern: string, strategy: MergeStrategy): void {
    this.strategies[pattern] = strategy;
  }
}
