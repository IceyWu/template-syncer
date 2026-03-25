export interface ScannedFile {
  path: string
  size: number
  hash: string
}

export interface FileDiff {
  path: string
  status: string
}

export declare function scanDir(dir: string, ignorePatterns: string[]): ScannedFile[]
export declare function compareDirs(
  templateDir: string,
  currentDir: string,
  ignorePatterns: string[],
  detectOrphans: boolean
): FileDiff[]
