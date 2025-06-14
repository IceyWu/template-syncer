#!/usr/bin/env node

/**
 * Vitesse-lite 模板同步测试
 * 克隆 vitesse-lite 项目并测试模板同步功能
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const testProjectDir = 'vitesse-test-project';
const templateRepo = 'https://github.com/antfu/vitesse-lite.git';

console.log('🧪 Vitesse-lite 模板同步测试\n');

// 清理旧的测试项目
if (fs.existsSync(testProjectDir)) {
  console.log('🧹 清理旧的测试项目...');
  fs.rmSync(testProjectDir, { recursive: true, force: true });
}

console.log('� 克隆 vitesse-lite 项目...');
try {
  execSync(`git clone ${templateRepo} ${testProjectDir}`, { 
    stdio: 'inherit' 
  });
  
  // 进入项目目录
  process.chdir(testProjectDir);
  
  // 删除 .git 目录，重新初始化
  if (fs.existsSync('.git')) {
    fs.rmSync('.git', { recursive: true, force: true });
  }
  
  execSync('git init', { stdio: 'ignore' });
  execSync('git config user.name "Test User"', { stdio: 'ignore' });
  execSync('git config user.email "test@example.com"', { stdio: 'ignore' });
  execSync('git add .', { stdio: 'ignore' });
  execSync('git commit -m "Initial vitesse-lite project"', { stdio: 'ignore' });
  
  console.log('✅ 测试项目准备完成！');
  console.log(`📁 项目位置: ${process.cwd()}`);
  console.log('\n� 现在你可以：');
  console.log('1. 修改项目文件（如 package.json, vite.config.ts 等）');
  console.log('2. 运行同步命令测试效果：');
  console.log(`   node ../bin/template-sync.js --repo ${templateRepo}`);
  console.log('3. 或者使用详细模式：');
  console.log(`   node ../bin/template-sync.js --repo ${templateRepo} --verbose`);
  console.log('\n💡 提示：所有更改都是安全的，工具会创建 Git 备份');
  
} catch (error) {
  console.error('❌ 测试项目创建失败:', error.message);
  process.exit(1);
}
