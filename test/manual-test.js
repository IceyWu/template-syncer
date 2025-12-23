/**
 * 手动测试脚本 - 用于交互式测试
 */
const { execSync } = require('child_process');
const path = require('path');
const { setup, cleanup, reset, TEST_DIR, TEST_REPO } = require('./setup');

const BIN_PATH = path.join(__dirname, '..', 'bin', 'syn.js');

// 命令映射
const commands = {
  setup: () => setup(),
  cleanup: () => cleanup(),
  reset: () => reset(),
  
  help: () => exec('--help'),
  version: () => exec('--version'),
  preview: () => exec(`--preview -r ${TEST_REPO}`),
  smart: () => exec(`--smart -r ${TEST_REPO}`),
  batch: () => execInteractive(`--batch -r ${TEST_REPO}`),
  sync: () => execInteractive(`-r ${TEST_REPO}`),
  init: () => execInteractive('--init'),
  
  'preview-v': () => exec(`--preview -r ${TEST_REPO} -v`),
  'smart-v': () => exec(`--smart -r ${TEST_REPO} -v`),
};

function exec(args) {
  console.log(`\n$ syn ${args}\n`);
  console.log('-'.repeat(50));
  try {
    execSync(`node "${BIN_PATH}" ${args}`, {
      cwd: TEST_DIR,
      stdio: 'inherit'
    });
  } catch (error) {
    // 忽略退出码错误
  }
  console.log('-'.repeat(50));
}

function execInteractive(args) {
  console.log(`\n$ syn ${args}\n`);
  console.log('-'.repeat(50));
  console.log('⚠️  交互式命令，请在终端中手动运行:');
  console.log(`   cd ${TEST_DIR}`);
  console.log(`   node "${BIN_PATH}" ${args}`);
  console.log('-'.repeat(50));
}

function showHelp() {
  console.log(`
📋 手动测试脚本

用法: node test/manual-test.js <command>

环境命令:
  setup      创建测试环境
  cleanup    清理测试环境
  reset      重置测试环境

测试命令:
  help       测试 --help
  version    测试 --version
  preview    测试 --preview
  smart      测试 --smart
  batch      测试 --batch (交互式)
  sync       测试默认同步 (交互式)
  init       测试 --init (交互式)
  preview-v  测试 --preview -v
  smart-v    测试 --smart -v

示例:
  node test/manual-test.js setup     # 设置测试环境
  node test/manual-test.js preview   # 运行预览测试
  node test/manual-test.js cleanup   # 清理测试环境
`);
}

// 主函数
const command = process.argv[2];

if (!command || command === 'help' || command === '-h') {
  showHelp();
} else if (commands[command]) {
  commands[command]();
} else {
  console.log(`❌ 未知命令: ${command}`);
  showHelp();
}
