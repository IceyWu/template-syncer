#!/usr/bin/env node

const { Command } = require('commander');
const { TemplateSyncer } = require('../lib/syncer');
const pkg = require('../package.json');

const program = new Command();

program
  .name('syn')
  .description('智能模板同步工具 - 让你的项目与模板仓库保持同步')
  .version(pkg.version)
  .option('-r, --repo <url>', '模板仓库 URL')
  .option('-b, --branch <name>', '分支名称')
  .option('-v, --verbose', '详细输出')
  .option('-i, --init', '初始化配置')
  .option('--batch', '批量处理模式')
  .option('-p, --preview', '预览差异')
  .option('-s, --smart', '智能同步模式')
  .helpOption('-h, --help', '显示帮助');

program.addHelpText('after', `

示例:
  $ syn                    # 交互式同步
  $ syn --init             # 初始化配置
  $ syn --batch            # 批量处理模式
  $ syn --preview          # 预览差异
  $ syn --smart            # 智能推荐模式
  $ syn -r https://github.com/user/template.git
  $ syn -r https://github.com/user/template.git -b dev

支持的仓库格式:
  • HTTPS: https://github.com/owner/repo.git
  • SSH: git@github.com:owner/repo.git

功能特性:
  ✅ 智能合并 package.json
  ✅ 跨平台支持 (Windows/macOS/Linux)
  ✅ 自动文件分类
  ✅ 多分支支持
  ✅ Git 备份保护
  ✅ 可扩展的分类规则

更多信息: https://github.com/IceyWu/template-syncer
`);

async function main() {
  try {
    program.parse();
    const opts = program.opts();

    const syncer = new TemplateSyncer({
      repo: opts.repo,
      branch: opts.branch,
      verbose: opts.verbose
    });

    if (opts.init) {
      await syncer.init();
    } else if (opts.batch) {
      await syncer.batch();
    } else if (opts.preview) {
      await syncer.preview();
    } else if (opts.smart) {
      await syncer.smart();
    } else {
      await syncer.sync();
    }
  } catch (error) {
    console.error('❌ 执行失败:', error.message);
    if (program.opts().verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

process.on('uncaughtException', (error) => {
  console.error('💥 未捕获的异常:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('💥 未处理的 Promise 拒绝:', reason);
  process.exit(1);
});

main();
