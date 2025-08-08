const { parentPort, workerData } = require('worker_threads');
const fs = require('fs/promises');
const path = require('path');

// 使用真实的 DOM 解析库
const { JSDOM } = require('jsdom');
const AdmZip = require('adm-zip');
const xml2js = require('xml2js');

// 为 Node.js 环境设置真实的 DOM 环境
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.DOMParser = dom.window.DOMParser;
global.XMLHttpRequest = dom.window.XMLHttpRequest;

// XML 解析器
const parser = new xml2js.Parser({
  explicitArray: false,
  ignoreAttrs: false,
  mergeAttrs: true
});

// 通用超时包装函数
function withTimeout(promise, timeoutMs, errorMessage) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
}

// 解析 EPUB 元数据
async function parseEpubMetadata(filePath, bookId) {
  try {
    const zip = new AdmZip(filePath);
    
    // 读取 META-INF/container.xml 找到 OPF 文件
    const containerEntry = zip.getEntry('META-INF/container.xml');
    if (!containerEntry) {
      throw new Error('Invalid EPUB: missing container.xml');
    }
    
    const containerXml = containerEntry.getData().toString('utf8');
    const containerData = await parser.parseStringPromise(containerXml);
    
    const rootfilePath = containerData.container.rootfiles.rootfile['full-path'];
    
    // 读取 OPF 文件
    const opfEntry = zip.getEntry(rootfilePath);
    if (!opfEntry) {
      throw new Error(`OPF file not found: ${rootfilePath}`);
    }
    
    const opfXml = opfEntry.getData().toString('utf8');
    const opfData = await parser.parseStringPromise(opfXml);
    
    // 提取元数据
    const metadata = opfData.package.metadata;
    const title = metadata['dc:title'] || path.basename(filePath, '.epub');
    
    // 处理作者字段，可能是字符串或对象
    let author = '未知作者';
    const creatorData = metadata['dc:creator'];
    if (creatorData) {
      if (typeof creatorData === 'string') {
        author = creatorData;
      } else if (creatorData._ && typeof creatorData._ === 'string') {
        author = creatorData._;
      } else if (typeof creatorData === 'object' && creatorData.toString) {
        author = creatorData.toString();
      }
    }
    
    const language = metadata['dc:language'] || 'zh-CN';
    
    // 计算总页数（基于 spine 中的项目数）
    const spine = opfData.package.spine;
    const spineItems = Array.isArray(spine.itemref) ? spine.itemref : [spine.itemref];
    const totalPages = spineItems.length * 10; // 估算每个文件10页

    return {
      success: true,
      data: {
        title,
        author,
        language,
        totalPages
      }
    };
  } catch (error) {
    console.error('EPUB metadata parsing error:', error);
    return {
      success: false,
      error: {
        type: 'PARSE_ERROR',
        message: `EPUB 元信息解析失败: ${error.message}`,
        timestamp: new Date(),
        recoverable: true
      },
      fallbackData: {
        title: path.basename(filePath, '.epub'),
        author: '未知作者',
        language: 'zh-CN',
        totalPages: 100
      }
    };
  }
}

// 解析 EPUB 内容
async function parseEpubContent(filePath, bookId) {
  try {
    console.log('Parsing EPUB content...');
    const zip = new AdmZip(filePath);
    
    // 读取 META-INF/container.xml 找到 OPF 文件
    const containerEntry = zip.getEntry('META-INF/container.xml');
    if (!containerEntry) {
      throw new Error('Invalid EPUB: missing container.xml');
    }
    
    const containerXml = containerEntry.getData().toString('utf8');
    const containerData = await parser.parseStringPromise(containerXml);
    
    const rootfilePath = containerData.container.rootfiles.rootfile['full-path'];
    const opfDir = path.dirname(rootfilePath);
    
    // 读取 OPF 文件
    const opfEntry = zip.getEntry(rootfilePath);
    if (!opfEntry) {
      throw new Error(`OPF file not found: ${rootfilePath}`);
    }
    
    const opfXml = opfEntry.getData().toString('utf8');
    const opfData = await parser.parseStringPromise(opfXml);
    
    // 解析 manifest 和 spine
    const manifest = opfData.package.manifest;
    const spine = opfData.package.spine;
    
    // 创建 manifest 映射
    const manifestItems = Array.isArray(manifest.item) ? manifest.item : [manifest.item];
    const manifestMap = {};
    manifestItems.forEach(item => {
      manifestMap[item.id] = item;
    });
    
    // 解析目录
    const toc = await parseTableOfContents(zip, opfDir, manifestMap);
    
    // 解析章节内容
    const spineItems = Array.isArray(spine.itemref) ? spine.itemref : [spine.itemref];
    const chapters = await parseChapters(zip, opfDir, spineItems, manifestMap);
    
    // 提取原始内容
    const rawContent = chapters.map(chapter => chapter.content).join('\n\n');
    
    console.log(`Parsed ${chapters.length} chapters, ${toc.length} TOC entries`);

    return {
      success: true,
      data: {
        bookId,
        chapters,
        toc,
        rawContent
      }
    };
  } catch (error) {
    console.error('EPUB content parsing error:', error);
    return {
      success: false,
      error: {
        type: 'PARSE_ERROR',
        message: `EPUB 内容解析失败: ${error.message}`,
        timestamp: new Date(),
        recoverable: true
      },
      fallbackData: {
        bookId,
        chapters: [{
          id: 'chapter-1',
          title: 'Chapter 1',
          content: '内容解析失败，请尝试使用其他阅读器打开此文件。',
          pageCount: 1,
          startPage: 1
        }],
        toc: [{
          id: 'toc-1',
          title: 'Chapter 1',
          level: 0,
          page: 1
        }],
        rawContent: '内容解析失败，请尝试使用其他阅读器打开此文件。'
      }
    };
  }
}

// 解析目录结构
async function parseTableOfContents(zip, opfDir, manifestMap) {
  try {
    // 查找 NCX 文件（EPUB 2.0 目录）或 Navigation Document（EPUB 3.0）
    const ncxItem = Object.values(manifestMap).find(item => 
      item['media-type'] === 'application/x-dtbncx+xml'
    );
    
    if (ncxItem) {
      return await parseNcxToc(zip, opfDir, ncxItem.href);
    }
    
    // 如果没有 NCX，查找 Navigation Document
    const navItem = Object.values(manifestMap).find(item => 
      item.properties && item.properties.includes('nav')
    );
    
    if (navItem) {
      return await parseNavToc(zip, opfDir, navItem.href);
    }
    
    // 如果都没有，从 spine 生成简单目录
    return [];
  } catch (error) {
    console.warn('Failed to parse TOC:', error);
    return [];
  }
}

// 解析 NCX 目录文件
async function parseNcxToc(zip, opfDir, ncxHref) {
  try {
    const ncxPath = path.join(opfDir, ncxHref).replace(/\\/g, '/');
    const ncxEntry = zip.getEntry(ncxPath);
    
    if (!ncxEntry) {
      return [];
    }
    
    const ncxXml = ncxEntry.getData().toString('utf8');
    const ncxData = await parser.parseStringPromise(ncxXml);
    
    const navMap = ncxData.ncx.navMap;
    if (!navMap || !navMap.navPoint) {
      return [];
    }
    
    const navPoints = Array.isArray(navMap.navPoint) ? navMap.navPoint : [navMap.navPoint];
    return convertNcxNavToToc(navPoints, 0);
  } catch (error) {
    console.warn('Failed to parse NCX TOC:', error);
    return [];
  }
}

// 解析 Navigation Document 目录
async function parseNavToc(zip, opfDir, navHref) {
  try {
    const navPath = path.join(opfDir, navHref).replace(/\\/g, '/');
    const navEntry = zip.getEntry(navPath);
    
    if (!navEntry) {
      return [];
    }
    
    const navHtml = navEntry.getData().toString('utf8');
    const dom = new JSDOM(navHtml);
    const document = dom.window.document;
    
    // 查找 nav[epub:type="toc"] 元素
    const tocNav = document.querySelector('nav[epub\\:type="toc"]') || 
                   document.querySelector('nav[*|type="toc"]') ||
                   document.querySelector('nav');
    
    if (!tocNav) {
      return [];
    }
    
    const ol = tocNav.querySelector('ol');
    if (!ol) {
      return [];
    }
    
    return parseNavList(ol, 0);
  } catch (error) {
    console.warn('Failed to parse Navigation TOC:', error);
    return [];
  }
}

// 转换 NCX navPoint 到 TOC 格式
function convertNcxNavToToc(navPoints, level) {
  return navPoints.map((navPoint, index) => {
    const tocItem = {
      id: `toc-${level}-${index}`,
      title: navPoint.navLabel.text || `Chapter ${index + 1}`,
      level,
      page: index + 1,
      href: navPoint.content.src
    };
    
    if (navPoint.navPoint) {
      const childNavPoints = Array.isArray(navPoint.navPoint) ? navPoint.navPoint : [navPoint.navPoint];
      tocItem.children = convertNcxNavToToc(childNavPoints, level + 1);
    }
    
    return tocItem;
  });
}

// 解析 HTML nav 列表
function parseNavList(ol, level) {
  const items = [];
  const lis = ol.querySelectorAll(':scope > li');
  
  lis.forEach((li, index) => {
    const a = li.querySelector('a');
    if (!a) return;
    
    const tocItem = {
      id: `toc-${level}-${index}`,
      title: a.textContent.trim() || `Chapter ${index + 1}`,
      level,
      page: index + 1,
      href: a.getAttribute('href')
    };
    
    const childOl = li.querySelector('ol');
    if (childOl) {
      tocItem.children = parseNavList(childOl, level + 1);
    }
    
    items.push(tocItem);
  });
  
  return items;
}

// 解析章节内容
async function parseChapters(zip, opfDir, spineItems, manifestMap) {
  const chapters = [];
  let currentStartPage = 1;
  
  for (let i = 0; i < spineItems.length; i++) {
    const spineItem = spineItems[i];
    const itemId = spineItem.idref;
    const manifestItem = manifestMap[itemId];
    
    if (!manifestItem) {
      console.warn(`Manifest item not found for spine item: ${itemId}`);
      continue;
    }
    
    try {
      const chapterPath = path.join(opfDir, manifestItem.href).replace(/\\/g, '/');
      const chapterEntry = zip.getEntry(chapterPath);
      
      if (!chapterEntry) {
        console.warn(`Chapter file not found: ${chapterPath}`);
        continue;
      }
      
      const chapterHtml = chapterEntry.getData().toString('utf8');
      const content = extractTextFromHtml(chapterHtml);
      const pageCount = Math.max(1, Math.ceil(content.length / 2000)); // 假设每页2000字符
      
      const chapter = {
        id: itemId,
        title: extractTitleFromHtml(chapterHtml) || `Chapter ${i + 1}`,
        content,
        pageCount,
        startPage: currentStartPage
      };
      
      chapters.push(chapter);
      currentStartPage += pageCount;
      
    } catch (error) {
      console.warn(`Failed to parse chapter ${i}:`, error);
      // 创建一个空章节作为占位符
      chapters.push({
        id: `chapter-${i}`,
        title: `Chapter ${i + 1}`,
        content: '',
        pageCount: 1,
        startPage: currentStartPage
      });
      currentStartPage += 1;
    }
  }
  
  return chapters;
}

// 从 HTML 中提取纯文本内容
function extractTextFromHtml(html) {
  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // 移除 script 和 style 标签
    const scripts = document.querySelectorAll('script, style');
    scripts.forEach(script => script.remove());
    
    // 提取文本内容
    const textContent = document.body ? document.body.textContent : document.textContent;
    
    if (!textContent) {
      return '';
    }
    
    // 清理文本：移除多余的空白字符
    return textContent
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  } catch (error) {
    console.warn('Failed to extract text from HTML:', error);
    return '';
  }
}

// 从 HTML 中提取标题
function extractTitleFromHtml(html) {
  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // 尝试从各种可能的标题元素中提取标题
    const titleSelectors = ['h1', 'h2', 'h3', 'title', '.title', '#title'];
    
    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to extract title from HTML:', error);
    return null;
  }
}

// 主处理函数
async function processEpub() {
  const { action, filePath, bookId } = workerData;
  
  try {
    let result;
    
    if (action === 'parseMetadata') {
      result = await parseEpubMetadata(filePath, bookId);
    } else if (action === 'parseContent') {
      result = await parseEpubContent(filePath, bookId);
    } else {
      throw new Error(`Unknown action: ${action}`);
    }
    
    parentPort.postMessage(result);
  } catch (error) {
    parentPort.postMessage({
      success: false,
      error: {
        type: 'WORKER_ERROR',
        message: error.message,
        stack: error.stack,
        timestamp: new Date(),
        recoverable: false
      }
    });
  }
}

// 启动处理
processEpub();