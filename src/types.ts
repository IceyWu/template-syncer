export interface FileConfig {
  path: string;
  fullPath?: string;
  type: FileType;
  category: string;
  description?: string;
  selected: boolean;
  exists?: boolean;
  isNew?: boolean;
  status?: 'new' | 'modified' | 'unchanged';
  templatePath?: string;
  currentPath?: string;
  icon?: string;
}

export type FileType = 'js' | 'json' | 'yaml' | 'text' | 'vue' | 'react' | 'angular' | 'svelte' | 'css' | 'image' | 'config';

export interface TemplateSyncerOptions {
  tempDir?: string;
  templateRepo?: string;
  branch?: string;
  verbose?: boolean;
  filesToProcess?: FileConfig[];
}

export interface FileTypeConfig {
  type: FileType;
  category: string;
  icon: string;
}

export interface ProcessResult {
  applied: boolean;
  message: string;
}

export interface BatchResults {
  success: string[];
  skipped: string[];
  failed: Array<{ path: string; error: string }>;
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  files: FileConfig[];
}

export interface SyncConfig {
  templateRepo?: string;
  branch?: string;
  filesToProcess?: FileConfig[];
  ignorePatterns?: string[];
  [key: string]: any;
}
