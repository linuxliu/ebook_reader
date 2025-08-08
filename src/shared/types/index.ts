// Shared type definitions that will be used by both main and renderer processes

// ============================================================================
// Data Models
// ============================================================================

export interface BookMetadata {
  id: string;
  title: string;
  author: string;
  cover?: string;
  format: 'epub' | 'pdf' | 'mobi' | 'txt';
  filePath: string;
  fileSize: number;
  importDate: Date;
  lastReadDate?: Date;
  totalPages: number;
  language: string;
}

export interface ReadingProgress {
  bookId: string;
  currentPage: number;
  currentChapter: number;
  percentage: number;
  position: string; // 用于精确定位
  lastUpdateTime: Date;
}

export interface VocabularyItem {
  id: string;
  word: string;
  translation: string;
  pronunciation?: string;
  example?: string;
  bookId: string;
  context: string;
  addedDate: Date;
  mastered: boolean;
}

export interface ReadingSettings {
  bookId: string;
  fontFamily: string;
  fontSize: number; // 12-32px, step 2px
  lineHeight: number;
  margin: number;
  theme: 'light' | 'dark';
  pageMode: 'scroll' | 'pagination';
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'zh-CN' | 'en-US';
  autoSave: boolean;
  cacheSize: number;
}

export interface BookContent {
  bookId: string;
  chapters: Chapter[];
  toc: TableOfContent[];
  rawContent: string;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  pageCount: number;
  startPage: number;
}

export interface TableOfContent {
  id: string;
  title: string;
  level: number;
  page: number;
  href?: string;
  children?: TableOfContent[];
}

export interface CachedBook {
  bookId: string;
  chapters: Chapter[];
  toc: TableOfContent[];
  metadata: BookMetadata;
  cacheVersion: string;
  createdAt: Date;
}

// ============================================================================
// Application State
// ============================================================================

export interface AppState {
  currentView: 'bookshelf' | 'reader' | 'vocabulary' | 'settings';
  books: BookMetadata[];
  currentBook: BookMetadata | null;
  readingProgress: ReadingProgress | null;
  vocabulary: VocabularyItem[];
  settings: AppSettings;
  theme: 'light' | 'dark';
  loading: boolean;
  error: AppError | null;
  successMessage: string | null;
}

// ============================================================================
// Error Handling
// ============================================================================

export enum ErrorType {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  PARSE_ERROR = 'PARSE_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  STORAGE_FULL = 'STORAGE_FULL'
}

export interface AppError {
  type: ErrorType;
  message: string;
  details?: unknown;
  timestamp: Date;
  recoverable?: boolean;
}

// ============================================================================
// Service Layer Interfaces
// ============================================================================

export interface FileSystemService {
  importBook(filePath: string): Promise<BookMetadata>;
  parseBookContent(bookId: string): Promise<BookContent>;
  exportVocabulary(format: 'csv' | 'txt', vocabulary: VocabularyItem[]): Promise<string>;
  clearCache(bookId?: string): Promise<void>;
  validateFile(filePath: string): Promise<boolean>;
  getFileInfo(filePath: string): Promise<{ size: number; format: string }>;
}

export interface DatabaseService {
  // 书籍管理
  saveBook(book: BookMetadata): Promise<string>;
  getBooks(): Promise<BookMetadata[]>;
  getBook(bookId: string): Promise<BookMetadata | null>;
  deleteBook(bookId: string): Promise<void>;
  updateBook(bookId: string, updates: Partial<BookMetadata>): Promise<void>;
  
  // 阅读进度
  saveProgress(bookId: string, progress: ReadingProgress): Promise<void>;
  getProgress(bookId: string): Promise<ReadingProgress | null>;
  deleteProgress(bookId: string): Promise<void>;
  
  // 生词表
  addVocabulary(word: VocabularyItem): Promise<void>;
  getVocabulary(bookId?: string): Promise<VocabularyItem[]>;
  deleteVocabulary(wordId: string): Promise<void>;
  updateVocabulary(wordId: string, updates: Partial<VocabularyItem>): Promise<void>;
  markWordAsMastered(wordId: string, mastered: boolean): Promise<void>;
  
  // 设置
  saveSettings(bookId: string, settings: ReadingSettings): Promise<void>;
  getSettings(bookId: string): Promise<ReadingSettings | null>;
  saveAppSettings(settings: AppSettings): Promise<void>;
  getAppSettings(): Promise<AppSettings>;
  
  // 数据库管理
  initialize(): Promise<void>;
  close(): Promise<void>;
  backup(): Promise<string>;
  restore(backupPath: string): Promise<void>;
}

export interface CacheService {
  generateCache(bookId: string, content: BookContent): Promise<void>;
  getCache(bookId: string): Promise<CachedBook | null>;
  invalidateCache(bookId: string): Promise<void>;
  getCacheSize(): Promise<number>;
  cleanupCache(): Promise<void>;
  isCacheValid(bookId: string): Promise<boolean>;
  updateCacheVersion(bookId: string, version: string): Promise<void>;
}

export interface TranslationService {
  translate(text: string, from: string, to: string): Promise<TranslationResult>;
  getLocalTranslation(word: string): Promise<TranslationResult | null>;
  isOnline(): Promise<boolean>;
}

export interface TranslationResult {
  word: string;
  translation: string;
  pronunciation?: string;
  examples?: string[];
  definitions?: string[];
  source: 'online' | 'local';
}

// ============================================================================
// IPC Communication Types
// ============================================================================

export type IPCChannel = 
  // 书籍管理
  | 'book:import'
  | 'book:get-all'
  | 'book:get'
  | 'book:delete'
  | 'book:update'
  | 'book:parse-content'
  
  // 阅读进度
  | 'progress:save'
  | 'progress:get'
  | 'progress:delete'
  
  // 生词表
  | 'vocabulary:add'
  | 'vocabulary:get'
  | 'vocabulary:delete'
  | 'vocabulary:update'
  | 'vocabulary:mark-mastered'
  | 'vocabulary:export'
  
  // 设置
  | 'settings:save'
  | 'settings:get'
  | 'settings:save-app'
  | 'settings:get-app'
  
  // 缓存管理
  | 'cache:generate'
  | 'cache:get'
  | 'cache:invalidate'
  | 'cache:cleanup'
  | 'cache:get-size'
  
  // 翻译服务
  | 'translation:translate'
  | 'translation:get-local'
  
  // 文件系统
  | 'fs:validate-file'
  | 'fs:get-file-info'
  | 'fs:clear-cache'
  
  // 应用管理
  | 'app:get-version'
  | 'app:quit'
  | 'app:minimize'
  | 'app:maximize'
  | 'app:toggle-fullscreen'
  
  // 自动更新
  | 'updater:check-for-updates'
  | 'updater:download-update'
  | 'updater:quit-and-install'
  | 'updater:get-status'
  | 'updater:set-auto-download';

export interface IPCRequest<T = unknown> {
  id: string;
  channel: IPCChannel;
  data?: T;
  timestamp: number;
}

export interface IPCResponse<T = unknown> {
  id: string;
  success: boolean;
  data?: T;
  error?: AppError;
  timestamp: number;
}

// 具体的 IPC 消息类型
export interface BookImportRequest {
  filePath: string;
}

export interface BookImportResponse {
  book: BookMetadata;
}

export interface BookContentRequest {
  bookId: string;
}

export interface BookContentResponse {
  content: BookContent;
}

export interface ProgressSaveRequest {
  bookId: string;
  progress: ReadingProgress;
}

export interface VocabularyAddRequest {
  word: VocabularyItem;
}

export interface VocabularyExportRequest {
  format: 'csv' | 'txt';
  bookId?: string;
}

export interface VocabularyExportResponse {
  filePath: string;
}

export interface TranslationRequest {
  text: string;
  from: string;
  to: string;
}

export interface SettingsSaveRequest {
  bookId: string;
  settings: ReadingSettings;
}

export interface AppSettingsSaveRequest {
  settings: AppSettings;
}

export interface CacheGenerateRequest {
  bookId: string;
  content: BookContent;
}

// ============================================================================
// UI Component Props Types
// ============================================================================

export interface BookshelfProps {
  books: BookMetadata[];
  viewMode: 'grid' | 'list';
  sortBy: 'title' | 'author' | 'date';
  searchQuery: string;
  onBookSelect: (book: BookMetadata) => void;
  onImportBook: () => void;
  onDeleteBook: (bookId: string) => void;
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onSortChange: (sortBy: 'title' | 'author' | 'date') => void;
  onSearchChange: (query: string) => void;
}

export interface ReaderProps {
  book: BookMetadata;
  content: BookContent;
  progress: ReadingProgress;
  settings: ReadingSettings;
  onProgressChange: (progress: ReadingProgress) => void;
  onSettingsChange: (settings: ReadingSettings) => void;
  onClose: () => void;
}

export interface TranslationProps {
  selectedText: string;
  position: { x: number; y: number };
  visible: boolean;
  onAddToVocabulary: (word: VocabularyItem) => void;
  onClose: () => void;
}

export interface VocabularyListProps {
  vocabulary: VocabularyItem[];
  onDelete: (wordId: string) => void;
  onMarkMastered: (wordId: string, mastered: boolean) => void;
  onExport: (format: 'csv' | 'txt') => void;
  onEdit: (word: VocabularyItem) => void;
}

export interface SettingsProps {
  settings: ReadingSettings;
  appSettings: AppSettings;
  onSettingsChange: (settings: ReadingSettings) => void;
  onAppSettingsChange: (settings: AppSettings) => void;
  onClose: () => void;
}

// ============================================================================
// Utility Types
// ============================================================================

export type BookFormat = 'epub' | 'pdf' | 'mobi' | 'txt';

export type ViewMode = 'grid' | 'list';

export type SortBy = 'title' | 'author' | 'date';

export type Theme = 'light' | 'dark' | 'system';

export type Language = 'zh-CN' | 'en-US';

export type ExportFormat = 'csv' | 'txt';

export type PageMode = 'scroll' | 'pagination';

// 分页相关类型
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// 搜索相关类型
export interface SearchOptions {
  query: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  regex: boolean;
}

export interface SearchResult {
  bookId: string;
  matches: SearchMatch[];
  totalMatches: number;
}

export interface SearchMatch {
  chapterId: string;
  chapterTitle: string;
  page: number;
  context: string;
  position: number;
}

// 导入相关类型
export interface ImportProgress {
  bookId: string;
  fileName: string;
  progress: number; // 0-100
  stage: 'parsing' | 'caching' | 'saving' | 'complete' | 'error';
  error?: AppError;
}

// 统计相关类型
export interface ReadingStats {
  bookId: string;
  totalReadingTime: number; // 分钟
  pagesRead: number;
  wordsLearned: number;
  lastReadDate: Date;
  readingStreak: number; // 连续阅读天数
}

// 备份相关类型
export interface BackupInfo {
  fileName: string;
  filePath: string;
  createdAt: Date;
  size: number;
  booksCount: number;
  vocabularyCount: number;
}

// 自动更新相关类型
export interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes: string;
  downloadSize: number;
}

export interface UpdateProgress {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

export interface UpdateStatus {
  checking: boolean;
  available: boolean;
  downloaded: boolean;
  error: string | null;
  info: UpdateInfo | null;
  progress: UpdateProgress | null;
}