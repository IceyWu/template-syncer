const TemplateSyncer = require('./src/index.js');

// 测试新的功能
async function test() {
  const syncer = new TemplateSyncer({
    verbose: true
  });

  console.log('=== 测试文件扫描功能 ===');
  
  // 测试扫描当前目录
  const files = syncer.scanCurrentDirectory();
  console.log('扫描到的文件数量:', files.length);
  console.log('前10个文件:');
  files.slice(0, 10).forEach((file, index) => {
    console.log(`${index + 1}. ${file.path} (${file.type})`);
  });
  
  // 测试文件类型判断
  console.log('\n=== 测试文件类型判断 ===');
  const testFiles = ['package.json', '.gitignore', 'README.md', 'src/index.js', 'test.yml'];
  testFiles.forEach(file => {
    const type = syncer.getFileType(file);
    console.log(`${file} -> ${type}`);
  });
}

test().catch(console.error);
