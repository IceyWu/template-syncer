#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 执行 TypeScript 构建后处理...');

// 确保bin文件的权限
const binFile = path.join(__dirname, '..', 'bin', 'template-sync.js');
if (fs.existsSync(binFile)) {
  console.log('✅ bin 文件已存在');
} else {
  console.log('⚠️  bin 文件不存在');
}

// 复制 package.json 到 lib 目录
const srcPackage = path.join(__dirname, '..', 'package.json');
const destPackage = path.join(__dirname, '..', 'lib', 'package.json');

try {
  const packageContent = fs.readFileSync(srcPackage, 'utf8');
  fs.writeFileSync(destPackage, packageContent);
  console.log('✅ package.json 已复制到 lib 目录');
} catch (error) {
  console.log('⚠️  复制 package.json 失败');
}

console.log('🎉 构建后处理完成！');
