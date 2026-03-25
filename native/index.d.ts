export interface ScannedFile {
  path: string
  size: number
  hash: string
}

export interface FileDiff {
  path: string
  /** "new" | "modified" | "deleted" */
  status: string
}

/** 并行扫描目录，返回所有文件的路径、大小和 SHA-256 hash */
export declare function scanDir(dir: string, ignorePatterns: string[]): ScannedFile[]

/** 并行比较两个目录，返回差异列表 */
export declare function compareDirs(
  templateDir: string,
  currentDir: string,
  ignorePatterns: string[],
  detectOrphans: boolean
): FileDiff[]
