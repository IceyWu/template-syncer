import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * 跨平台工具类
 */
export const platform = {
  /** 是否为 Windows */
  isWindows: process.platform === 'win32',

  /**
   * 安全删除目录
   */
  removeDir(dir: string): void {
    if (!fs.existsSync(dir)) return;
    
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // 回退到系统命令
      const cmd = this.isWindows 
        ? `rmdir /s /q "${dir}"` 
        : `rm -rf "${dir}"`;
      try {
        execSync(cmd, { stdio: 'ignore' });
      } catch {
        // 忽略错误
      }
    }
  },

  /**
   * 安全删除文件
   */
  removeFile(filePath: string): void {
    if (!fs.existsSync(filePath)) return;
    
    try {
      fs.unlinkSync(filePath);
    } catch {
      // 回退到系统命令
      const cmd = this.isWindows 
        ? `del /f /q "${filePath}"` 
        : `rm -f "${filePath}"`;
      try {
        execSync(cmd, { stdio: 'ignore' });
      } catch {
        // 忽略错误
      }
    }
  },

  /**
   * 确保目录存在
   */
  ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  },

  /**
   * 复制文件
   */
  copyFile(src: string, dest: string): void {
    this.ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
  },

  /**
   * 读取文件内容
   */
  readFile(filePath: string): string {
    return fs.readFileSync(filePath, 'utf8');
  },

  /**
   * 写入文件内容
   */
  writeFile(filePath: string, content: string): void {
    this.ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, content, 'utf8');
  },

  /**
   * 读取 JSON 文件
   */
  readJson<T = unknown>(filePath: string): T | null {
    try {
      return JSON.parse(this.readFile(filePath));
    } catch {
      return null;
    }
  },

  /**
   * 写入 JSON 文件
   */
  writeJson(filePath: string, data: unknown): void {
    this.writeFile(filePath, JSON.stringify(data, null, 2));
  },

  /**
   * 检测文件是否为二进制
   */
  isBinary(filePath: string): boolean {
    // 常见二进制扩展名
    const binaryExts = new Set([
      '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.avif', '.svg',
      '.mp3', '.mp4', '.wav', '.ogg', '.webm', '.avi', '.mov', '.flac',
      '.zip', '.tar', '.gz', '.rar', '.7z', '.bz2', '.xz',
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.exe', '.dll', '.so', '.dylib', '.bin', '.dat',
      '.woff', '.woff2', '.ttf', '.otf', '.eot',
      '.sqlite', '.db', '.lockb'
    ]);

    const ext = path.extname(filePath).toLowerCase();
    if (binaryExts.has(ext)) return true;

    // 读取文件头检测 null 字节
    try {
      const fd = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(512);
      const bytesRead = fs.readSync(fd, buffer, 0, 512, 0);
      fs.closeSync(fd);

      for (let i = 0; i < bytesRead; i++) {
        if (buffer[i] === 0) return true;
      }
    } catch {
      // 默认为文本
    }

    return false;
  }
};
