#!/usr/bin/env node

const TemplateSyncer = require('../lib/index');

// 解析命令行参数
const args = process.argv.slice(2);
const options = {};

// 显示帮助信息
function showHelp() {
  console.log(`
📦 Template Syncer - 智能模板同步工具

让你的项目与模板仓库保持同步，支持智能合并和差异对比。

用法:
  template-sync [选项]

选项:
  -r, --repo <url>     指定模板仓库 URL
  -v, --verbose        显示详细输出信息
  -i, --init          初始化配置向导
  -h, --help          显示此帮助信息
  --version           显示版本号

示例:
  template-sync                    # 交互式同步
  template-sync --init             # 初始化配置
  template-sync --repo https://github.com/antfu/vitesse-lite.git
  template-sync --repo git@github.com:your/template.git --verbose

支持的仓库格式:
  • GitHub: https://github.com/owner/repo.git
  • GitLab: https://gitlab.com/owner/repo.git  
  • Bitbucket: https://bitbucket.org/owner/repo.git
  • SSH: git@github.com:owner/repo.git

功能特性:
  ✅ 智能合并 package.json
  ✅ 文件差异对比
  ✅ 交互式确认更新
  ✅ Git 备份保护
  ✅ 配置文件保存

更多信息: https://github.com/your/template-sync
  `);
}

// 简单的参数解析
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case '--repo':
    case '-r':
      if (i + 1 >= args.length) {
        console.error('❌ --repo 选项需要提供仓库 URL');
        process.exit(1);
      }
      options.templateRepo = args[++i];
      break;    case '--verbose':
    case '-v':
      options.verbose = true;
      break;
    case '--init':
    case '-i':
      options.init = true;
      break;
    case '--help':
    case '-h':
      showHelp();
      process.exit(0);
    case '--version':
      const pkg = require('../package.json');
      console.log(`v${pkg.version}`);
      process.exit(0);
    default:
      if (arg.startsWith('-')) {
        console.error(`❌ 未知选项: ${arg}`);
        console.log('使用 --help 查看可用选项');
        process.exit(1);
      }
  }
}

// 显示启动信息
if (options.verbose) {
  console.log('🔧 启动配置:');
  if (options.templateRepo) {
    console.log(`   模板仓库: ${options.templateRepo}`);
  }
  console.log(`   详细模式: 已启用`);
  console.log('');
}

// 创建并运行同步器
async function main() {
  try {
    const syncer = new TemplateSyncer(options);
    
    if (options.init) {
      await syncer.initConfig();
    } else {
      await syncer.sync();
    }
  } catch (error) {
    console.error('❌ 程序执行失败:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
