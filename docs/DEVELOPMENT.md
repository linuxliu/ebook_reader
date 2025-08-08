# Electron 电子书阅读器 - 开发指南

## 目录
- [项目概述](#项目概述)
- [开发环境设置](#开发环境设置)
- [项目结构](#项目结构)
- [开发流程](#开发流程)
- [测试指南](#测试指南)
- [构建和部署](#构建和部署)
- [贡献指南](#贡献指南)

## 项目概述

### 技术栈
- **框架**: Electron 27.x
- **前端**: React 18 + TypeScript
- **样式**: Tailwind CSS
- **状态管理**: React Context + useReducer
- **数据库**: SQLite (better-sqlite3)
- **构建工具**: Webpack 5
- **测试**: Jest + React Testing Library + Playwright
- **代码质量**: ESLint + TypeScript

### 架构设计
```
┌─────────────────┐    ┌─────────────────┐
│   主进程 (Main)   │    │  渲染进程 (Renderer) │
│                 │    │                 │
│ • 窗口管理       │    │ • React 应用     │
│ • 文件系统       │◄──►│ • 用户界面       │
│ • 数据库操作     │    │ • 状态管理       │
│ • IPC 处理      │    │ • 组件逻辑       │
└─────────────────┘    └─────────────────┘
```

## 开发环境设置

### 系统要求
- Node.js 18.x 或更高版本
- npm 9.x 或更高版本
- Git
- 支持的操作系统：Windows 10+、macOS 10.14+、Ubuntu 18.04+

### 安装步骤

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

### 开发工具推荐
- **IDE**: Visual Studio Code
- **扩展**:
  - TypeScript and JavaScript Language Features
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - Jest Runner

## 项目结构

```
electron-ebook-reader/
├── src/                          # 源代码
│   ├── main/                     # 主进程代码
│   │   ├── main.ts              # 主进程入口
│   │   ├── preload.ts           # 预加载脚本
│   │   ├── ipc/                 # IPC 处理器
│   │   └── services/            # 主进程服务
│   │       ├── DatabaseService.ts
│   │       ├── FileSystemService.ts
│   │       ├── CacheService.ts
│   │       └── parsers/         # 电子书解析器
│   ├── renderer/                # 渲染进程代码
│   │   ├── App.tsx             # 应用根组件
│   │   ├── index.tsx           # 渲染进程入口
│   │   ├── components/         # React 组件
│   │   │   ├── Bookshelf/      # 书架相关组件
│   │   │   ├── Reader/         # 阅读器组件
│   │   │   ├── Settings/       # 设置组件
│   │   │   ├── Vocabulary/     # 生词本组件
│   │   │   └── common/         # 通用组件
│   │   ├── hooks/              # 自定义 Hooks
│   │   ├── services/           # 渲染进程服务
│   │   ├── store/              # 状态管理
│   │   ├── utils/              # 工具函数
│   │   └── styles/             # 样式文件
│   ├── shared/                  # 共享代码
│   │   └── types/              # TypeScript 类型定义
│   └── __tests__/              # 测试文件
│       ├── unit/               # 单元测试
│       ├── integration/        # 集成测试
│       └── e2e/                # 端到端测试
├── build/                       # 构建配置
├── assets/                      # 静态资源
├── docs/                        # 文档
├── scripts/                     # 构建脚本
└── dist/                        # 构建输出
```

## 开发流程

### 代码规范

#### TypeScript 规范
- 使用严格的 TypeScript 配置
- 为所有函数和变量提供类型注解
- 使用接口定义数据结构
- 避免使用 `any` 类型

```typescript
// 好的示例
interface BookMetadata {
  id: string;
  title: string;
  author: string;
  format: 'epub' | 'pdf' | 'mobi' | 'txt';
}

function processBook(book: BookMetadata): Promise<void> {
  // 实现逻辑
}

// 避免的示例
function processBook(book: any) {
  // 缺少类型信息
}
```

#### React 组件规范
- 使用函数组件和 Hooks
- 组件名使用 PascalCase
- Props 接口以 Props 结尾
- 使用 React.memo 优化性能

```typescript
interface BookCardProps {
  book: BookMetadata;
  onSelect: (book: BookMetadata) => void;
}

export const BookCard = React.memo<BookCardProps>(({ book, onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect(book);
  }, [book, onSelect]);

  return (
    <div onClick={handleClick}>
      {/* 组件内容 */}
    </div>
  );
});
```

#### 样式规范
- 使用 Tailwind CSS 类名
- 避免内联样式
- 使用语义化的类名组合
- 响应式设计优先

```tsx
// 好的示例
<div className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow">
  <img className="w-32 h-48 object-cover rounded" src={book.cover} alt={book.title} />
  <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white truncate">{book.title}</h3>
</div>
```

### Git 工作流

#### 分支策略
- `main`: 主分支，包含稳定的生产代码
- `develop`: 开发分支，集成最新功能
- `feature/*`: 功能分支，开发新功能
- `bugfix/*`: 修复分支，修复 bug
- `release/*`: 发布分支，准备发布版本

#### 提交规范
使用 Conventional Commits 规范：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

类型说明：
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

示例：
```
feat(reader): add text selection and translation feature

- Implement text selection detection
- Add translation popup component
- Integrate with translation API
- Add vocabulary management

Closes #123
```

### 开发工作流

1. **创建功能分支**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **开发和测试**
   ```bash
   # 启动开发服务器
   npm run dev
   
   # 运行测试
   npm test
   
   # 代码检查
   npm run lint
   ```

3. **提交代码**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

4. **推送和创建 PR**
   ```bash
   git push origin feature/new-feature
   # 在 GitHub 上创建 Pull Request
   ```

## 测试指南

### 测试策略

#### 单元测试
- 测试独立的函数和组件
- 使用 Jest 和 React Testing Library
- 覆盖率目标：80% 以上

```typescript
// 组件测试示例
import { render, screen, fireEvent } from '@testing-library/react';
import { BookCard } from '../BookCard';

describe('BookCard', () => {
  const mockBook = {
    id: '1',
    title: 'Test Book',
    author: 'Test Author',
    format: 'epub' as const
  };

  it('should render book information', () => {
    const onSelect = jest.fn();
    render(<BookCard book={mockBook} onSelect={onSelect} />);
    
    expect(screen.getByText('Test Book')).toBeInTheDocument();
    expect(screen.getByText('Test Author')).toBeInTheDocument();
  });

  it('should call onSelect when clicked', () => {
    const onSelect = jest.fn();
    render(<BookCard book={mockBook} onSelect={onSelect} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith(mockBook);
  });
});
```

#### 集成测试
- 测试组件间的交互
- 测试 IPC 通信
- 测试数据库操作

```typescript
// IPC 集成测试示例
import { IPCHandlers } from '../ipc/IPCHandlers';
import { DatabaseService } from '../services/DatabaseService';

describe('IPC Integration', () => {
  let ipcHandlers: IPCHandlers;
  let dbService: DatabaseService;

  beforeEach(() => {
    dbService = new DatabaseService(':memory:');
    ipcHandlers = new IPCHandlers(dbService);
  });

  it('should handle book import through IPC', async () => {
    const mockFilePath = '/path/to/book.epub';
    const result = await ipcHandlers.handleImportBook(mockFilePath);
    
    expect(result).toHaveProperty('id');
    expect(result.title).toBeDefined();
  });
});
```

#### E2E 测试
- 使用 Playwright 测试完整用户流程
- 测试跨平台兼容性

```typescript
// E2E 测试示例
import { test, expect } from '@playwright/test';

test('complete reading workflow', async ({ page }) => {
  // 启动应用
  await page.goto('/');
  
  // 导入书籍
  await page.click('[data-testid="import-button"]');
  // ... 文件选择逻辑
  
  // 验证书籍出现在书架
  await expect(page.locator('[data-testid="book-card"]')).toBeVisible();
  
  // 打开书籍
  await page.click('[data-testid="book-card"]');
  
  // 验证阅读器界面
  await expect(page.locator('[data-testid="reader-content"]')).toBeVisible();
});
```

### 运行测试

```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行 E2E 测试
npm run test:e2e

# 生成覆盖率报告
npm run test:coverage

# 监视模式
npm run test:watch
```

## 构建和部署

### 开发构建
```bash
# 构建开发版本
npm run build

# 启动构建后的应用
npm start
```

### 生产构建
```bash
# 构建所有平台
npm run dist:all

# 构建特定平台
npm run dist:win    # Windows
npm run dist:mac    # macOS
npm run dist:linux  # Linux
```

### 发布流程

1. **版本更新**
   ```bash
   npm version patch|minor|major
   ```

2. **构建发布版本**
   ```bash
   npm run build
   npm run dist:all
   ```

3. **创建发布标签**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

4. **上传到 GitHub Releases**
   - 构建产物会自动上传到 GitHub Releases
   - 编写发布说明
   - 标记为预发布或正式发布

### 自动化部署

项目使用 GitHub Actions 进行 CI/CD：

```yaml
# .github/workflows/build-and-release.yml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm run build
      - run: npm run dist
      
      - uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.os }}-build
          path: dist/
```

## 贡献指南

### 如何贡献

1. **Fork 仓库**
2. **创建功能分支**
3. **实现功能并添加测试**
4. **确保所有测试通过**
5. **提交 Pull Request**

### Pull Request 检查清单

- [ ] 代码遵循项目规范
- [ ] 添加了适当的测试
- [ ] 所有测试通过
- [ ] 更新了相关文档
- [ ] 提交信息符合规范
- [ ] 没有引入破坏性变更（或已说明）

### 代码审查标准

- **功能性**: 代码是否实现了预期功能
- **可读性**: 代码是否清晰易懂
- **性能**: 是否有性能问题
- **安全性**: 是否存在安全隐患
- **测试**: 测试覆盖是否充分
- **文档**: 是否需要更新文档

### 问题报告

使用 GitHub Issues 报告问题时，请包含：

- **环境信息**: 操作系统、Node.js 版本、应用版本
- **重现步骤**: 详细的操作步骤
- **预期行为**: 期望发生什么
- **实际行为**: 实际发生了什么
- **错误信息**: 完整的错误日志
- **截图**: 如果适用

### 功能请求

提交功能请求时，请说明：

- **用例**: 为什么需要这个功能
- **详细描述**: 功能的具体要求
- **替代方案**: 是否考虑过其他解决方案
- **实现建议**: 如果有技术建议

---

**维护者**: 开发团队  
**最后更新**: 2025年1月  
**联系方式**: [dev@example.com](mailto:dev@example.com)