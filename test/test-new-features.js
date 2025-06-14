#!/usr/bin/env node

const TemplateSyncer = require('../src/index.js');

// 创建一个带有配置的同步器
const syncer = new TemplateSyncer({
  verbose: true
});

// 模拟测试同步流程（只测试到文件选择阶段）
async function testSync() {
  try {
    console.log('🧪 开始测试新的同步流程...\n');

    // 1. 扫描当前目录的文件
    const allFiles = syncer.scanCurrentDirectory();
    
    if (allFiles.length === 0) {
      console.log('❌ 当前目录中没有找到可同步的文件');
      return;
    }

    console.log(`\n发现 ${allFiles.length} 个可同步的文件:`);
    allFiles.forEach((file, index) => {
      const status = file.selected ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${file.path} (${file.type})`);
    });

    // 2. 测试文件类型检测
    console.log('\n=== 文件类型检测测试 ===');
    const testCases = [
      'package.json',
      '.gitignore', 
      'README.md',
      'src/index.js',
      'config.yml',
      'Dockerfile',
      '.eslintrc'
    ];
    
    testCases.forEach(filename => {
      const type = syncer.getFileType(filename);
      console.log(`${filename} -> ${type}`);
    });

    console.log('\n✅ 基本功能测试完成!');
    console.log('\n💡 要测试完整的同步流程，请运行:');
    console.log('   npm start');
    console.log('   或者');
    console.log('   node bin/template-sync.js');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (syncer.verbose) {
      console.error(error);
    }
  } finally {
    // 清理 readline 接口
    if (syncer.rl) {
      syncer.rl.close();
    }
  }
}

testSync();
