const pc = require('picocolors');
import type { BatchResult } from '../types';

export const logger = {
  info: (msg: string) => console.log(pc.blue(msg)),
  success: (msg: string) => console.log(pc.green(`✅ ${msg}`)),
  warn: (msg: string) => console.log(pc.yellow(`⚠️  ${msg}`)),
  error: (msg: string) => console.log(pc.red(`❌ ${msg}`)),
  step: (msg: string) => console.log(pc.cyan(`▶ ${msg}`)),

  file(icon: string, filePath: string, status: string): void {
    const colorFn = status === '已删除' ? pc.red
      : status === '已创建' ? pc.green
      : status === '已跳过' ? pc.gray
      : status.startsWith('失败') ? pc.red
      : pc.yellow;
    console.log(`  ${icon} ${filePath}  ${colorFn(status)}`);
  },

  summary(result: BatchResult): void {
    const sep = pc.gray('─'.repeat(48));
    console.log(`\n${sep}`);
    if (result.success.length > 0)
      console.log(pc.green(`✅ 成功 ${result.success.length} 个`));
    if (result.skipped.length > 0)
      console.log(pc.gray(`⏭  跳过 ${result.skipped.length} 个`));
    if (result.failed.length > 0) {
      console.log(pc.red(`❌ 失败 ${result.failed.length} 个`));
      result.failed.forEach(f => console.log(pc.red(`   • ${f.path}: ${f.error}`)));
    }
    console.log(`${sep}\n`);
  }
};
