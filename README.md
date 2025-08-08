# Electron 电子书阅读器

<div align="center">

![Electron Ebook Reader](assets/icon.png)

**一款现代化的跨平台电子书阅读器**

[![Build Status](https://github.com/your-repo/electron-ebook-reader/workflows/Build/badge.svg)](https://github.com/your-repo/electron-ebook-reader/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/github/v/release/your-repo/electron-ebook-reader)](https://github.com/your-repo/electron-ebook-reader/releases)
[![Downloads](https://img.shields.io/github/downloads/your-repo/electron-ebook-reader/total)](https://github.com/your-repo/electron-ebook-reader/releases)

[English](README_EN.md) | 简体中文

</div>

## ✨ 特性

- 📚 **多格式支持** - 支持 EPUB、PDF、MOBI、TXT 格式
- 🎨 **美观界面** - 现代化设计，支持浅色/深色主题
- 📖 **智能阅读** - 自动保存阅读进度，支持目录导航
- 🔍 **划词翻译** - 即时翻译功能，支持生词本管理
- ⚙️ **个性化设置** - 字体、字号、行间距等完全自定义
- 🔍 **强大搜索** - 快速查找书籍和内容
- 📱 **响应式设计** - 适配不同屏幕尺寸
- 🌍 **跨平台** - 支持 Windows、macOS、Linux

## 🚀 快速开始

### 下载安装

访问 [Releases 页面](https://github.com/your-repo/electron-ebook-reader/releases) 下载最新版本：

- **Windows**: `electron-ebook-reader-setup.exe`
- **macOS**: `electron-ebook-reader.dmg`
- **Linux**: `electron-ebook-reader.AppImage`

### 系统要求

- **Windows**: Windows 10 或更高版本
- **macOS**: macOS 10.14 或更高版本  
- **Linux**: Ubuntu 18.04 或其他现代 Linux 发行版

## 📖 使用指南

### 基本操作

1. **导入书籍**: 点击"导入书籍"按钮，选择电子书文件
2. **开始阅读**: 在书架上点击书籍封面开始阅读
3. **翻页操作**: 使用鼠标滚轮、键盘方向键或点击按钮翻页
4. **划词翻译**: 选中文字即可查看翻译，点击"加入生词本"收藏

### 高级功能

- **目录导航**: 点击左侧目录图标快速跳转章节
- **阅读设置**: 自定义字体、字号、主题等
- **生词本管理**: 查看、编辑、导出收藏的词汇
- **搜索功能**: 在书架中快速查找书籍

详细使用说明请参考 [用户指南](docs/USER_GUIDE.md)。

## 🛠️ 开发

### 环境要求

- Node.js 18.x 或更高版本
- npm 9.x 或更高版本
- Git

### 开发设置

1. **克隆仓库**
   ```bash
   git clone https://github.com/your-repo/electron-ebook-reader.git
   cd electron-ebook-reader
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **重建原生模块**
   ```bash
   npm rebuild better-sqlite3
   ```

4. **启动开发服务器**
   ```bash
   npm run dev
   ```

### 可用脚本

```bash
# 开发
npm run dev              # 启动开发服务器
npm run dev:main         # 仅启动主进程开发
npm run dev:renderer     # 仅启动渲染进程开发

# 构建
npm run build            # 构建生产版本
npm run build:main       # 构建主进程
npm run build:renderer   # 构建渲染进程

# 测试
npm test                 # 运行所有测试
npm run test:unit        # 运行单元测试
npm run test:e2e         # 运行端到端测试
npm run test:coverage    # 生成覆盖率报告

# 打包
npm run dist             # 打包当前平台
npm run dist:win         # 打包 Windows 版本
npm run dist:mac         # 打包 macOS 版本
npm run dist:linux       # 打包 Linux 版本
npm run dist:all         # 打包所有平台

# 代码质量
npm run lint             # 代码检查
npm run lint:fix         # 自动修复代码问题
```

### 项目结构

```
electron-ebook-reader/
├── src/
│   ├── main/           # 主进程代码
│   ├── renderer/       # 渲染进程代码 (React)
│   ├── shared/         # 共享代码
│   └── __tests__/      # 测试文件
├── build/              # 构建配置
├── assets/             # 静态资源
├── docs/               # 文档
└── scripts/            # 构建脚本
```

详细开发指南请参考 [开发文档](docs/DEVELOPMENT.md)。

## 🧪 测试

项目包含完整的测试套件：

- **单元测试**: Jest + React Testing Library
- **集成测试**: 测试组件间交互和 IPC 通信
- **端到端测试**: Playwright 自动化测试

```bash
# 运行所有测试
npm test

# 运行特定类型的测试
npm run test:unit
npm run test:integration
npm run test:e2e

# 生成覆盖率报告
npm run test:coverage
```

## 📦 构建和部署

### 本地构建

```bash
# 构建应用
npm run build

# 打包应用
npm run dist
```

### 自动化部署

项目使用 GitHub Actions 进行自动化构建和部署：

- 推送标签时自动构建所有平台版本
- 自动上传到 GitHub Releases
- 自动生成更新日志

## 🤝 贡献

我们欢迎所有形式的贡献！

### 如何贡献

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 贡献指南

- 遵循现有的代码风格
- 为新功能添加测试
- 更新相关文档
- 确保所有测试通过

详细贡献指南请参考 [开发文档](docs/DEVELOPMENT.md)。

## 📋 路线图

### v1.1.0 (计划中)
- [ ] 云同步功能
- [ ] 更多电子书格式支持 (AZW, FB2)
- [ ] 笔记和标注功能
- [ ] 阅读统计

### v1.2.0 (计划中)
- [ ] 插件系统
- [ ] 自定义主题
- [ ] 语音朗读
- [ ] 移动端应用

## 🐛 问题报告

如果您发现了 bug 或有功能建议，请：

1. 查看 [已知问题](https://github.com/your-repo/electron-ebook-reader/issues)
2. 如果问题不存在，[创建新的 Issue](https://github.com/your-repo/electron-ebook-reader/issues/new)
3. 提供详细的问题描述和重现步骤

## 📄 许可证

本项目基于 [MIT 许可证](LICENSE) 开源。

## 🙏 致谢

感谢以下开源项目：

- [Electron](https://electronjs.org/) - 跨平台桌面应用框架
- [React](https://reactjs.org/) - 用户界面库
- [epub.js](https://github.com/futurepress/epub.js/) - EPUB 解析库
- [PDF.js](https://mozilla.github.io/pdf.js/) - PDF 渲染库
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - SQLite 数据库
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架

## 📞 联系我们

- **项目主页**: [GitHub](https://github.com/your-repo/electron-ebook-reader)
- **问题反馈**: [Issues](https://github.com/your-repo/electron-ebook-reader/issues)
- **讨论交流**: [Discussions](https://github.com/your-repo/electron-ebook-reader/discussions)
- **邮件联系**: [support@example.com](mailto:support@example.com)

---

<div align="center">

**如果这个项目对您有帮助，请给我们一个 ⭐️**

Made with ❤️ by the Electron Ebook Reader Team

</div>