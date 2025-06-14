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
<a href="https://www.npmjs.com/package/template-syncer">
  <img src="https://img.shields.io/npm/dt/template-syncer?style=flat-square" alt="downloads">
</a>

## ✨ 特性

- 🚀 **智能同步** - 自动检测并同步模板更新
- 🎇 **自动扫描** - 智能扫描当前目录的所有可同步文件
- ✅ **批量选择** - 支持全选/反选，批量处理文件
- 🔍 **智能对比** - 先对比差异，再选择性更新
- 📦 **智能合并** - 特别针对 `package.json` 的智能合并策略
- 🔄 **差异对比** - 使用 Git diff 显示文件变更
- 💾 **安全备份** - 操作前自动创建 Git 备份
- 🎯 **两阶段确认** - 先选择文件，再选择更新项

## 📦 安装

```bash
npm install -g template-syncer
```

## 🚀 使用方法

### 基本用法

```bash
# 交互式同步（会询问模板仓库）
syn

# 指定模板仓库
syn --repo https://github.com/IceyWu/cloud-template.git

# 详细模式
syn --verbose
```

### 同步流程

1. **文件扫描** - 自动扫描当前目录下的所有支持文件
2. **文件选择** - 默认全选，可以自定义选择要检查的文件
3. **差异对比** - 与模板进行对比，找出有变化的文件
4. **变更选择** - 选择要更新的文件，可以预览差异
5. **批量更新** - 一次性更新所有选中的文件

### 支持的文件类型

- **配置文件**: `.json`, `.yml`, `.yaml`, `.xml`
- **代码文件**: `.js`, `.ts`, `.jsx`, `.tsx`
- **样式文件**: `.css`, `.scss`, `.less`
- **文档文件**: `.md`, `.txt`
- **配置文件**: `.gitignore`, `.npmrc`, `.eslintrc`, `.prettierrc` 等
- **容器文件**: `Dockerfile`, `.dockerignore`
- **构建文件**: `Makefile`, 各种配置文件

### 初始化配置

```bash
syn --init
```


## 🛡️ 安全性

- **Git 备份**: 操作前自动创建 stash 备份
- **交互确认**: 每个文件更改都需要用户确认
- **差异显示**: 清楚展示即将进行的更改

## 📄 许可证

[MIT License](./LICENSE)