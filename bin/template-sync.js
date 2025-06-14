#!/usr/bin/env node

const { Command } = require('commander');
const { TemplateSyncer } = require('../lib/index');
const pkg = require('../package.json');

const program = new Command();

program
  .name('template-sync')
  .description('智能模板同步工具 - 让你的项目与模板仓库保持同步')
  .version(pkg.version)
  .option('-r, --repo <url>', '指定模板仓库 URL')
  .option('-v, --verbose', '显示详细输出信息')
  .option('-i, --init', '初始化配置向导')
  .option('-b, --batch', '高级批量操作模式')
  .option('-p, --preview', '预览所有差异（不执行更新）')
  .option('-s, --smart', '智能同步模式（自动推荐）')
  .helpOption('-h, --help', '显示帮助信息');

program.addHelpText('after', `

示例:
  $ template-sync                    # 交互式同步
  $ template-sync --init             # 初始化配置
  $ template-sync --batch            # 高级批量操作
  $ template-sync --preview          # 预览所有差异
  $ template-sync --smart            # 智能推荐模式
  $ template-sync --repo https://github.com/antfu/vitesse-lite.git
  $ template-sync --repo git@github.com:your/template.git --verbose

支持的仓库格式:
  • GitHub: https://github.com/owner/repo.git
  • GitLab: https://gitlab.com/owner/repo.git  
  • Bitbucket: https://bitbucket.org/owner/repo.git
  • SSH: git@github.com:owner/repo.git

功能特性:
  ✅ 智能合并 package.json
  ✅ 支持 Vue/React/Angular 项目
  ✅ 文件差异对比
  ✅ 交互式确认更新
  ✅ Git 备份保护
  ✅ 配置文件保存

更多信息: https://github.com/IceyWu/template-syncer
`);

// 主要执行逻辑
async function main() {
  try {
    program.parse();
    const options = program.opts();

    // 显示启动信息
    if (options.verbose) {
      console.log('🔧 启动配置:');
      if (options.repo) {
        console.log(`   模板仓库: ${options.repo}`);
      }
      console.log(`   详细模式: 已启用`);
      console.log('');
    }    // 创建同步器实例
    const syncerOptions = {
      ...options,
      templateRepo: options.repo
    };
    const syncer = new TemplateSyncer(syncerOptions);
    
    if (options.init) {
      await syncer.initConfig();    } else if (options.batch) {
      // 高级批量操作模式
      try {
        await syncer.batchProcess();
      } finally {
        // 清理临时文件
        syncer.cleanup();
      }
    } else if (options.preview) {
      // 预览模式
      try {
        await syncer.getTemplateRepo();
        await syncer.cloneTemplate();
        const templateFiles = await syncer.scanTemplateFiles();
        const currentFiles = await syncer.scanCurrentFiles();
        const changedFiles = await syncer.compareFiles(templateFiles, currentFiles);
        await syncer.previewAllDifferences(changedFiles);
      } finally {
        // 清理临时文件
        syncer.cleanup();
      }
    } else if (options.smart) {
      // 智能同步模式
      try {
        await syncer.intelligentSync();
      } finally {
        // 清理临时文件
        syncer.cleanup();
      }
    } else {
      // 默认交互式同步
      await syncer.sync();
    }
  } catch (error) {
    console.error('❌ 程序执行失败:', error.message);
    if (program.opts().verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('💥 未捕获的异常:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 未处理的 Promise 拒绝:', reason);
  process.exit(1);
});

// 启动程序
main();
