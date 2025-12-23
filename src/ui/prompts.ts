import inquirer from 'inquirer';
import type { FileChange, Recommendation } from '../types';
import { formatGroupedTree } from './tree';

const chalk = require('chalk');

/**
 * 交互式提示工具
 */
export const prompts = {
  /**
   * 输入模板仓库 URL
   */
  async inputRepo(): Promise<string> {
    const { repo } = await inquirer.prompt([{
      type: 'input',
      name: 'repo',
      message: '请输入模板仓库 URL:',
      validate: (input: string) => input.trim() ? true : '仓库 URL 不能为空'
    }]);
    return repo;
  },

  /**
   * 选择分支
   */
  async selectBranch(branches: string[]): Promise<string> {
    if (branches.length === 0) return 'main';
    if (branches.length === 1) return branches[0];

    const { branch } = await inquirer.prompt([{
      type: 'list',
      name: 'branch',
      message: '请选择分支:',
      choices: branches.map(b => ({
        name: b === 'main' || b === 'master' ? `${b} (默认)` : b,
        value: b
      })),
      default: branches.find(b => b === 'main') || branches.find(b => b === 'master') || branches[0]
    }]);
    return branch;
  },

  /**
   * 选择处理方式
   */
  async selectAction(): Promise<'category' | 'individual' | 'all' | 'cancel'> {
    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: '选择处理方式:',
      choices: [
        { name: '📋 按分类选择', value: 'category' },
        { name: '📝 逐一选择', value: 'individual' },
        { name: '✅ 全部应用', value: 'all' },
        { name: '❌ 取消', value: 'cancel' }
      ]
    }]);
    return action;
  },

  /**
   * 按分类选择文件
   */
  async selectByCategory(changes: FileChange[]): Promise<FileChange[]> {
    // 按分类分组
    const categories = new Map<string, FileChange[]>();
    for (const file of changes) {
      const list = categories.get(file.category) || [];
      list.push(file);
      categories.set(file.category, list);
    }

    const selected: FileChange[] = [];

    for (const [category, files] of categories) {
      const icon = files[0].icon;
      const newCount = files.filter(f => f.status === 'new').length;
      const modCount = files.filter(f => f.status === 'modified').length;

      const { include } = await inquirer.prompt([{
        type: 'confirm',
        name: 'include',
        message: `${icon} ${category} (${files.length} 个文件, 新增: ${newCount}, 修改: ${modCount})`,
        default: true
      }]);

      if (include) {
        selected.push(...files);
      }
    }

    return selected;
  },

  /**
   * 逐一选择文件
   */
  async selectIndividually(changes: FileChange[]): Promise<FileChange[]> {
    const { selected } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'selected',
      message: '选择要处理的文件:',
      choices: changes.map(file => ({
        name: `${file.icon} ${file.path} (${file.status === 'new' ? '新增' : '修改'})`,
        value: file,
        checked: true
      })),
      pageSize: 15
    }]);
    return selected;
  },

  /**
   * 确认操作
   */
  async confirm(message: string, defaultValue = true): Promise<boolean> {
    const { confirmed } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirmed',
      message,
      default: defaultValue
    }]);
    return confirmed;
  },

  /**
   * 选择推荐操作
   */
  async selectRecommendations(recommendations: Recommendation[]): Promise<Recommendation[]> {
    const { selected } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'selected',
      message: '选择要执行的操作:',
      choices: recommendations.map(rec => {
        const icon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
        return {
          name: `${icon} ${rec.title} (${rec.files.length} 个文件)`,
          value: rec,
          checked: rec.priority === 'high'
        };
      })
    }]);
    return selected;
  },

  /**
   * 初始化配置向导
   */
  async initConfig(): Promise<{
    repo: string;
    branch: string;
    ignore: string[];
    verbose: boolean;
  }> {
    return inquirer.prompt([
      {
        type: 'input',
        name: 'repo',
        message: '默认模板仓库 URL:',
        default: ''
      },
      {
        type: 'input',
        name: 'branch',
        message: '默认分支 (留空则每次询问):',
        default: ''
      },
      {
        type: 'checkbox',
        name: 'ignore',
        message: '额外忽略的文件:',
        choices: [
          { name: '.env.local', value: '.env.local', checked: false },
          { name: 'README.md', value: 'README.md', checked: false },
          { name: '.vscode/', value: '.vscode/**', checked: false }
        ]
      },
      {
        type: 'confirm',
        name: 'verbose',
        message: '默认启用详细输出?',
        default: false
      }
    ]);
  },

  /**
   * 显示变更统计
   */
  showChangeSummary(changes: FileChange[]): void {
    console.log(`\n发现 ${chalk.bold(changes.length)} 个文件需要处理:\n`);
    console.log(formatGroupedTree(changes));
    console.log('');
  }
};
