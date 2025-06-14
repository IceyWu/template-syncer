const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔍 开始预发布检查...\n');

// 1. 检查 package.json
console.log('📋 检查 package.json...');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredFields = ['name', 'version', 'description', 'main', 'bin', 'author', 'license'];
const missingFields = requiredFields.filter(field => !pkg[field]);

if (missingFields.length > 0) {
  console.error('❌ package.json 缺少必填字段:', missingFields.join(', '));
  process.exit(1);
}
console.log('✅ package.json 检查通过');

// 2. 构建项目
console.log('\n🔨 构建项目...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ 构建成功');
} catch (error) {
  console.error('❌ 构建失败');
  process.exit(1);
}

// 3. 检查必要文件存在
console.log('\n📁 检查必要文件...');
const requiredFiles = ['lib/index.js', 'bin/template-sync.js', 'README.md', 'LICENSE'];
const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));

if (missingFiles.length > 0) {
  console.error('❌ 缺少必要文件:', missingFiles.join(', '));
  process.exit(1);
}
console.log('✅ 文件检查通过');

// 4. 运行测试
console.log('\n🧪 运行测试...');
try {
  execSync('npm test', { stdio: 'inherit' });
  console.log('✅ 测试通过');
} catch (error) {
  console.error('❌ 测试失败');
  process.exit(1);
}

// 5. 检查包内容
console.log('\n📦 检查包内容...');
try {
  const result = execSync('npm pack --dry-run', { encoding: 'utf8' });
  console.log(result);
  console.log('✅ 包内容检查完成');
} catch (error) {
  console.error('❌ 包内容检查失败');
  process.exit(1);
}

console.log('\n🎉 预发布检查全部通过！');
console.log('💡 现在可以运行 "npm publish" 来发布包');

// 显示发布命令提示
console.log('\n📋 发布步骤:');
console.log('1. npm login  # 如果还未登录');
console.log('2. npm publish  # 发布包');
console.log('3. npm install -g template-syncer  # 测试全局安装');
console.log('4. template-sync --help  # 测试命令');
