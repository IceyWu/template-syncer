import type { FileChange } from '../types';

interface TreeNode {
  name: string;
  isFile: boolean;
  file?: FileChange;
  children: Map<string, TreeNode>;
}

/**
 * 构建文件树
 */
function buildTree(files: FileChange[]): TreeNode {
  const root: TreeNode = {
    name: '',
    isFile: false,
    children: new Map()
  };

  for (const file of files) {
    const parts = file.path.replace(/\\/g, '/').split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          isFile: isLast,
          file: isLast ? file : undefined,
          children: new Map()
        });
      }

      current = current.children.get(part)!;
    }
  }

  return root;
}

/**
 * 获取状态文本
 */
function getStatusText(status: string): string {
  switch (status) {
    case 'new': return '(新增)';
    case 'modified': return '(修改)';
    case 'deleted': return '(删除)';
    default: return '';
  }
}

/**
 * 渲染树形结构
 */
function renderTree(
  node: TreeNode, 
  prefix: string = '', 
  isLast: boolean = true,
  isRoot: boolean = true
): string[] {
  const lines: string[] = [];
  
  if (!isRoot) {
    const connector = isLast ? '└── ' : '├── ';
    
    if (node.isFile && node.file) {
      const status = getStatusText(node.file.status);
      const icon = node.file.status === 'deleted' ? '🗑️' : node.file.icon;
      lines.push(`${prefix}${connector}${icon} ${node.name} ${status}`);
    } else {
      lines.push(`${prefix}${connector}📁 ${node.name}/`);
    }
  }

  const children = Array.from(node.children.values());
  // 排序：目录在前，文件在后
  children.sort((a, b) => {
    if (a.isFile === b.isFile) return a.name.localeCompare(b.name);
    return a.isFile ? 1 : -1;
  });

  const newPrefix = isRoot ? '' : prefix + (isLast ? '    ' : '│   ');

  children.forEach((child, index) => {
    const childIsLast = index === children.length - 1;
    lines.push(...renderTree(child, newPrefix, childIsLast, false));
  });

  return lines;
}

/**
 * 生成文件树字符串
 */
export function formatFileTree(files: FileChange[]): string {
  if (files.length === 0) return '';
  
  const tree = buildTree(files);
  const lines = renderTree(tree);
  
  return lines.join('\n');
}

/**
 * 按分类分组并生成树
 */
export function formatGroupedTree(files: FileChange[]): string {
  if (files.length === 0) return '';

  // 按分类分组
  const groups = new Map<string, FileChange[]>();
  for (const file of files) {
    const list = groups.get(file.category) || [];
    list.push(file);
    groups.set(file.category, list);
  }

  const lines: string[] = [];
  const categories = Array.from(groups.entries());

  categories.forEach(([category, categoryFiles], catIndex) => {
    const icon = categoryFiles[0].icon;
    const newCount = categoryFiles.filter(f => f.status === 'new').length;
    const modCount = categoryFiles.filter(f => f.status === 'modified').length;
    const delCount = categoryFiles.filter(f => f.status === 'deleted').length;
    
    // 分类标题
    let stats = `${categoryFiles.length} 个文件`;
    const parts = [];
    if (newCount > 0) parts.push(`新增: ${newCount}`);
    if (modCount > 0) parts.push(`修改: ${modCount}`);
    if (delCount > 0) parts.push(`删除: ${delCount}`);
    if (parts.length > 0) stats += `, ${parts.join(', ')}`;
    
    lines.push(`${icon} ${category} (${stats})`);
    
    // 构建该分类的文件树
    const tree = buildTree(categoryFiles);
    const treeLines = renderTree(tree);
    
    // 添加缩进
    treeLines.forEach(line => {
      lines.push(`   ${line}`);
    });

    // 分类之间添加空行
    if (catIndex < categories.length - 1) {
      lines.push('');
    }
  });

  return lines.join('\n');
}
