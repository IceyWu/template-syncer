const { existsSync } = require('fs')
const { join } = require('path')

// 按平台加载对应的 .node 文件
const platforms = {
  'win32-x64': 'index.win32-x64-msvc.node',
  'darwin-x64': 'index.darwin-x64.node',
  'darwin-arm64': 'index.darwin-arm64.node',
  'linux-x64': 'index.linux-x64-gnu.node',
  'linux-arm64': 'index.linux-arm64-gnu.node',
}

const key = `${process.platform === 'win32' ? 'win32' : process.platform}-${process.arch}`
const file = platforms[key]

if (!file) {
  throw new Error(`Unsupported platform: ${key}`)
}

const nodePath = join(__dirname, file)
if (!existsSync(nodePath)) {
  throw new Error(`Native module not found: ${nodePath}\nRun: pnpm build:native`)
}

module.exports = require(nodePath)
