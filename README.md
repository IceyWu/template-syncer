# Template Syncer

智能模板同步工具，让你的项目与模板仓库保持同步。

<a href="https://github.com/iceywu/template-syncer">
  <img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/iceywu/template-syncer?logo=github&color=%234d80f0&link=https%3A%2F%2Fgithub.com%2iceywu%2Ftemplate-syncer">
</a>
<a href="https://www.npmjs.com/package/template-syncer">
  <img alt="npm" src="https://img.shields.io/npm/v/template-syncer?logo=npm&color=%234d80f0&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Ftemplate-syncer">
</a>
<a href="https://www.npmjs.com/package/template-syncer">
  <img alt="npm" src="https://img.shields.io/npm/dw/template-syncer?logo=npm&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Ftemplate-syncer">
</a>

## ✨ 特性

- 🚀 **智能同步** - 自动检测并同步模板更新
- 🌍 **跨平台** - 完美支持 Windows/macOS/Linux
- 📦 **智能合并** - package.json 等配置文件智能合并
- 🎯 **自动分类** - 基于 glob 模式的智能文件分类
- 🔌 **可扩展** - 支持自定义分类规则和合并策略
- 💾 **安全备份** - 操作前自动创建 Git 备份
- 🌿 **多分支** - 支持从任意分支同步

## 📦 安装

```bash
pnpm add -g template-syncer
# 或
npm install -g template-syncer
```

## ⚡ 快速使用 (npx)

无需安装，直接使用：

```bash
# 交互式同步
npx template-syncer

# 指定模板仓库
npx template-syncer -r https://github.com/user/template.git

# 指定分支
npx template-syncer -r https://github.com/user/template.git -b dev

# 初始化配置
npx template-syncer --init

# 预览差异
npx template-syncer --preview
```

## 🚀 使用方法

### 基本用法

```bash
# 交互式同步
syn

# 指定模板仓库
syn -r https://github.com/user/template.git

# 指定分支
syn -r https://github.com/user/template.git -b dev

# 详细输出
syn -v
```

### 运行模式

```bash
syn              # 交互式同步 (默认)
syn --init       # 初始化配置
syn --batch      # 批量处理模式
syn --preview    # 预览差异
syn --smart      # 智能推荐模式
```

### 配置文件

运行 `syn --init` 创建配置文件 `.template-sync.json`:

```json
{
  "repo": "https://github.com/user/template.git",
  "branch": "main",
  "ignore": [".env.local"],
  "rules": {
    "deleteOrphans": false,
    "deletePatterns": ["src/deprecated/**"],
    "protectPatterns": ["src/local/**", "*.local.*"],
    "autoBackup": true,
    "defaultMergeStrategy": "overwrite"
  },
  "lastSync": "2024-01-01T00:00:00.000Z"
}
```

### 同步规则 (rules)

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `deleteOrphans` | boolean | `false` | 是否删除本地独有文件 |
| `deletePatterns` | string[] | `[]` | 要删除的文件模式 (glob) |
| `protectPatterns` | string[] | `[]` | 保护不被删除的文件模式 |
| `autoBackup` | boolean | `true` | 同步前自动备份 |
| `defaultMergeStrategy` | string | `"overwrite"` | 默认合并策略 |

**示例：删除本地独有的 Swift 文件**

```json
{
  "rules": {
    "deleteOrphans": true,
    "deletePatterns": ["**/*.swift"],
    "protectPatterns": ["src/local/**"]
  }
}
```
```

## 🔧 高级用法

### 编程式使用

```typescript
import { TemplateSyncer } from 'template-syncer';

const syncer = new TemplateSyncer({
  repo: 'https://github.com/user/template.git',
  branch: 'main',
  verbose: true,
  // 自定义忽略模式
  ignore: ['*.local', 'secrets/**'],
  // 自定义分类规则
  categories: [
    { match: '**/custom/*.ts', category: '自定义模块', icon: '🎯', priority: 100 }
  ],
  // 自定义合并策略
  mergers: {
    'config.json': 'smart',
    'README.md': 'skip'
  },
  // 同步规则
  rules: {
    deleteOrphans: true,
    deletePatterns: ['src/deprecated/**'],
    protectPatterns: ['src/local/**'],
    autoBackup: true
  }
});

await syncer.sync();
```

### 合并策略

| 策略 | 说明 |
|------|------|
| `overwrite` | 直接覆盖 (默认) |
| `skip` | 跳过不处理 |
| `smart` | 智能合并 (JSON 文件) |
| `ask` | 询问用户 |

### 自定义分类规则

```typescript
const syncer = new TemplateSyncer({
  categories: [
    // 高优先级规则
    { match: '**/api/*.ts', category: 'API 模块', icon: '🔌', priority: 100 },
    // 低优先级规则
    { match: '**/*.ts', category: 'TypeScript', icon: '🔷', priority: 10 }
  ]
});
```

## 📁 支持的文件类型

工具会自动识别并分类各种文件：

- **项目配置**: package.json, Cargo.toml, go.mod 等
- **构建工具**: vite.config.*, webpack.config.* 等
- **代码质量**: .eslintrc*, .prettierrc* 等
- **框架配置**: nuxt.config.*, next.config.* 等
- **容器化**: Dockerfile, docker-compose.yml 等
- **CI/CD**: .github/workflows/*, .gitlab-ci.yml 等
- **各种编程语言**: .ts, .js, .py, .go, .rs, .java 等

## 🛡️ 安全性

- **Git 备份**: 操作前自动创建 stash 备份
- **交互确认**: 每次操作都需要用户确认
- **差异预览**: 可以先预览再决定是否应用

## 📄 许可证

[MIT License](./LICENSE)
