import { execSync } from 'child_process';
import { platform } from './platform';

/**
 * Git 操作工具
 */
export class Git {
  private verbose: boolean;

  constructor(verbose = false) {
    this.verbose = verbose;
  }

  /**
   * 执行 Git 命令
   */
  private exec(cmd: string, cwd?: string): string {
    try {
      return execSync(cmd, {
        cwd,
        encoding: 'utf8',
        stdio: this.verbose ? 'inherit' : 'pipe'
      }) as string;
    } catch (error) {
      if (this.verbose && error instanceof Error) {
        console.error(`Git 命令失败: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 测试仓库连接
   */
  testConnection(repo: string): boolean {
    try {
      execSync(`git ls-remote --heads "${repo}"`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 克隆仓库
   */
  clone(repo: string, dest: string): void {
    platform.removeDir(dest);
    this.exec(`git clone "${repo}" "${dest}"`);
  }

  /**
   * 获取所有分支
   */
  getBranches(cwd: string): string[] {
    try {
      const output = execSync('git branch -r', { cwd, encoding: 'utf8' });
      return output
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.includes('HEAD'))
        .map(line => line.replace('origin/', ''))
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  /**
   * 切换分支
   */
  checkout(branch: string, cwd: string): void {
    this.exec(`git checkout ${branch}`, cwd);
  }

  /**
   * 创建备份 (stash)
   */
  backup(message = 'Template sync backup'): boolean {
    try {
      execSync(`git add . && git stash push -m "${message}"`, { 
        stdio: this.verbose ? 'inherit' : 'ignore' 
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 删除 .git 目录
   */
  removeGitDir(dir: string): void {
    const gitDir = require('path').join(dir, '.git');
    platform.removeDir(gitDir);
  }
}
