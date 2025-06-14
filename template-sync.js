#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// 简化的模板同步工具
class SimpleTemplateSyncer {
  constructor() {
    this.tempDir = '.temp-template';
    this.templateRepo = 'https://github.com/antfu/vitesse-lite.git';
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    this.changes = [];

    // 需要处理的文件列表
    this.filesToProcess = [
      { path: 'package.json', type: 'merge' },
      { path: 'tsconfig.json', type: 'diff' },
      { path: 'vite.config.ts', type: 'diff' },
      { path: 'unocss.config.ts', type: 'diff' },
      { path: '.gitignore', type: 'overwrite' },
      { path: '.eslintrc.yml', type: 'overwrite' },
      { path: 'netlify.toml', type: 'overwrite' },
    ];
  }

  // 询问用户输入
  askUser(question, validAnswers = []) {
    return new Promise((resolve) => {
      const ask = () => {
        this.rl.question(question, (answer) => {
          const normalizedAnswer = answer.toLowerCase().trim();
          if (validAnswers.length === 0 || validAnswers.includes(normalizedAnswer)) {
            resolve(normalizedAnswer);
          } else {
            console.log(`请输入有效选项: ${validAnswers.join(', ')}`);
            ask();
          }
        });
      };
      ask();
    });
  }

  // 创建备份
  createBackup() {
    console.log('📦 创建备份...');
    try {
      execSync('git add . && git stash push -m "Template sync backup"', { stdio: 'inherit' });
      console.log('✅ 备份已创建');
    } catch (error) {
      console.log('⚠️  Git 备份失败，请确保有 Git 变更需要备份');
    }
  }

  // 克隆模板仓库
  cloneTemplate() {
    console.log('📦 克隆最新模板...');

    if (fs.existsSync(this.tempDir)) {
      execSync(`rmdir /s /q ${this.tempDir}`, { stdio: 'inherit' });
    }

    try {
      execSync(`git clone --depth 1 ${this.templateRepo} ${this.tempDir}`, { stdio: 'inherit' });
      execSync(`rmdir /s /q ${this.tempDir}\\.git`, { stdio: 'inherit' });
      console.log('✅ 模板克隆完成');
    } catch (error) {
      throw new Error(`模板克隆失败: ${error.message}`);
    }
  }

  // 显示文件差异
  async showDiff(templatePath, currentPath) {
    console.log(`\n📄 对比文件: ${currentPath}`);

    if (!fs.existsSync(currentPath)) {
      console.log('🆕 这是一个新文件');
      console.log('模板内容:');
      console.log('-'.repeat(50));
      console.log(fs.readFileSync(templatePath, 'utf8'));
      console.log('-'.repeat(50));
      return await this.askUser('是否添加此文件？[y/n]: ', ['y', 'n']);
    }

    try {
      const result = execSync(`git diff --no-index --color=always "${currentPath}" "${templatePath}"`,
        { encoding: 'utf8', stdio: 'pipe' });
      console.log(result);
    } catch (error) {
      console.log(error.stdout || '文件内容相同');
    }

    return await this.askUser('选择操作 [u]更新 [s]跳过: ', ['u', 's']);
  }

  // 智能合并 package.json
  mergePackageJson(templatePath, currentPath) {
    console.log('\n📦 智能合并 package.json...');

    const templatePkg = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
    const currentPkg = JSON.parse(fs.readFileSync(currentPath, 'utf8'));

    // 保留当前项目的基本信息和依赖
    const merged = {
      ...currentPkg,
      // 合并 scripts (保留当前的，添加新的)
      scripts: {
        ...currentPkg.scripts,
        ...templatePkg.scripts,
      },
      // 合并 devDependencies (使用模板的版本)
      devDependencies: {
        ...currentPkg.devDependencies,
        ...templatePkg.devDependencies,
      },
    };

    // 显示将要合并的内容
    console.log('🔄 将要合并的新 scripts:');
    for (const [key, value] of Object.entries(templatePkg.scripts || {})) {
      if (!currentPkg.scripts || currentPkg.scripts[key] !== value) {
        console.log(`  + ${key}: ${value}`);
      }
    }

    console.log('🔄 将要合并的新 devDependencies:');
    for (const [key, value] of Object.entries(templatePkg.devDependencies || {})) {
      if (!currentPkg.devDependencies || currentPkg.devDependencies[key] !== value) {
        console.log(`  + ${key}: ${value}`);
      }
    }

    return merged;
  }

  // 处理单个文件
  async processFile(fileConfig) {
    const templatePath = path.join(this.tempDir, fileConfig.path);
    const currentPath = fileConfig.path;

    if (!fs.existsSync(templatePath)) {
      console.log(`⚠️  模板中不存在: ${fileConfig.path}`);
      return;
    }

    console.log(`\n🔍 处理: ${fileConfig.path}`);

    switch (fileConfig.type) {
      case 'merge':
        if (fileConfig.path === 'package.json') {
          const merged = this.mergePackageJson(templatePath, currentPath);
          const shouldUpdate = await this.askUser('是否应用 package.json 合并？[y/n]: ', ['y', 'n']);
          if (shouldUpdate === 'y') {
            fs.writeFileSync(currentPath, JSON.stringify(merged, null, 2));
            console.log('✅ package.json 已合并');
            this.changes.push(`合并: ${fileConfig.path}`);
          }
        }
        break;

      case 'diff':
        const action = await this.showDiff(templatePath, currentPath);
        if (action === 'u') {
          fs.copyFileSync(templatePath, currentPath);
          console.log(`✅ 已更新: ${fileConfig.path}`);
          this.changes.push(`更新: ${fileConfig.path}`);
        } else {
          console.log(`⏭️  跳过: ${fileConfig.path}`);
        }
        break;

      case 'overwrite':
        const shouldOverwrite = await this.askUser(`是否覆盖 ${fileConfig.path}？[y/n]: `, ['y', 'n']);
        if (shouldOverwrite === 'y') {
          fs.copyFileSync(templatePath, currentPath);
          console.log(`✅ 已覆盖: ${fileConfig.path}`);
          this.changes.push(`覆盖: ${fileConfig.path}`);
        }
        break;
    }
  }

  // 显示变更摘要
  showSummary() {
    console.log('\n📋 同步摘要:');
    console.log('='.repeat(50));

    if (this.changes.length === 0) {
      console.log('✨ 没有应用任何变更');
    } else {
      this.changes.forEach((change, index) => {
        console.log(`${index + 1}. ${change}`);
      });
    }

    console.log('='.repeat(50));
  }

  // 清理临时文件
  cleanup() {
    if (fs.existsSync(this.tempDir)) {
      execSync(`rmdir /s /q ${this.tempDir}`, { stdio: 'inherit' });
    }
    this.rl.close();
  }

  // 主同步流程
  async sync() {
    try {
      console.log('🚀 开始模板同步...\n');

      // 1. 创建备份
      this.createBackup();

      // 2. 克隆模板
      this.cloneTemplate();

      // 3. 逐个处理文件
      for (const fileConfig of this.filesToProcess) {
        await this.processFile(fileConfig);
      }

      // 4. 显示摘要
      this.showSummary();

      // 5. 询问是否安装依赖
      if (this.changes.some(change => change.includes('package.json'))) {
        const shouldInstall = await this.askUser('\n是否运行 pnpm install 更新依赖？[y/n]: ', ['y', 'n']);
        if (shouldInstall === 'y') {
          console.log('\n📦 安装依赖...');
          execSync('pnpm install', { stdio: 'inherit' });
        }
      }

      console.log('\n✅ 模板同步完成！');
      console.log('💡 如有问题，可以使用 git stash pop 恢复更改');

    } catch (error) {
      console.error('❌ 同步失败:', error.message);
      process.exit(1);
    } finally {
      this.cleanup();
    }
  }
}

// 运行同步
if (require.main === module) {
  const syncer = new SimpleTemplateSyncer();
  syncer.sync();
}

module.exports = SimpleTemplateSyncer;
