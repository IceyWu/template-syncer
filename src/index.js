const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

/**
 * 简化的模板同步工具
 * 用于将项目与模板仓库保持同步
 */
class TemplateSyncer {  constructor(options = {}) {
    this.tempDir = options.tempDir || '.temp-template';
    this.templateRepo = options.templateRepo;
    this.configFile = '.template-sync.json';
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    this.changes = [];
    this.verbose = options.verbose || false;

    // 需要处理的文件列表
    this.filesToProcess = options.filesToProcess || [
      { path: 'package.json', type: 'merge' },
      { path: 'tsconfig.json', type: 'diff' },
      { path: 'vite.config.ts', type: 'diff' },
      { path: 'unocss.config.ts', type: 'diff' },
      { path: '.gitignore', type: 'overwrite' },
      { path: '.eslintrc.yml', type: 'overwrite' },
      { path: 'netlify.toml', type: 'overwrite' },
    ];
  }
  /**
   * 询问用户输入
   * @param {string} question 问题
   * @param {string[]} validAnswers 有效答案列表
   * @returns {Promise<string>}
   */
  askUser(question, validAnswers = []) {
    return new Promise((resolve) => {
      if (!this.rl) {
        // 如果没有 readline 接口，返回默认值
        resolve(validAnswers[0] || 'y');
        return;
      }
      
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

  /**
   * 创建 Git 备份
   */
  createBackup() {
    console.log('📦 创建备份...');
    try {
      execSync('git add . && git stash push -m "Template sync backup"', { stdio: this.verbose ? 'inherit' : 'ignore' });
      console.log('✅ 备份已创建');
    } catch (error) {
      console.log('⚠️  Git 备份失败，请确保有 Git 变更需要备份');
    }
  }
  /**
   * 克隆模板仓库
   */
  async cloneTemplate() {
    console.log('📦 克隆最新模板...');

    if (fs.existsSync(this.tempDir)) {
      execSync(`rmdir /s /q ${this.tempDir}`, { stdio: 'ignore' });
    }

    try {
      execSync(`git clone --depth 1 "${this.templateRepo}" ${this.tempDir}`, { stdio: this.verbose ? 'inherit' : 'ignore' });
      execSync(`rmdir /s /q ${this.tempDir}\\.git`, { stdio: 'ignore' });
      console.log('✅ 模板克隆完成');
    } catch (error) {
      console.log('❌ 模板克隆失败');
      console.log('可能的原因:');
      console.log('  • 网络连接问题');
      console.log('  • 仓库不存在或无访问权限');
      console.log('  • Git 未正确安装');
      if (this.verbose) {
        console.log(`错误详情: ${error.message}`);
      }
      throw new Error('模板克隆失败');
    }
  }

  /**
   * 显示文件差异
   * @param {string} templatePath 模板文件路径
   * @param {string} currentPath 当前文件路径
   * @returns {Promise<string>}
   */
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

  /**
   * 智能合并 package.json
   * @param {string} templatePath 模板文件路径
   * @param {string} currentPath 当前文件路径
   * @returns {Object}
   */
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

  /**
   * 处理单个文件
   * @param {Object} fileConfig 文件配置
   */
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

  /**
   * 显示变更摘要
   */
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
  /**
   * 清理临时文件
   */
  cleanup() {
    if (fs.existsSync(this.tempDir)) {
      try {
        execSync(`rmdir /s /q ${this.tempDir}`, { stdio: 'ignore' });
      } catch (error) {
        // 尝试使用 Node.js 方法清理
        try {
          fs.rmSync(this.tempDir, { recursive: true, force: true });
        } catch (e) {
          console.log('⚠️  临时目录清理失败');
        }
      }
    }
    if (this.rl) {
      this.rl.close();
    }
  }

  /**
   * 加载配置文件
   * @returns {Object}
   */
  loadConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        return JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
      }
    } catch (error) {
      console.log('⚠️  配置文件读取失败，将使用默认配置');
    }
    return {};
  }

  /**
   * 保存配置文件
   * @param {Object} config 配置对象
   */
  saveConfig(config) {
    try {
      fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
      console.log('💾 配置已保存');
    } catch (error) {
      console.log('⚠️  配置保存失败');
    }
  }

  /**
   * 验证仓库 URL
   * @param {string} repoUrl 仓库 URL
   * @returns {boolean}
   */
  validateRepoUrl(repoUrl) {
    if (!repoUrl) return false;
    
    // 支持多种格式的 Git 仓库 URL
    const patterns = [
      /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+\.git$/,
      /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+$/,
      /^git@github\.com:[\w\-\.]+\/[\w\-\.]+\.git$/,
      /^https:\/\/gitlab\.com\/[\w\-\.\/]+\.git$/,
      /^https:\/\/gitlab\.com\/[\w\-\.\/]+$/,
      /^git@gitlab\.com:[\w\-\.\/]+\.git$/,
      /^https:\/\/bitbucket\.org\/[\w\-\.]+\/[\w\-\.]+\.git$/,
      /^https:\/\/bitbucket\.org\/[\w\-\.]+\/[\w\-\.]+$/,
      /^git@bitbucket\.org:[\w\-\.]+\/[\w\-\.]+\.git$/,
    ];

    return patterns.some(pattern => pattern.test(repoUrl));
  }

  /**
   * 获取模板仓库 URL
   * @returns {Promise<string>}
   */
  async getTemplateRepo() {
    // 如果构造函数中已指定，直接使用
    if (this.templateRepo && this.validateRepoUrl(this.templateRepo)) {
      console.log(`📦 使用指定的模板仓库: ${this.templateRepo}`);
      return this.templateRepo;
    }

    // 尝试从配置文件加载
    const config = this.loadConfig();
    if (config.templateRepo && this.validateRepoUrl(config.templateRepo)) {
      const useLastRepo = await this.askUser(
        `📦 发现之前使用的模板仓库: ${config.templateRepo}\n是否继续使用？[y/n]: `, 
        ['y', 'n']
      );
      
      if (useLastRepo === 'y') {
        this.templateRepo = config.templateRepo;
        return this.templateRepo;
      }
    }

    // 交互式输入新的仓库 URL
    console.log('\n🔗 请输入模板仓库 URL');
    console.log('支持的格式:');
    console.log('  • https://github.com/owner/repo.git');
    console.log('  • https://github.com/owner/repo');
    console.log('  • git@github.com:owner/repo.git');
    console.log('  • GitLab, Bitbucket 等其他 Git 托管平台');
    console.log('\n💡 示例: https://github.com/antfu/vitesse-lite.git');

    while (true) {
      const repoUrl = await this.askUser('\n请输入模板仓库 URL: ');
      
      if (!repoUrl.trim()) {
        console.log('❌ 仓库 URL 不能为空，请重新输入');
        continue;
      }

      const normalizedUrl = repoUrl.trim();
      
      if (this.validateRepoUrl(normalizedUrl)) {
        this.templateRepo = normalizedUrl;
        
        // 询问是否保存配置
        const shouldSave = await this.askUser('💾 是否保存此配置供下次使用？[y/n]: ', ['y', 'n']);
        if (shouldSave === 'y') {
          this.saveConfig({ templateRepo: normalizedUrl });
        }
        
        return this.templateRepo;
      } else {
        console.log('❌ 仓库 URL 格式不正确，请检查后重新输入');
        console.log('   确保 URL 指向有效的 Git 仓库');
      }
    }
  }

  /**
   * 测试仓库连接
   * @param {string} repoUrl 仓库 URL
   * @returns {Promise<boolean>}
   */
  async testRepository(repoUrl) {
    console.log('🔍 测试仓库连接...');
    try {
      // 使用 git ls-remote 测试仓库是否可访问
      execSync(`git ls-remote "${repoUrl}" HEAD`, { 
        stdio: this.verbose ? 'inherit' : 'ignore',
        timeout: 10000 // 10秒超时
      });
      console.log('✅ 仓库连接成功');
      return true;
    } catch (error) {
      console.log('❌ 仓库连接失败');
      if (this.verbose) {
        console.log(`错误详情: ${error.message}`);
      }
      console.log('请检查:');
      console.log('  • 仓库 URL 是否正确');
      console.log('  • 网络连接是否正常');
      console.log('  • 是否有访问权限（对于私有仓库）');
      return false;
    }
  }
  /**
   * 初始化配置向导
   */
  async initConfig() {
    console.log('🔧 初始化配置向导\n');
    
    const config = {};
    
    console.log('请设置默认模板仓库:');
    config.templateRepo = await this.getTemplateRepo();
    
    // 询问默认文件处理配置
    console.log('\n📁 配置要同步的文件类型:');
    const configureFiles = await this.askUser('是否要自定义文件同步配置？[y/n]: ', ['y', 'n']);
    
    if (configureFiles === 'y') {
      const customFiles = [];
      console.log('\n可选的文件类型:');
      console.log('1. package.json (智能合并)');
      console.log('2. tsconfig.json (差异对比)');
      console.log('3. 配置文件 (.eslintrc, vite.config 等)');
      console.log('4. 工作流文件 (GitHub Actions, CI 等)');
      
      // 这里可以添加更多自定义文件配置逻辑
      // 为简化演示，暂时使用默认配置
      config.filesToProcess = this.filesToProcess;
    } else {
      config.filesToProcess = this.filesToProcess;
    }
    
    // 保存配置
    this.saveConfig(config);
    console.log('\n✅ 配置初始化完成！');
    console.log('💡 可以直接运行 template-sync 开始同步');
  }
  /**
   * 主同步流程
   */
  async sync() {
    try {
      console.log('🚀 开始模板同步...\n');

      // 1. 获取模板仓库 URL
      await this.getTemplateRepo();

      // 2. 测试仓库连接
      const isReachable = await this.testRepository(this.templateRepo);
      if (!isReachable) {
        const shouldContinue = await this.askUser('是否仍要尝试克隆？[y/n]: ', ['y', 'n']);
        if (shouldContinue === 'n') {
          console.log('⏹️  同步已取消');
          return;
        }
      }

      // 3. 创建备份
      this.createBackup();

      // 4. 克隆模板
      await this.cloneTemplate();

      // 5. 逐个处理文件
      for (const fileConfig of this.filesToProcess) {
        await this.processFile(fileConfig);
      }

      // 6. 显示摘要
      this.showSummary();

      // 7. 询问是否安装依赖
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

module.exports = TemplateSyncer;
