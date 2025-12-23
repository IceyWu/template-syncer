import * as path from 'path';
import { minimatch } from 'minimatch';
import type { CategoryRule, FileInfo } from '../types';

/**
 * 默认分类规则 (按优先级排序)
 */
const DEFAULT_RULES: CategoryRule[] = [
  // 包管理 - 锁文件
  { match: '**/package-lock.json', category: '包管理', icon: '🔒', priority: 100 },
  { match: '**/yarn.lock', category: '包管理', icon: '🧶', priority: 100 },
  { match: '**/pnpm-lock.yaml', category: '包管理', icon: '📦', priority: 100 },
  { match: '**/bun.lockb', category: '包管理', icon: '🥟', priority: 100 },
  { match: '**/Cargo.lock', category: '包管理', icon: '🦀', priority: 100 },
  { match: '**/go.sum', category: '包管理', icon: '🐹', priority: 100 },
  { match: '**/Gemfile.lock', category: '包管理', icon: '💎', priority: 100 },
  { match: '**/poetry.lock', category: '包管理', icon: '🐍', priority: 100 },
  { match: '**/Pipfile.lock', category: '包管理', icon: '🐍', priority: 100 },
  { match: '**/composer.lock', category: '包管理', icon: '🐘', priority: 100 },

  // 项目配置
  { match: '**/package.json', category: '项目配置', icon: '📦', priority: 90 },
  { match: '**/Cargo.toml', category: '项目配置', icon: '🦀', priority: 90 },
  { match: '**/go.mod', category: '项目配置', icon: '🐹', priority: 90 },
  { match: '**/pyproject.toml', category: '项目配置', icon: '🐍', priority: 90 },
  { match: '**/composer.json', category: '项目配置', icon: '🐘', priority: 90 },

  // TypeScript/JavaScript 配置
  { match: '**/tsconfig*.json', category: 'TypeScript', icon: '🔷', priority: 85 },
  { match: '**/jsconfig.json', category: 'JavaScript', icon: '🟨', priority: 85 },

  // 构建工具
  { match: '**/vite.config.*', category: '构建配置', icon: '⚡', priority: 80 },
  { match: '**/webpack.config.*', category: '构建配置', icon: '📦', priority: 80 },
  { match: '**/rollup.config.*', category: '构建配置', icon: '🎯', priority: 80 },
  { match: '**/esbuild.config.*', category: '构建配置', icon: '⚡', priority: 80 },
  { match: '**/turbo.json', category: '构建配置', icon: '🚀', priority: 80 },

  // 框架配置
  { match: '**/nuxt.config.*', category: '框架配置', icon: '💚', priority: 80 },
  { match: '**/next.config.*', category: '框架配置', icon: '⚫', priority: 80 },
  { match: '**/astro.config.*', category: '框架配置', icon: '🚀', priority: 80 },
  { match: '**/svelte.config.*', category: '框架配置', icon: '🔥', priority: 80 },
  { match: '**/angular.json', category: '框架配置', icon: '🅰️', priority: 80 },

  // 代码质量
  { match: '**/.eslintrc*', category: '代码质量', icon: '🔍', priority: 75 },
  { match: '**/eslint.config.*', category: '代码质量', icon: '🔍', priority: 75 },
  { match: '**/.prettierrc*', category: '代码格式化', icon: '💄', priority: 75 },
  { match: '**/prettier.config.*', category: '代码格式化', icon: '💄', priority: 75 },
  { match: '**/.stylelintrc*', category: '样式检查', icon: '🎨', priority: 75 },
  { match: '**/biome.json', category: '代码质量', icon: '🌿', priority: 75 },

  // 测试配置
  { match: '**/jest.config.*', category: '测试配置', icon: '🃏', priority: 75 },
  { match: '**/vitest.config.*', category: '测试配置', icon: '🧪', priority: 75 },
  { match: '**/cypress.config.*', category: '测试配置', icon: '🌀', priority: 75 },
  { match: '**/playwright.config.*', category: '测试配置', icon: '🎭', priority: 75 },

  // 样式配置
  { match: '**/tailwind.config.*', category: '样式配置', icon: '🌊', priority: 75 },
  { match: '**/unocss.config.*', category: '样式配置', icon: '🎨', priority: 75 },
  { match: '**/postcss.config.*', category: '样式配置', icon: '📮', priority: 75 },

  // 容器化
  { match: '**/Dockerfile*', category: '容器化', icon: '🐳', priority: 70 },
  { match: '**/.dockerignore', category: '容器化', icon: '🐳', priority: 70 },
  { match: '**/docker-compose*.y*ml', category: '容器化', icon: '🐳', priority: 70 },
  { match: '**/compose*.y*ml', category: '容器化', icon: '🐳', priority: 70 },

  // CI/CD
  { match: '**/.github/workflows/*.y*ml', category: 'CI/CD', icon: '🔄', priority: 70 },
  { match: '**/.gitlab-ci.yml', category: 'CI/CD', icon: '🦊', priority: 70 },
  { match: '**/Jenkinsfile', category: 'CI/CD', icon: '🔧', priority: 70 },

  // Xcode/iOS
  { match: '**/*.xcodeproj/**', category: 'Xcode 项目', icon: '🍎', priority: 65 },
  { match: '**/*.xcworkspace/**', category: 'Xcode 工作区', icon: '🍎', priority: 65 },
  { match: '**/*.xcassets/**', category: '资源文件', icon: '🎨', priority: 60 },
  { match: '**/Info.plist', category: 'iOS 配置', icon: '🍎', priority: 60 },
  { match: '**/*.storyboard', category: 'iOS UI', icon: '📱', priority: 55 },
  { match: '**/*.xib', category: 'iOS UI', icon: '📱', priority: 55 },

  // 版本控制
  { match: '**/.gitignore', category: '版本控制', icon: '📋', priority: 65 },
  { match: '**/.gitattributes', category: '版本控制', icon: '📋', priority: 65 },

  // 编辑器配置
  { match: '**/.editorconfig', category: '编辑器配置', icon: '✏️', priority: 65 },
  { match: '**/.vscode/**', category: 'VS Code', icon: '💙', priority: 65 },

  // 环境配置
  { match: '**/.nvmrc', category: '环境配置', icon: '🔧', priority: 60 },
  { match: '**/.node-version', category: '环境配置', icon: '🔧', priority: 60 },
  { match: '**/.tool-versions', category: '环境配置', icon: '🔧', priority: 60 },
  { match: '**/.env*', category: '环境配置', icon: '🌍', priority: 60 },

  // 部署配置
  { match: '**/vercel.json', category: '部署配置', icon: '▲', priority: 60 },
  { match: '**/netlify.toml', category: '部署配置', icon: '🌐', priority: 60 },
  { match: '**/fly.toml', category: '部署配置', icon: '🪁', priority: 60 },

  // 文档
  { match: '**/README*', category: '文档', icon: '📖', priority: 50 },
  { match: '**/CHANGELOG*', category: '文档', icon: '📋', priority: 50 },
  { match: '**/LICENSE*', category: '许可证', icon: '📄', priority: 50 },
  { match: '**/CONTRIBUTING*', category: '文档', icon: '🤝', priority: 50 },
  { match: '**/*.md', category: '文档', icon: '📝', priority: 40 },

  // 按扩展名分类 (低优先级)
  { match: '**/*.vue', category: 'Vue 组件', icon: '💚', priority: 30 },
  { match: '**/*.tsx', category: 'React 组件', icon: '⚛️', priority: 30 },
  { match: '**/*.jsx', category: 'React 组件', icon: '⚛️', priority: 30 },
  { match: '**/*.svelte', category: 'Svelte 组件', icon: '🔥', priority: 30 },
  { match: '**/*.ts', category: 'TypeScript', icon: '🔷', priority: 20 },
  { match: '**/*.js', category: 'JavaScript', icon: '🟨', priority: 20 },
  { match: '**/*.mjs', category: 'JavaScript', icon: '🟨', priority: 20 },
  { match: '**/*.cjs', category: 'JavaScript', icon: '🟨', priority: 20 },
  { match: '**/*.py', category: 'Python', icon: '🐍', priority: 20 },
  { match: '**/*.go', category: 'Go', icon: '🐹', priority: 20 },
  { match: '**/*.rs', category: 'Rust', icon: '🦀', priority: 20 },
  { match: '**/*.java', category: 'Java', icon: '☕', priority: 20 },
  { match: '**/*.rb', category: 'Ruby', icon: '💎', priority: 20 },
  { match: '**/*.php', category: 'PHP', icon: '🐘', priority: 20 },
  { match: '**/*.swift', category: 'Swift', icon: '🍎', priority: 20 },
  { match: '**/*.m', category: 'Objective-C', icon: '🍎', priority: 20 },
  { match: '**/*.mm', category: 'Objective-C++', icon: '🍎', priority: 20 },
  { match: '**/*.h', category: 'Header', icon: '📋', priority: 20 },
  { match: '**/*.css', category: '样式文件', icon: '🎨', priority: 20 },
  { match: '**/*.scss', category: '样式文件', icon: '🎨', priority: 20 },
  { match: '**/*.less', category: '样式文件', icon: '🎨', priority: 20 },
  { match: '**/*.html', category: 'HTML', icon: '🌐', priority: 20 },
  { match: '**/*.json', category: 'JSON', icon: '📊', priority: 10 },
  { match: '**/*.y*ml', category: 'YAML', icon: '📄', priority: 10 },
  { match: '**/*.toml', category: 'TOML', icon: '📄', priority: 10 },
  { match: '**/*.xml', category: 'XML', icon: '📄', priority: 10 },
  { match: '**/*.sh', category: 'Shell 脚本', icon: '🐚', priority: 10 },
  { match: '**/*.bat', category: 'Windows 脚本', icon: '🪟', priority: 10 },
  { match: '**/*.ps1', category: 'PowerShell', icon: '💙', priority: 10 },
];

/**
 * 文件分类器
 */
export class Categorizer {
  private rules: CategoryRule[];

  constructor(customRules: CategoryRule[] = []) {
    // 合并规则并按优先级排序
    this.rules = [...customRules, ...DEFAULT_RULES]
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * 获取文件分类
   */
  categorize(filePath: string): { category: string; icon: string } {
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    for (const rule of this.rules) {
      if (minimatch(normalizedPath, rule.match, { dot: true })) {
        return { category: rule.category, icon: rule.icon };
      }
    }

    // 默认分类
    return this.getDefaultCategory(filePath);
  }

  /**
   * 获取默认分类
   */
  private getDefaultCategory(filePath: string): { category: string; icon: string } {
    const fileName = path.basename(filePath);
    
    // 隐藏文件
    if (fileName.startsWith('.')) {
      return { category: '配置文件', icon: '⚙️' };
    }

    return { category: '其他文件', icon: '📄' };
  }

  /**
   * 添加自定义规则
   */
  addRule(rule: CategoryRule): void {
    this.rules.unshift(rule);
    this.rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }
}
