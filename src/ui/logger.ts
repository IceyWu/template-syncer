const chalk = require('chalk');
import type { BatchResult } from '../types';

/**
 * 日志工具
 */
export const logger = {
  info(message: string): void {
    console.log(chalk.blue(message));
  },

  success(message: string): void {
    console.log(chalk.green(`✅ ${message}`));
  },

  warn(message: string): void {
    console.log(chalk.yellow(`⚠️  ${message}`));
  },

  error(message: string): void {
    console.log(chalk.red(`❌ ${message}`));
  },

  step(message: string): void {
    console.log(`📋 ${message}`);
  },

  file(icon: string, path: string, status: string): void {
    console.log(`${icon} ${path} - ${status}`);
  },

  /**
   * 显示操作摘要
   */
  summary(result: BatchResult): void {
    console.log('\n' + '='.repeat(50));
    console.log('📊 操作摘要');
    console.log('='.repeat(50));

    console.log(`✅ 成功: ${result.success.length} 个文件`);
    result.success.forEach(f => console.log(`   • ${f}`));

    if (result.skipped.length > 0) {
      console.log(`⏭️  跳过: ${result.skipped.length} 个文件`);
      result.skipped.forEach(f => console.log(`   • ${f}`));
    }

    if (result.failed.length > 0) {
      console.log(`❌ 失败: ${result.failed.length} 个文件`);
      result.failed.forEach(f => console.log(`   • ${f.path}: ${f.error}`));
    }

    console.log('='.repeat(50) + '\n');
  },

  /**
   * 显示推荐列表
   */
  recommendations(recs: Array<{ priority: string; title: string; description: string; files: unknown[] }>): void {
    console.log('\n📊 批量处理推荐:\n');
    
    for (const rec of recs) {
      const icon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
      console.log(`${icon} ${rec.title}`);
      console.log(`   ${rec.description}`);
      console.log(`   文件数: ${rec.files.length}`);
      console.log('');
    }
  }
};
