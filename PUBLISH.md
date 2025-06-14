# 发布指南

## 发布前检查清单

### 1. 更新版本信息
在 `package.json` 中更新：
- `version` - 版本号
- `author` - 作者信息
- `repository` - 仓库地址
- `bugs` - Issues 地址
- `homepage` - 项目主页

### 2. 构建项目
```bash
npm run build
```

### 3. 运行测试
```bash
npm test
```

### 4. 测试 CLI 工具
```bash
node bin/template-sync.js --help
```

### 5. 检查包内容
```bash
npm pack --dry-run
```

### 6. 发布到 npm
```bash
# 首次发布
npm publish

# 后续更新
npm version patch  # 或 minor, major
npm publish
```

## 本地开发测试

### 全局安装本地版本
```bash
npm install -g .
```

### 测试全局命令
```bash
template-sync --help
```

### 卸载本地版本
```bash
npm uninstall -g template-syncer
```

## 配置文件示例

你可以创建一个 `.template-sync.json` 配置文件来自定义行为：

```json
{
  "templateRepo": "https://github.com/your/custom-template.git",
  "filesToProcess": [
    { "path": "package.json", "type": "merge" },
    { "path": "tsconfig.json", "type": "diff" },
    { "path": "vite.config.ts", "type": "diff" },
    { "path": ".gitignore", "type": "overwrite" }
  ]
}
```
