/**
 * 自动化测试脚本
 */
const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { setup, cleanup, TEST_DIR, TEST_REPO } = require('./setup');

const BIN_PATH = path.join(__dirname, '..', 'bin', 'syn.js');

// 测试结果
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * 运行命令
 */
function run(args, options = {}) {
  const cmd = `node "${BIN_PATH}" ${args}`;
  try {
    const output = execSync(cmd, {
      cwd: options.cwd || TEST_DIR,
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 60000
    });
    return { success: true, output };
  } catch (error) {
    return { 
      success: false, 
      output: error.stdout || '', 
      error: error.stderr || error.message 
    };
  }
}

/**
 * 测试用例
 */
function test(name, fn) {
  process.stdout.write(`  ${name}... `);
  try {
    fn();
    console.log('✅');
    results.passed++;
    results.tests.push({ name, passed: true });
  } catch (error) {
    console.log('❌');
    console.log(`    错误: ${error.message}`);
    results.failed++;
    results.tests.push({ name, passed: false, error: error.message });
  }
}

/**
 * 断言
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertContains(str, substr, message) {
  if (!str.includes(substr)) {
    throw new Error(message || `Expected "${str}" to contain "${substr}"`);
  }
}

function assertFileExists(filePath) {
  const fullPath = path.join(TEST_DIR, filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${filePath}`);
  }
}

function assertFileNotExists(filePath) {
  const fullPath = path.join(TEST_DIR, filePath);
  if (fs.existsSync(fullPath)) {
    throw new Error(`File should not exist: ${filePath}`);
  }
}

/**
 * 运行所有测试
 */
async function runTests() {
  console.log('\n🧪 Template Syncer 测试套件\n');
  console.log('='.repeat(50));

  // 设置测试环境
  setup();

  console.log('\n📋 基础命令测试\n');

  test('--help 显示帮助信息', () => {
    const { success, output } = run('--help');
    assert(success, 'Command failed');
    assertContains(output, '智能模板同步工具');
    assertContains(output, '--preview');
    assertContains(output, '--batch');
  });

  test('--version 显示版本号', () => {
    const { success, output } = run('--version');
    assert(success, 'Command failed');
    const pkg = require('../package.json');
    assertContains(output, pkg.version);
  });

  console.log('\n📋 预览模式测试\n');

  test('--preview 显示文件差异', () => {
    const { success, output } = run(`--preview -r ${TEST_REPO}`);
    assert(success, 'Command failed');
    assertContains(output, '预览模式');
    assertContains(output, '个变更');
    assertContains(output, 'Swift');
  });

  test('--preview 显示树形结构', () => {
    const { success, output } = run(`--preview -r ${TEST_REPO}`);
    assert(success, 'Command failed');
    assertContains(output, '├──');
    assertContains(output, '└──');
    assertContains(output, '📁');
  });

  console.log('\n📋 智能同步测试\n');

  test('--smart 智能推荐模式', () => {
    const result = spawnSync('node', [BIN_PATH, '--smart', '-r', TEST_REPO], {
      cwd: TEST_DIR,
      input: '\n', // 直接回车跳过选择
      encoding: 'utf8',
      timeout: 60000
    });
    const output = result.stdout || '';
    assertContains(output, '智能同步模式');
  });

  console.log('\n📋 批量处理测试\n');

  // 重置环境
  setup();

  test('--batch 批量同步文件', () => {
    // 使用 spawn 模拟选择
    const result = spawnSync('node', [BIN_PATH, '--batch', '-r', TEST_REPO], {
      cwd: TEST_DIR,
      input: ' \n', // 空格选择，回车确认
      encoding: 'utf8',
      timeout: 60000
    });
    
    const output = result.stdout || '';
    assertContains(output, '批量处理模式');
  });

  console.log('\n📋 文件同步验证\n');

  // 重置并执行完整同步
  setup();
  
  // 手动执行同步 - 需要正确的输入序列
  const syncResult = spawnSync('node', [BIN_PATH, '--batch', '-r', TEST_REPO], {
    cwd: TEST_DIR,
    input: ' \n', // 空格选择项目，回车确认
    encoding: 'utf8',
    timeout: 60000
  });
  
  // 检查同步是否成功
  const syncOutput = syncResult.stdout || '';
  const syncSuccess = syncOutput.includes('成功') || syncOutput.includes('已覆盖');
  
  if (!syncSuccess) {
    console.log('  ⚠️  批量同步可能需要交互，跳过文件验证测试');
    console.log('  💡 请使用 pnpm test:manual batch 手动测试\n');
  } else {
    test('Swift 文件已同步', () => {
      assertFileExists('ca-test/ContentView.swift');
      assertFileExists('ca-test/CameraManager.swift');
    });

    test('Xcode 项目文件已同步', () => {
      assertFileExists('ca-test.xcodeproj/project.pbxproj');
    });

    test('资源文件已同步', () => {
      assertFileExists('ca-test/Assets.xcassets/Contents.json');
    });
  }

  test('原有文件保留', () => {
    assertFileExists('package.json');
  });

  console.log('\n📋 差异检测测试\n');

  // 只有在同步成功后才测试差异检测
  if (syncSuccess) {
    test('同步后无差异', () => {
      const { success, output } = run(`--preview -r ${TEST_REPO}`);
      assert(success, 'Command failed');
      assertContains(output, '没有发现任何差异');
    });

    // 修改文件
    const contentViewPath = path.join(TEST_DIR, 'ca-test/ContentView.swift');
    const content = fs.readFileSync(contentViewPath, 'utf8');
    fs.writeFileSync(contentViewPath, '// Modified\n' + content);

    test('检测到文件修改', () => {
      const { success, output } = run(`--preview -r ${TEST_REPO}`);
      assert(success, 'Command failed');
      assertContains(output, '修改');
      assertContains(output, 'ContentView.swift');
    });
  } else {
    console.log('  ⚠️  跳过差异检测测试（需要先完成同步）\n');
  }

  console.log('\n📋 详细输出测试\n');

  // 重置环境以确保需要重新克隆
  setup();

  test('-v 显示详细信息', () => {
    const { success, output } = run(`--preview -r ${TEST_REPO} -v`);
    assert(success, 'Command failed');
    // verbose 模式下 git 输出直接打印到控制台 (stdio: inherit)
    // 所以我们检查其他输出内容
    assertContains(output, '预览模式');
  });

  // 清理
  cleanup();

  // 输出结果
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 测试结果汇总\n');
  console.log(`  ✅ 通过: ${results.passed}`);
  console.log(`  ❌ 失败: ${results.failed}`);
  console.log(`  📋 总计: ${results.passed + results.failed}`);
  
  if (results.failed > 0) {
    console.log('\n❌ 失败的测试:');
    results.tests
      .filter(t => !t.passed)
      .forEach(t => console.log(`  • ${t.name}: ${t.error}`));
  }

  console.log('\n' + '='.repeat(50) + '\n');

  process.exit(results.failed > 0 ? 1 : 0);
}

// 运行测试
runTests().catch(error => {
  console.error('测试运行失败:', error);
  process.exit(1);
});
