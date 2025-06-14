# Template Syncer

智能模板同步工具，让你的项目与模板仓库保持同步。

## ✨ 特性

- 🚀 **智能同步** - 自动检测并同步模板更新
- 📦 **智能合并** - 特别针对 `package.json` 的智能合并策略
- 🔄 **差异对比** - 使用 Git diff 显示文件变更
- 💾 **安全备份** - 操作前自动创建 Git 备份
- 🎯 **交互式操作** - 每个变更都需要用户确认

## 📦 安装

```bash
npm install -g template-syncer
```

## 🚀 使用方法

### 基本用法

```bash
# 交互式同步（会询问模板仓库）
template-sync

# 指定模板仓库
template-sync --repo https://github.com/antfu/vitesse-lite.git

# 详细模式
template-sync --verbose
```

### 初始化配置

```bash
template-sync --init
```

## 🧪 测试

```bash
# 创建 vitesse-lite 测试项目
npm test

# 然后在测试项目中修改文件，运行同步命令查看效果
```

## 📝 文件处理类型

- **merge** - 智能合并（主要用于 `package.json`）
- **diff** - 显示差异并让用户选择是否更新
- **overwrite** - 直接覆盖

## 🛡️ 安全性

- **Git 备份**: 操作前自动创建 stash 备份
- **交互确认**: 每个文件更改都需要用户确认
- **差异显示**: 清楚展示即将进行的更改

## 📄 许可证

MIT License
