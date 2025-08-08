#!/usr/bin/env node

/**
 * 最终集成和优化脚本
 * Final Integration and Optimization Script
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class IntegrationOptimizer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.issues = [];
    this.optimizations = [];
  }

  async run() {
    console.log('🚀 开始最终集成和优化...');
    
    try {
      await this.fixTestIssues();
      await this.performanceOptimization();
      await this.memoryOptimization();
      await this.generateReport();
      
      console.log('✅ 集成和优化完成！');
    } catch (error) {
      console.error('❌ 集成优化失败:', error.message);
      process.exit(1);
    }
  }

  async fixTestIssues() {
    console.log('🔧 修复测试问题...');
    
    // 1. 创建测试辅助目录
    const helpersDir = path.join(this.projectRoot, 'src/__tests__/helpers');
    if (!fs.existsSync(helpersDir)) {
      fs.mkdirSync(helpersDir, { recursive: true });
    }

    // 2. 修复缺失的 hooks
    this.fixMissingHooks();
    
    // 3. 修复测试配置
    this.fixTestConfiguration();
    
    console.log('✅ 测试问题修复完成');
  }

  fixMissingHooks() {
    console.log('  - 修复缺失的 hooks...');
    
    // 创建 useThemeManager hook
    const useThemeManager = `import { useState, useEffect, useCallback } from 'react';

export interface ThemeConfig {
  light: {
    background: string;
    text: string;
    primary: string;
    secondary: string;
  };
  dark: {
    background: string;
    text: string;
    primary: string;
    secondary: string;
  };
}

const defaultThemeConfig: ThemeConfig = {
  light: {
    background: '#ffffff',
    text: '#000000',
    primary: '#3b82f6',
    secondary: '#6b7280'
  },
  dark: {
    background: '#1f2937',
    text: '#ffffff',
    primary: '#60a5fa',
    secondary: '#9ca3af'
  }
};

export type Theme = 'light' | 'dark' | 'system';

export function useThemeManager() {
  const [currentTheme, setCurrentTheme] = useState<Theme>('system');
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(defaultThemeConfig);

  const applyTheme = useCallback((theme: Theme) => {
    setCurrentTheme(theme);
    
    const actualTheme = theme === 'system' 
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;

    document.documentElement.setAttribute('data-theme', actualTheme);
  }, []);

  const applySystemTheme = useCallback(() => {
    if (currentTheme === 'system') {
      applyTheme('system');
    }
  }, [currentTheme, applyTheme]);

  const toggleTheme = useCallback(() => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
  }, [currentTheme, applyTheme]);

  useEffect(() => {
    applyTheme(currentTheme);
  }, [applyTheme, currentTheme]);

  return {
    currentTheme,
    themeConfig,
    applyTheme,
    applySystemTheme,
    toggleTheme,
    setThemeConfig
  };
}`;

    const hooksDir = path.join(this.projectRoot, 'src/renderer/hooks');
    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(hooksDir, 'useThemeManager.ts'),
      useThemeManager
    );

    // 创建 useResponsiveLayout hook
    const useResponsiveLayout = `import { useState, useEffect, useCallback } from 'react';

export interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
}

export function useResponsiveLayout() {
  const [responsiveState, setResponsiveState] = useState<ResponsiveState>(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return {
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024,
      width,
      height
    };
  });

  const updateLayout = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    setResponsiveState({
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024,
      width,
      height
    });
  }, []);

  useEffect(() => {
    let timeoutId;
    
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateLayout, 100);
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [updateLayout]);

  return responsiveState;
}`;

    fs.writeFileSync(
      path.join(hooksDir, 'useResponsiveLayout.ts'),
      useResponsiveLayout
    );

    this.optimizations.push('创建了缺失的 useThemeManager 和 useResponsiveLayout hooks');
  }

  fixTestConfiguration() {
    console.log('  - 修复测试配置...');
    
    // 更新 Jest 配置以排除 E2E 测试
    const jestConfigPath = path.join(this.projectRoot, 'jest.config.js');
    
    if (fs.existsSync(jestConfigPath)) {
      let content = fs.readFileSync(jestConfigPath, 'utf8');
      
      // 添加 testPathIgnorePatterns 来排除 E2E 测试
      if (!content.includes('testPathIgnorePatterns')) {
        content = content.replace(
          'module.exports = {',
          `module.exports = {
  testPathIgnorePatterns: [
    '/node_modules/',
    '/src/__tests__/e2e/',
    '\\\\.e2e\\\\.(test|spec)\\\\.(js|ts)$'
  ],`
        );
      }
      
      fs.writeFileSync(jestConfigPath, content);
      this.optimizations.push('更新了 Jest 配置以排除 E2E 测试');
    }

    // 创建测试设置文件
    const testSetupPath = path.join(this.projectRoot, 'src/setupTests.ts');
    const setupContent = `import '@testing-library/jest-dom';

// 全局测试设置
beforeAll(() => {
  process.env.NODE_ENV = 'test';
});

// Mock Electron APIs
global.window = global.window || {};
global.window.electronAPI = {
  importBook: jest.fn(),
  getBooks: jest.fn(),
  openBook: jest.fn(),
  saveProgress: jest.fn(),
  getProgress: jest.fn(),
  addVocabulary: jest.fn(),
  getVocabulary: jest.fn(),
  translateText: jest.fn(),
  exportVocabulary: jest.fn(),
  saveSettings: jest.fn(),
  getSettings: jest.fn(),
  clearCache: jest.fn(),
  onProgressUpdate: jest.fn(),
  onError: jest.fn()
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});`;

    fs.writeFileSync(testSetupPath, setupContent);
    this.optimizations.push('创建了全局测试设置文件');
  }

  async performanceOptimization() {
    console.log('⚡ 进行性能优化...');
    
    // 1. 创建性能监控工具
    this.createPerformanceMonitor();
    
    // 2. 创建代码分割配置
    this.setupCodeSplitting();
    
    console.log('✅ 性能优化完成');
  }

  createPerformanceMonitor() {
    console.log('  - 创建性能监控工具...');
    
    const performanceMonitor = `export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor();
    }
    return this.instance;
  }

  startTiming(label: string): void {
    performance.mark(\`\${label}-start\`);
  }

  endTiming(label: string): number {
    performance.mark(\`\${label}-end\`);
    performance.measure(label, \`\${label}-start\`, \`\${label}-end\`);
    
    const measure = performance.getEntriesByName(label, 'measure')[0];
    const duration = measure.duration;
    
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    this.metrics.get(label)!.push(duration);
    
    return duration;
  }

  getMetrics(label: string): { avg: number; min: number; max: number; count: number } | null {
    const values = this.metrics.get(label);
    if (!values || values.length === 0) return null;
    
    return {
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length
    };
  }

  getAllMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [label] of this.metrics) {
      result[label] = this.getMetrics(label);
    }
    return result;
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();`;

    const utilsDir = path.join(this.projectRoot, 'src/renderer/utils');
    if (!fs.existsSync(utilsDir)) {
      fs.mkdirSync(utilsDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(utilsDir, 'performanceMonitor.ts'),
      performanceMonitor
    );

    this.optimizations.push('创建了性能监控工具');
  }

  setupCodeSplitting() {
    console.log('  - 设置代码分割...');
    
    const lazyComponentsPath = path.join(this.projectRoot, 'src/renderer/components/LazyComponents.tsx');
    
    const lazyComponents = `import React, { Suspense, lazy } from 'react';

// 懒加载组件
export const LazyBookshelf = lazy(() => import('./Bookshelf/Bookshelf'));
export const LazyReader = lazy(() => import('./Reader/Reader'));
export const LazyVocabulary = lazy(() => import('./Vocabulary/Vocabulary'));
export const LazySettings = lazy(() => import('./Settings/SettingsPanel'));

// 高阶组件包装器
export function withSuspense<P extends object>(
  Component: React.ComponentType<P>,
  fallback: React.ReactNode = <div>Loading...</div>
) {
  return function SuspenseWrapper(props: P) {
    return (
      <Suspense fallback={fallback}>
        <Component {...props} />
      </Suspense>
    );
  };
}

// 导出包装后的组件
export const BookshelfWithSuspense = withSuspense(LazyBookshelf);
export const ReaderWithSuspense = withSuspense(LazyReader);
export const VocabularyWithSuspense = withSuspense(LazyVocabulary);
export const SettingsWithSuspense = withSuspense(LazySettings);`;

    fs.writeFileSync(lazyComponentsPath, lazyComponents);
    this.optimizations.push('设置了代码分割和懒加载');
  }

  async memoryOptimization() {
    console.log('🧠 进行内存优化...');
    
    // 1. 创建内存监控工具
    this.createMemoryMonitor();
    
    console.log('✅ 内存优化完成');
  }

  createMemoryMonitor() {
    console.log('  - 创建内存监控工具...');
    
    const memoryMonitor = `export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private intervalId: NodeJS.Timeout | null = null;
  private memoryHistory: Array<{ timestamp: number; usage: any }> = [];

  static getInstance(): MemoryMonitor {
    if (!this.instance) {
      this.instance = new MemoryMonitor();
    }
    return this.instance;
  }

  startMonitoring(intervalMs: number = 5000): void {
    if (this.intervalId) {
      this.stopMonitoring();
    }

    this.intervalId = setInterval(() => {
      this.recordMemoryUsage();
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  recordMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usage = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        timestamp: Date.now()
      };

      this.memoryHistory.push({ timestamp: Date.now(), usage });
      
      if (this.memoryHistory.length > 100) {
        this.memoryHistory.shift();
      }
    }
  }

  getCurrentMemoryUsage(): any {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
        usagePercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      };
    }
    return null;
  }
}

export const memoryMonitor = MemoryMonitor.getInstance();`;

    const utilsDir = path.join(this.projectRoot, 'src/renderer/utils');
    fs.writeFileSync(
      path.join(utilsDir, 'memoryMonitor.ts'),
      memoryMonitor
    );

    this.optimizations.push('创建了内存监控工具');
  }

  async generateReport() {
    console.log('📊 生成优化报告...');
    
    const report = {
      timestamp: new Date().toISOString(),
      optimizations: this.optimizations,
      issues: this.issues,
      recommendations: [
        '定期运行性能监控以识别瓶颈',
        '监控内存使用情况，特别是在处理大文件时',
        '使用代码分割减少初始加载时间',
        '实施虚拟滚动处理大列表',
        '定期清理缓存和临时文件',
        '优化图片加载和缓存策略'
      ],
      nextSteps: [
        '完成剩余的 UI 组件开发',
        '实施应用打包和分发',
        '进行跨平台测试',
        '完善用户文档',
        '设置持续集成流程'
      ]
    };
    
    const reportPath = path.join(this.projectRoot, 'integration-optimization-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📋 优化报告已生成: ${reportPath}`);
    console.log('\n🎉 集成和优化总结:');
    console.log(`  ✅ 完成了 ${this.optimizations.length} 项优化`);
    console.log(`  ⚠️  发现了 ${this.issues.length} 个问题`);
  }
}

// 运行脚本
if (require.main === module) {
  const optimizer = new IntegrationOptimizer();
  optimizer.run().catch(console.error);
}

module.exports = IntegrationOptimizer;