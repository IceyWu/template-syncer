/**
 * 测试环境设置
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TEST_DIR = path.join(__dirname, 'workspace');
const TEST_REPO = 'https://gitee.com/suqii/sw-test.git';

/**
 * 创建测试工作区
 */
function setup() {
  console.log('🔧 设置测试环境...\n');

  // 清理旧的测试目录
  if (fs.existsSync(TEST_DIR)) {
    console.log('🧹 清理旧测试目录...');
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }

  // 创建测试目录
  console.log('📁 创建测试目录...');
  fs.mkdirSync(TEST_DIR, { recursive: true });

  // 初始化 git
  console.log('📋 初始化 Git...');
  execSync('git init', { cwd: TEST_DIR, stdio: 'ignore' });

  // 创建测试文件
  console.log('📝 创建测试文件...');
  
  // package.json
  fs.writeFileSync(
    path.join(TEST_DIR, 'package.json'),
    JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      description: '测试项目',
      scripts: {
        dev: 'echo dev',
        build: 'echo build'
      },
      dependencies: {
        lodash: '^4.17.21'
      }
    }, null, 2)
  );

  // README.md
  fs.writeFileSync(
    path.join(TEST_DIR, 'README.md'),
    '# Test Project\n\n这是一个测试项目\n'
  );

  // 提交初始文件
  console.log('💾 提交初始文件...');
  execSync('git add .', { cwd: TEST_DIR, stdio: 'ignore' });
  execSync('git commit -m "init"', { cwd: TEST_DIR, stdio: 'ignore' });

  console.log('\n✅ 测试环境设置完成！');
  console.log(`📁 测试目录: ${TEST_DIR}`);
  console.log(`🔗 测试仓库: ${TEST_REPO}\n`);
}

/**
 * 清理测试环境
 */
function cleanup() {
  console.log('🧹 清理测试环境...');
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  console.log('✅ 清理完成！\n');
}

/**
 * 重置测试环境
 */
function reset() {
  cleanup();
  setup();
}

module.exports = { setup, cleanup, reset, TEST_DIR, TEST_REPO };

// 直接运行时执行 setup
if (require.main === module) {
  const arg = process.argv[2];
  if (arg === 'cleanup') {
    cleanup();
  } else if (arg === 'reset') {
    reset();
  } else {
    setup();
  }
}
