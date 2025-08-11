import { useState, useEffect, useCallback, useRef } from 'react';
import { BookContent, ReadingSettings, Chapter } from '../../shared/types';

interface PageInfo {
  chapterIndex: number;
  pageInChapter: number;
  content: string;
  startOffset: number;
  endOffset: number;
  tocItems?: string[]; // 该页包含的目录项ID
}

interface PaginationState {
  totalPages: number;
  currentPage: number;
  pages: PageInfo[];
  dynamicToc: DynamicTocItem[];
  isCalculating: boolean;
}

interface UseDynamicPaginationOptions {
  content: BookContent;
  settings: ReadingSettings;
  containerWidth?: number;
  containerHeight?: number;
}

interface DynamicTocItem {
  id: string;
  title: string;
  level: number;
  page: number;
  chapterIndex: number;
  href?: string;
  children?: DynamicTocItem[];
}

/**
 * 动态分页Hook
 * 根据字体设置和容器尺寸动态计算页面内容
 */
export const useDynamicPagination = ({
  content,
  settings,
  containerWidth = 800,
  containerHeight = 600
}: UseDynamicPaginationOptions) => {
  const [paginationState, setPaginationState] = useState<PaginationState>({
    totalPages: 1,
    currentPage: 1,
    pages: [],
    dynamicToc: [],
    isCalculating: false
  });

  const measurementRef = useRef<HTMLDivElement | null>(null);
  const calculationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 创建测量容器
   */
  const createMeasurementContainer = useCallback(() => {
    if (measurementRef.current) {
      return measurementRef.current;
    }

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    
    // 计算实际内容区域的宽度
    const contentWidth = containerWidth - settings.margin * 2 - 40; // 额外减去滚动条等空间
    container.style.width = `${Math.max(300, contentWidth)}px`; // 最小宽度300px
    container.style.maxWidth = '800px'; // 最大宽度限制，提高可读性
    
    // 应用字体设置
    container.style.fontFamily = settings.fontFamily;
    container.style.fontSize = `${settings.fontSize}px`;
    container.style.lineHeight = settings.lineHeight.toString();
    
    // 应用文本样式
    container.style.textAlign = 'justify';
    container.style.wordBreak = 'break-word';
    container.style.hyphens = 'auto';
    container.style.padding = '0';
    container.style.margin = '0';
    container.style.border = 'none';
    container.style.overflow = 'visible'; // 改为visible以准确测量高度
    container.style.visibility = 'hidden';
    container.style.whiteSpace = 'normal';
    
    document.body.appendChild(container);
    measurementRef.current = container;
    
    return container;
  }, [containerWidth, settings]);

  /**
   * 清理测量容器
   */
  const cleanupMeasurementContainer = useCallback(() => {
    if (measurementRef.current) {
      document.body.removeChild(measurementRef.current);
      measurementRef.current = null;
    }
  }, []);

  /**
   * 测量文本在当前设置下的高度
   */
  const measureTextHeight = useCallback((text: string): number => {
    const container = createMeasurementContainer();
    container.innerHTML = text;
    const height = container.scrollHeight;
    return height;
  }, [createMeasurementContainer]);

  /**
   * 将章节内容分割成页面
   */
  const paginateChapter = useCallback((chapter: Chapter, chapterIndex: number): PageInfo[] => {
    const container = createMeasurementContainer();
    
    // 计算实际可用的页面高度，留出更多安全边距
    const toolbarHeight = 60; // 工具栏高度
    const navigationHeight = 80; // 导航栏高度
    const safetyMargin = 40; // 额外的安全边距
    const maxHeight = containerHeight - settings.margin * 2 - toolbarHeight - navigationHeight - safetyMargin;
    
    const pages: PageInfo[] = [];
    
    // 将HTML内容分割成段落
    const paragraphs = extractParagraphsFromHtml(chapter.content);
    
    let currentPageContent = '';
    let paragraphIndex = 0;
    let pageInChapter = 0;
    
    for (const paragraph of paragraphs) {
      // 检查单个段落是否过长，如果是则需要进一步分割
      const paragraphHeight = measureTextHeight(paragraph);
      
      if (paragraphHeight > maxHeight) {
        // 段落太长，需要分割
        const splitParagraphs = splitLongParagraph(paragraph, maxHeight, container);
        
        for (const splitPart of splitParagraphs) {
          const testContent = currentPageContent + splitPart;
          container.innerHTML = testContent;
          const testHeight = container.scrollHeight;
          
          if (testHeight > maxHeight && currentPageContent !== '') {
            // 保存当前页
            pages.push({
              chapterIndex,
              pageInChapter,
              content: currentPageContent,
              startOffset: paragraphIndex,
              endOffset: paragraphIndex
            });
            
            // 开始新页
            currentPageContent = splitPart;
            pageInChapter++;
          } else {
            currentPageContent = testContent;
          }
        }
      } else {
        // 正常段落处理
        const testContent = currentPageContent + paragraph;
        container.innerHTML = testContent;
        const testHeight = container.scrollHeight;
        
        if (testHeight > maxHeight && currentPageContent !== '') {
          // 当前页已满，保存当前页并开始新页
          pages.push({
            chapterIndex,
            pageInChapter,
            content: currentPageContent,
            startOffset: paragraphIndex,
            endOffset: paragraphIndex
          });
          
          // 开始新页
          currentPageContent = paragraph;
          pageInChapter++;
        } else {
          // 添加段落到当前页
          currentPageContent = testContent;
        }
      }
      
      paragraphIndex++;
    }
    
    // 添加最后一页
    if (currentPageContent) {
      pages.push({
        chapterIndex,
        pageInChapter,
        content: currentPageContent,
        startOffset: paragraphIndex,
        endOffset: paragraphIndex
      });
    }
    
    return pages;
  }, [createMeasurementContainer, containerHeight, settings, measureTextHeight]);

  /**
   * 计算所有页面
   */
  const calculatePages = useCallback(async () => {
    if (!content.chapters || content.chapters.length === 0) {
      return;
    }

    setPaginationState(prev => ({ ...prev, isCalculating: true }));

    try {
      const allPages: PageInfo[] = [];
      
      // 分批处理章节，避免阻塞UI
      for (let i = 0; i < content.chapters.length; i++) {
        const chapter = content.chapters[i];
        const chapterPages = paginateChapter(chapter, i);
        allPages.push(...chapterPages);
        
        // 每处理5个章节后让出控制权
        if (i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      // 计算动态目录映射
      const dynamicToc = calculateDynamicToc(content.toc, allPages, content.chapters);

      setPaginationState(prev => ({
        ...prev,
        totalPages: allPages.length,
        pages: allPages,
        dynamicToc,
        isCalculating: false
      }));
    } catch (error) {
      console.error('Failed to calculate pages:', error);
      setPaginationState(prev => ({ ...prev, isCalculating: false }));
    }
  }, [content.chapters, content.toc, paginateChapter]);

  /**
   * 获取指定页面的内容
   */
  const getPageContent = useCallback((pageNumber: number): string => {
    const pageIndex = pageNumber - 1;
    if (pageIndex < 0 || pageIndex >= paginationState.pages.length) {
      return '';
    }
    
    return paginationState.pages[pageIndex].content;
  }, [paginationState.pages]);

  /**
   * 获取当前页面信息
   */
  const getCurrentPageInfo = useCallback((): PageInfo | null => {
    const pageIndex = paginationState.currentPage - 1;
    if (pageIndex < 0 || pageIndex >= paginationState.pages.length) {
      return null;
    }
    
    return paginationState.pages[pageIndex];
  }, [paginationState.currentPage, paginationState.pages]);

  /**
   * 跳转到指定页面
   */
  const goToPage = useCallback((pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= paginationState.totalPages) {
      setPaginationState(prev => ({ ...prev, currentPage: pageNumber }));
    }
  }, [paginationState.totalPages]);

  /**
   * 根据目录项跳转到对应页面
   */
  const goToTocItem = useCallback((tocItemId: string) => {
    const tocItem = findTocItemById(paginationState.dynamicToc, tocItemId);
    if (tocItem) {
      goToPage(tocItem.page);
    }
  }, [paginationState.dynamicToc, goToPage]);

  /**
   * 获取动态计算的目录
   */
  const getDynamicToc = useCallback(() => {
    return paginationState.dynamicToc;
  }, [paginationState.dynamicToc]);

  /**
   * 下一页
   */
  const nextPage = useCallback(() => {
    if (paginationState.currentPage < paginationState.totalPages) {
      setPaginationState(prev => ({ ...prev, currentPage: prev.currentPage + 1 }));
    }
  }, [paginationState.currentPage, paginationState.totalPages]);

  /**
   * 上一页
   */
  const previousPage = useCallback(() => {
    if (paginationState.currentPage > 1) {
      setPaginationState(prev => ({ ...prev, currentPage: prev.currentPage - 1 }));
    }
  }, [paginationState.currentPage]);

  // 当设置或内容改变时重新计算分页
  useEffect(() => {
    // 防抖处理，避免频繁重新计算
    if (calculationTimeoutRef.current) {
      clearTimeout(calculationTimeoutRef.current);
    }

    calculationTimeoutRef.current = setTimeout(() => {
      calculatePages();
    }, 300);

    return () => {
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }
    };
  }, [calculatePages, settings.fontSize, settings.fontFamily, settings.lineHeight, settings.margin, containerWidth, containerHeight]);

  // 清理资源
  useEffect(() => {
    return () => {
      cleanupMeasurementContainer();
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }
    };
  }, [cleanupMeasurementContainer]);

  return {
    totalPages: paginationState.totalPages,
    currentPage: paginationState.currentPage,
    isCalculating: paginationState.isCalculating,
    getPageContent,
    getCurrentPageInfo,
    goToPage,
    goToTocItem,
    getDynamicToc,
    nextPage,
    previousPage
  };
};

/**
 * 计算动态目录映射
 */
function calculateDynamicToc(
  originalToc: any[], 
  pages: PageInfo[], 
  chapters: any[]
): DynamicTocItem[] {
  const dynamicToc: DynamicTocItem[] = [];
  
  for (const tocItem of originalToc) {
    // 尝试找到目录项对应的章节
    let targetChapterIndex = -1;
    
    // 方法1: 通过href匹配
    if (tocItem.href) {
      const hrefFile = tocItem.href.split('#')[0];
      targetChapterIndex = chapters.findIndex(chapter => 
        chapter.id === hrefFile || 
        chapter.id.includes(hrefFile) || 
        hrefFile.includes(chapter.id)
      );
    }
    
    // 方法2: 通过标题匹配
    if (targetChapterIndex === -1) {
      targetChapterIndex = chapters.findIndex(chapter => 
        chapter.title === tocItem.title ||
        chapter.title.includes(tocItem.title) ||
        tocItem.title.includes(chapter.title)
      );
    }
    
    // 方法3: 使用索引顺序
    if (targetChapterIndex === -1) {
      const tocIndex = originalToc.indexOf(tocItem);
      if (tocIndex < chapters.length) {
        targetChapterIndex = tocIndex;
      }
    }
    
    // 找到对应章节的第一页
    let targetPage = 1;
    if (targetChapterIndex >= 0) {
      const chapterFirstPage = pages.find(page => page.chapterIndex === targetChapterIndex);
      if (chapterFirstPage) {
        targetPage = pages.indexOf(chapterFirstPage) + 1;
      }
    }
    
    const dynamicTocItem: DynamicTocItem = {
      id: tocItem.id,
      title: tocItem.title,
      level: tocItem.level,
      page: targetPage,
      chapterIndex: targetChapterIndex,
      href: tocItem.href
    };
    
    // 递归处理子目录
    if (tocItem.children && tocItem.children.length > 0) {
      dynamicTocItem.children = calculateDynamicToc(tocItem.children, pages, chapters);
    }
    
    dynamicToc.push(dynamicTocItem);
  }
  
  return dynamicToc;
}

/**
 * 根据ID查找目录项
 */
function findTocItemById(toc: DynamicTocItem[], id: string): DynamicTocItem | null {
  for (const item of toc) {
    if (item.id === id) {
      return item;
    }
    if (item.children) {
      const found = findTocItemById(item.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * 分割过长的段落
 */
function splitLongParagraph(paragraph: string, maxHeight: number, container: HTMLDivElement): string[] {
  const parts: string[] = [];
  
  // 尝试按句子分割
  const sentences = paragraph.split(/([.!?。！？])/);
  let currentPart = '';
  
  for (let i = 0; i < sentences.length; i += 2) {
    const sentence = sentences[i] + (sentences[i + 1] || '');
    const testPart = currentPart + sentence;
    
    // 测试这部分内容的高度
    container.innerHTML = testPart;
    const testHeight = container.scrollHeight;
    
    if (testHeight > maxHeight && currentPart !== '') {
      // 当前部分已满，保存并开始新部分
      parts.push(currentPart);
      currentPart = sentence;
    } else {
      currentPart = testPart;
    }
  }
  
  // 添加最后一部分
  if (currentPart) {
    parts.push(currentPart);
  }
  
  // 如果还是太长，按字符数强制分割
  const finalParts: string[] = [];
  for (const part of parts) {
    container.innerHTML = part;
    if (container.scrollHeight > maxHeight) {
      // 强制按字符数分割
      const charLimit = Math.floor(part.length * 0.7); // 保守估计
      let start = 0;
      while (start < part.length) {
        const chunk = part.substring(start, start + charLimit);
        finalParts.push(chunk);
        start += charLimit;
      }
    } else {
      finalParts.push(part);
    }
  }
  
  return finalParts.length > 0 ? finalParts : [paragraph];
}

/**
 * 从HTML中提取段落
 */
function extractParagraphsFromHtml(html: string): string[] {
  try {
    // 创建临时DOM元素来解析HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // 查找所有段落级元素，按文档顺序
    const paragraphElements = tempDiv.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, blockquote, li, pre');
    
    const paragraphs: string[] = [];
    paragraphElements.forEach(element => {
      const textContent = element.textContent?.trim();
      if (textContent && textContent.length > 0) {
        // 保持原有的HTML结构，但清理不必要的属性
        const cleanElement = element.cloneNode(true) as Element;
        
        // 移除可能影响布局的属性
        cleanElement.removeAttribute('style');
        cleanElement.removeAttribute('class');
        
        // 限制段落的最大长度，避免单个段落过长
        if (textContent.length > 1000) {
          // 对于很长的段落，按句子分割
          const sentences = textContent.split(/([.!?。！？]\s+)/);
          let currentGroup = '';
          
          for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i];
            if (currentGroup.length + sentence.length > 500 && currentGroup.length > 0) {
              // 当前组已经足够长，保存并开始新组
              paragraphs.push(`<${element.tagName.toLowerCase()}>${currentGroup.trim()}</${element.tagName.toLowerCase()}>`);
              currentGroup = sentence;
            } else {
              currentGroup += sentence;
            }
          }
          
          // 添加最后一组
          if (currentGroup.trim()) {
            paragraphs.push(`<${element.tagName.toLowerCase()}>${currentGroup.trim()}</${element.tagName.toLowerCase()}>`);
          }
        } else {
          paragraphs.push(cleanElement.outerHTML);
        }
      }
    });
    
    // 如果没有找到段落元素，按换行符分割
    if (paragraphs.length === 0) {
      const lines = html.split(/\n\s*\n/);
      const validLines = lines.filter(line => line.trim().length > 0);
      
      return validLines.map(line => {
        const trimmedLine = line.trim();
        // 如果已经是HTML标签，直接使用；否则包装在p标签中
        if (trimmedLine.startsWith('<') && trimmedLine.endsWith('>')) {
          return trimmedLine;
        } else {
          return `<p>${trimmedLine}</p>`;
        }
      });
    }
    
    return paragraphs;
  } catch (error) {
    console.warn('Failed to extract paragraphs from HTML:', error);
    return [html];
  }
}