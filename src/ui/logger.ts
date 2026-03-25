const chalk = require('chalk');
import type { BatchResult } from '../types';

export const logger = {
  info: (msg: string) => console.log(chalk.blue(msg)),
  success: (msg: string) => console.log(chalk.green(`✅ ${msg}`)),
  warn: (msg: string) => console.log(chalk.yellow(`⚠️  ${msg}`)),
  error: (msg: string) => console.log(chalk.red(`❌ ${msg}`)),
  step: (msg: string) => console.log(chalk.cyan(`▶ ${msg}`)),

  file(icon: string, filePath: string, status: string): void {
    const colorFn = status === '已删除' ? chalk.red
      : status === '已创建' ? chalk.green
      : status === '已跳过' ? chalk.gray
      : status.startsWith('失败') ? chalk.red
      : chalk.yellow;
    console.log(`  ${icon} ${filePath}  ${colorFn(status)}`);
  },

  summary(result: BatchResult): void {
    const sep = chalk.gray('─'.repeat(48));
    console.log(`\n${sep}`);
    if (result.success.length > 0)
      console.log(chalk.green(`✅ 成功 ${result.success.length} 个`));
    if (result.skipped.length > 0)
      console.log(chalk.gray(`⏭  跳过 ${result.skipped.length} 个`));
    if (result.failed.length > 0) {
      console.log(chalk.red(`❌ 失败 ${result.failed.length} 个`));
      result.failed.forEach(f => console.log(chalk.red(`   • ${f.path}: ${f.error}`)));
    }
    console.log(`${sep}\n`);
  }
};
