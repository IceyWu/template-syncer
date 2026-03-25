# Template Syncer

智能模板同步工具，让你的项目与模板仓库保持同步。

<a href="https://github.com/iceywu/template-syncer">
  <img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/iceywu/template-syncer?logo=github&color=%234d80f0">
</a>
<a href="https://www.npmjs.com/package/template-syncer">
  <img alt="npm" src="https://img.shields.io/npm/v/template-syncer?logo=npm&color=%234d80f0">
</a>
<a href="https://www.npmjs.com/package/template-syncer">
  <img alt="npm downloads" src="https://img.shields.io/npm/dw/template-syncer?logo=npm">
</a>

## 特性

- 🦀 **Rust 加速** - 核心文件扫描和差异比较由 Rust 原生模块驱动，并行处理，大型项目提速显著
- 🚀 **智能同步** - 自动检测并同步模板更新，支持四种运行模式
- 📦 **智能合并** - `package.json`、`tsconfig.json` 等配置文件深度合并，不覆盖你的自定义内容
- 🎯 **自动分类** - 基于 glob 的文件分类系统，变更一目了然
- 🌿 **多分支** - 支持从任意分支同步
- 💾 **安全备份** - 操作前自动 `git stash` 备份
- � **跨平台** - Windows / macOS / Linux

## 安装

```bash
pnpm add -g template-syncer
```

## 快速开始

无需安装，直接用 npx：

```bash
npx template-syncer --preview -r https://github.com/user/template.git
```

## 使用

```bash
syn              # 交互式同步（默认）
syn --init       # 初始化配置文件
syn --preview    # 预览差异，不修改任何文件
syn --batch      # 按优先级分组选择
syn --smart      # 智能推荐模式

syn -r <url>     # 指定模板仓库
syn -b <branch>  # 指定分支
syn -v           # 详细输出
```

## 配置文件

运行 `syn --init` 生成 `.template-sync.json`：

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
  }
}
```

### rules 选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `deleteOrphans` | boolean | `false` | 删除本地独有文件 |
| `deletePatterns` | string[] | `[]` | 要删除的文件 glob 模式 |
| `protectPatterns` | string[] | `[]` | 保护不被删除的文件 |
| `autoBackup` | boolean | `true` | 同步前自动 git stash |
| `defaultMergeStrategy` | string | `"overwrite"` | 默认合并策略 |

## 编程式使用

```typescript
import { TemplateSyncer } from 'template-syncer';

const syncer = new TemplateSyncer({
  repo: 'https://github.com/user/template.git',
  branch: 'main',
  ignore: ['*.local', 'secrets/**'],
  categories: [
    { match: '**/api/*.ts', category: 'API 模块', icon: '🔌', priority: 100 }
  ],
  mergers: {
    'config.json': 'smart',
    'README.md': 'skip'
  },
  rules: {
    deleteOrphans: true,
    protectPatterns: ['src/local/**']
  }
});

await syncer.sync();
```

### 合并策略

| 策略 | 说明 |
|------|------|
| `overwrite` | 直接覆盖（默认） |
| `skip` | 跳过 |
| `smart` | 深度合并（JSON） |

## License

[MIT](./LICENSE)
