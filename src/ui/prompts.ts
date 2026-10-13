import type { FileChange, Recommendation } from '../types';
import { formatGroupedTree } from './tree';

const pc = require('picocolors');
type Inquirer = typeof import('inquirer', { with: { 'resolution-mode': 'import' } }).default;
let inquirerPromise: Promise<Inquirer> | undefined;

function getInquirer(): Promise<Inquirer> {
  inquirerPromise ??= import('inquirer').then(module => module.default);
  return inquirerPromise;
}

const STATUS_TEXT: Record<string, string> = {
  new: '新增',
  modified: '修改',
  deleted: '删除'
};

export const prompts = {
  async inputRepo(): Promise<string> {
    const { repo } = await (await getInquirer()).prompt([{
      type: 'input',
      name: 'repo',
      message: '请输入模板仓库 URL:',
      validate: (input: string) => input.trim() ? true : '仓库 URL 不能为空'
    }]);
    return repo;
  },

  async selectBranch(branches: string[]): Promise<string> {
    if (branches.length === 0) return 'main';
    if (branches.length === 1) return branches[0];

    const { branch } = await (await getInquirer()).prompt([{
      type: 'list',
      name: 'branch',
      message: '请选择分支:',
      choices: branches.map(b => ({
        name: b === 'main' || b === 'master' ? `${b} (默认)` : b,
        value: b
      })),
      default: branches.find(b => b === 'main') ?? branches.find(b => b === 'master') ?? branches[0]
    }]);
    return branch;
  },

  async selectAction(): Promise<'category' | 'individual' | 'all' | 'cancel'> {
    const { action } = await (await getInquirer()).prompt([{
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

  // 一次 checkbox 选择所有分类，而不是逐个 confirm
  async selectByCategory(changes: FileChange[]): Promise<FileChange[]> {
    const categories = new Map<string, FileChange[]>();
    for (const file of changes) {
      const list = categories.get(file.category) ?? [];
      list.push(file);
      categories.set(file.category, list);
    }

    const choices = Array.from(categories.entries()).map(([category, files]) => {
      const icon = files[0].icon;
      const parts: string[] = [];
      const newCount = files.filter(f => f.status === 'new').length;
      const modCount = files.filter(f => f.status === 'modified').length;
      const delCount = files.filter(f => f.status === 'deleted').length;
      if (newCount > 0) parts.push(pc.green(`新增 ${newCount}`));
      if (modCount > 0) parts.push(pc.yellow(`修改 ${modCount}`));
      if (delCount > 0) parts.push(pc.red(`删除 ${delCount}`));
      return {
        name: `${icon} ${category}  ${parts.join('  ')}`,
        value: category,
        checked: delCount === 0
      };
    });

    const { selected } = await (await getInquirer()).prompt([{
      type: 'checkbox',
      name: 'selected',
      message: '选择要处理的分类:',
      choices,
      pageSize: 15
    }]);

    return changes.filter(f => selected.includes(f.category));
  },

  async selectIndividually(changes: FileChange[]): Promise<FileChange[]> {
    const { selected } = await (await getInquirer()).prompt([{
      type: 'checkbox',
      name: 'selected',
      message: '选择要处理的文件:',
      choices: changes.map(file => {
        const statusLabel = STATUS_TEXT[file.status] ?? file.status;
        const colorFn = file.status === 'new' ? pc.green
          : file.status === 'deleted' ? pc.red
          : pc.yellow;
        return {
          name: `${file.icon} ${file.path}  ${colorFn(statusLabel)}`,
          value: file,
          checked: file.status !== 'deleted'
        };
      }),
      pageSize: 20
    }]);
    return selected;
  },

  async confirm(message: string, defaultValue = true): Promise<boolean> {
    const { confirmed } = await (await getInquirer()).prompt([{
      type: 'confirm',
      name: 'confirmed',
      message,
      default: defaultValue
    }]);
    return confirmed;
  },

  // batch/smart 模式：一次选择推荐组
  async selectRecommendations(recommendations: Recommendation[]): Promise<Recommendation[]> {
    const PRIORITY_ICON: Record<string, string> = { high: '🔴', medium: '🟡', low: '🟢' };

    const { selected } = await (await getInquirer()).prompt([{
      type: 'checkbox',
      name: 'selected',
      message: '选择要执行的更新:',
      choices: recommendations.map(rec => ({
        name: `${PRIORITY_ICON[rec.priority]} ${rec.title}  ${pc.gray(rec.description)}  (${rec.files.length} 个文件)`,
        value: rec,
        checked: rec.priority === 'high'
      }))
    }]);
    return selected;
  },

  async initConfig(): Promise<{ repo: string; branch: string; ignore: string[] }> {
    const answers = await (await getInquirer()).prompt([
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
          { name: '.env.local', value: '.env.local' },
          { name: 'README.md', value: 'README.md' },
          { name: '.vscode/', value: '.vscode/**' }
        ]
      }
    ]);
    return { ...answers, ignore: [...answers.ignore] };
  },

  showChangeSummary(changes: FileChange[]): void {
    const newCount = changes.filter(f => f.status === 'new').length;
    const modCount = changes.filter(f => f.status === 'modified').length;
    const delCount = changes.filter(f => f.status === 'deleted').length;

    const parts: string[] = [];
    if (newCount > 0) parts.push(pc.green(`新增 ${newCount}`));
    if (modCount > 0) parts.push(pc.yellow(`修改 ${modCount}`));
    if (delCount > 0) parts.push(pc.red(`删除 ${delCount}`));

    console.log(`\n发现 ${pc.bold(changes.length)} 个变更  ${parts.join('  ')}\n`);
    console.log(formatGroupedTree(changes));
    console.log('');
  }
};
