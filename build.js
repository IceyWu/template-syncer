const fs = require('fs');
const path = require('path');

// 创建 lib 目录
const libDir = path.join(__dirname, 'lib');
if (!fs.existsSync(libDir)) {
  fs.mkdirSync(libDir, { recursive: true });
}

// 复制 src 目录下的所有文件到 lib 目录
const srcDir = path.join(__dirname, 'src');
const files = fs.readdirSync(srcDir);

files.forEach(file => {
  if (file.endsWith('.js')) {
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(libDir, file);
    fs.copyFileSync(srcFile, destFile);
    console.log(`复制: ${file} -> lib/${file}`);
  }
});

console.log('构建完成！');
