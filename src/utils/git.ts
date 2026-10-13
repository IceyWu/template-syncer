import { execFileSync } from 'child_process';

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
  private exec(args: string[], cwd?: string): string {
    try {
      const output = execFileSync('git', args, {
        cwd,
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 120_000
      });
      if (this.verbose && output) console.log(output);
      return output;
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
      execFileSync('git', ['ls-remote', '--heads', '--', repo], { stdio: 'ignore', timeout: 30_000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 克隆仓库
   */
  clone(repo: string, dest: string): void {
    // Keep the template checkout byte-for-byte aligned with Git blobs. A global
    // core.autocrlf=true otherwise rewrites LF files to CRLF and makes every
    // such file look changed when the target contains the original LF bytes.
    this.exec(['clone', '--config', 'core.autocrlf=false', '--', repo, dest]);
  }

  /**
   * 获取所有分支
   */
  getBranches(cwd: string): string[] {
    try {
      const output = this.exec(['branch', '-r'], cwd);
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
    if (!branch || branch.startsWith('-') || branch.includes('..')) {
      throw new Error(`无效的分支名称: ${branch}`);
    }
    this.exec(['checkout', '--detach', `origin/${branch}`], cwd);
  }

  /**
   * 创建备份 (stash)
   * 只备份已跟踪的文件，不影响未跟踪的配置文件
   */
  backup(message = 'Template sync backup'): boolean {
    try {
      // 只 stash 已跟踪文件的修改，不包括未跟踪文件
      execFileSync('git', ['stash', 'push', '-m', message], {
        stdio: this.verbose ? 'inherit' : 'ignore',
        timeout: 30_000
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
    const fs = require('fs');
    const gitDir = require('path').join(dir, '.git');
    fs.rmSync(gitDir, { recursive: true, force: true });
  }
}
