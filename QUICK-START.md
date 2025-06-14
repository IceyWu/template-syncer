# 快速测试指南

## 🚀 快速开始

1. **创建测试项目**
   ```bash
   npm test
   ```

2. **进入测试项目**
   ```bash
   cd vitesse-test-project
   ```

3. **修改文件** (例如 package.json)
   - 添加自定义脚本
   - 修改依赖版本
   - 更改配置

4. **运行同步命令**
   ```bash
   node ../bin/template-sync.js --repo https://github.com/antfu/vitesse-lite.git
   ```

## 🎯 测试效果

- **智能合并**: package.json 会保留你的自定义内容，同时合并模板的新依赖
- **差异对比**: 其他文件会显示 Git 差异，让你选择是否更新
- **安全备份**: 所有操作前都会创建 Git 备份

## 💡 提示

- 所有操作都是交互式的，你可以选择是否应用更改
- 如果出现问题，可以使用 `git stash pop` 恢复
- 使用 `--verbose` 查看详细执行过程
