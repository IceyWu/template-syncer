// 导出主类
export { TemplateSyncer } from './syncer';

// 导出类型
export type {
  FileInfo,
  FileChange,
  SyncerOptions,
  SyncConfig,
  CategoryRule,
  MergeStrategy,
  BatchResult,
  Recommendation
} from './types';

// 导出工具
export { platform, Categorizer, Merger, Git, Scanner } from './utils';
export { prompts, logger } from './ui';
