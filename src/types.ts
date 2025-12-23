/**
 * 文件信息
 */
export interface FileInfo {
  /** 相对路径 */
  path: string;
  /** 绝对路径 */
  fullPath: string;
  /** 文件大小 */
  size: number;
  /** 是否为二进制文件 */
  isBinary: boolean;
  /** 文件分类 */
  category: string;
  /** 显示图标 */
  icon: string;
}

/**
 * 文件变更信息
 */
export interface FileChange extends FileInfo {
  /** 变更状态 */
  status: 'new' | 'modified' | 'deleted';
  /** 模板文件路径 */
  templatePath: string;
  /** 当前文件路径 */
  currentPath: string;
  /** 是否选中 */
  selected: boolean;
}

/**
 * 同步器配置选项
 */
export interface SyncerOptions {
  /** 模板仓库 URL */
  repo?: string;
  /** 分支名称 */
  branch?: string;
  /** 临时目录 */
  tempDir?: string;
  /** 详细输出 */
  verbose?: boolean;
  /** 自定义忽略模式 */
  ignore?: string[];
  /** 自定义文件分类规则 */
  categories?: CategoryRule[];
  /** 自定义合并策略 */
  mergers?: Record<string, MergeStrategy>;
}

/**
 * 持久化配置
 */
export interface SyncConfig {
  repo?: string;
  branch?: string;
  ignore?: string[];
  categories?: CategoryRule[];
  mergers?: Record<string, MergeStrategy>;
  lastSync?: string;
}

/**
 * 文件分类规则
 */
export interface CategoryRule {
  /** 匹配模式 (glob 或正则) */
  match: string;
  /** 分类名称 */
  category: string;
  /** 显示图标 */
  icon: string;
  /** 优先级 (越高越优先) */
  priority?: number;
}

/**
 * 合并策略
 */
export type MergeStrategy = 
  | 'overwrite'  // 直接覆盖
  | 'skip'       // 跳过
  | 'smart'      // 智能合并 (JSON 等)
  | 'ask';       // 询问用户

/**
 * 批量操作结果
 */
export interface BatchResult {
  success: string[];
  skipped: string[];
  failed: Array<{ path: string; error: string }>;
}

/**
 * 推荐操作
 */
export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  files: FileChange[];
}
