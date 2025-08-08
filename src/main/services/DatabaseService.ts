import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import {
  DatabaseService as IDatabaseService,
  BookMetadata,
  ReadingProgress,
  VocabularyItem,
  ReadingSettings,
  AppSettings,
  ErrorType,
  AppError
} from '../../shared/types';
import { DatabaseMigrations } from './DatabaseMigrations';

export class DatabaseService implements IDatabaseService {
  private db: Database.Database | null = null;
  private readonly dbPath: string;
  private readonly currentVersion = 1;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'ebook-reader.db');
  }

  async initialize(): Promise<void> {
    try {
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
      
      await this.createTables();
      await this.runMigrations();
    } catch (error) {
      throw this.createError(ErrorType.DATABASE_ERROR, 'Failed to initialize database', error);
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // 书籍管理
  async saveBook(book: BookMetadata): Promise<string> {
    this.ensureConnection();
    
    try {
      const stmt = this.db!.prepare(`
        INSERT OR REPLACE INTO books (
          id, title, author, cover, format, filePath, fileSize, 
          importDate, lastReadDate, totalPages, language
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        book.id,
        book.title,
        book.author,
        book.cover || null,
        book.format,
        book.filePath,
        book.fileSize,
        book.importDate.toISOString(),
        book.lastReadDate?.toISOString() || null,
        book.totalPages,
        book.language
      );
      
      return book.id;
    } catch (error) {
      throw this.createError(ErrorType.DATABASE_ERROR, 'Failed to save book', error);
    }
  }

  async getBooks(): Promise<BookMetadata[]> {
    this.ensureConnection();
    
    try {
      const stmt = this.db!.prepare(`
        SELECT * FROM books ORDER BY lastReadDate DESC, importDate DESC
      `);
      
      const rows = stmt.all() as any[];
      return rows.map(this.mapRowToBook);
    } catch (error) {
      throw this.createError(ErrorType.DATABASE_ERROR, 'Failed to get books', error);
    }
  }

  async getBook(bookId: string): Promise<BookMetadata | null> {
    this.ensureConnection();
    
    try {
      const stmt = this.db!.prepare('SELECT * FROM books WHERE id = ?');
      const row = stmt.get(bookId) as any;
      
      return row ? this.mapRowToBook(row) : null;
    } catch (error) {
      throw this.createError(ErrorType.DATABASE_ERROR, 'Failed to get book', error);
    }
  }

  async deleteBook(bookId: string): Promise<void> {
    this.ensureConnection();
    
    try {
      const transaction = this.db!.transaction(() => {
        // 删除相关的阅读进度
        this.db!.prepare('DELETE FROM reading_progress WHERE bookId = ?').run(bookId);
        // 删除相关的生词
        this.db!.prepare('DELETE FROM vocabulary WHERE bookId = ?').run(bookId);
        // 删除相关的设置
        this.db!.prepare('DELETE FROM reading_settings WHERE bookId = ?').run(bookId);
        // 删除书籍
        this.db!.prepare('DELETE FROM books WHERE id = ?').run(bookId);
      });
      
      transaction();
    } catch (error) {
      throw this.createError(ErrorType.DATABASE_ERROR, 'Failed to delete book', error);
    }
  }

  async updateBook(bookId: string, updates: Partial<BookMetadata>): Promise<void> {
    this.ensureConnection();
    
    try {
      const fields = Object.keys(updates).filter(key => key !== 'id');
      if (fields.length === 0) return;
      
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => {
        const value = (updates as any)[field];
        return value instanceof Date ? value.toISOString() : value;
      });
      
      const stmt = this.db!.prepare(`UPDATE books SET ${setClause} WHERE id = ?`);
      stmt.run(...values, bookId);
    } catch (error) {
      throw this.createError(ErrorType.DATABASE_ERROR, 'Failed to update book', error);
    }
  }

  // 阅读进度
  async saveProgress(bookId: string, progress: ReadingProgress): Promise<void> {
    this.ensureConnection();
    
    try {
      const stmt = this.db!.prepare(`
        INSERT OR REPLACE INTO reading_progress (
          bookId, currentPage, currentChapter, percentage, position, lastUpdateTime
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        bookId,
        progress.currentPage,
        progress.currentChapter,
        progress.percentage,
        progress.position,
        progress.lastUpdateTime.toISOString()
      );
      
      // 更新书籍的最后阅读时间
      await this.updateBook(bookId, { lastReadDate: new Date() });
    } catch (error) {
      throw this.createError(ErrorType.DATABASE_ERROR, 'Failed to save progress', error);
    }
  }

  async getProgress(bookId: string): Promise<ReadingProgress | null> {
    this.ensureConnection();
    
    try {
      const stmt = this.db!.prepare('SELECT * FROM reading_progress WHERE bookId = ?');
      const row = stmt.get(bookId) as any;
      
      if (!row) return null;
      
      return {
        bookId: row.bookId,
        currentPage: row.currentPage,
        currentChapter: row.currentChapter,
        percentage: row.percentage,
        position: row.position,
        lastUpdateTime: new Date(row.lastUpdateTime)
      };
    } catch (error) {
      throw this.createError(ErrorType.DATABASE_ERROR, 'Failed to get progress', error);
    }
  }

  async deleteProgress(bookId: string): Promise<void> {
    this.ensureConnection();
    
    try {
      const stmt = this.db!.prepare('DELETE FROM reading_progress WHERE bookId = ?');
      stmt.run(bookId);
    } catch (error) {
      throw this.createError(ErrorType.DATABASE_ERROR, 'Failed to delete progress', error);
    }
  }

  // 生词表
  async addVocabulary(word: VocabularyItem): Promise<void> {
    this.ensureConnection();
    
    try {
      const stmt = this.db!.prepare(`
        INSERT OR REPLACE INTO vocabulary (
          id, word, translation, pronunciation, example, bookId, 
          context, addedDate, mastered
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        word.id,
        word.word,
        word.translation,
        word.pronunciation || null,
        word.example || null,
        word.bookId,
        word.context,
        word.addedDate.toISOString(),
        word.mastered ? 1 : 0
      );
    } catch (error) {
      throw this.createError(ErrorType.DATABASE_ERROR, 'Failed to add vocabulary', error);
    }
  }

  async getVocabulary(bookId?: string): Promise<VocabularyItem[]> {
    this.ensureConnection();
    
    try {
      let stmt;
      let rows;
      
      if (bookId) {
        stmt = this.db!.prepare('SELECT * FROM vocabulary WHERE bookId = ? ORDER BY addedDate DESC');
        rows = stmt.all(bookId) as any[];
      } else {
        stmt = this.db!.prepare('SELECT * FROM vocabulary ORDER BY addedDate DESC');
        rows = stmt.all() as any[];
      }
      
      return rows.map(row => ({
        id: row.id,
        word: row.word,
        translation: row.translation,
        pronunciation: row.pronunciation,
        example: row.example,
        bookId: row.bookId,
        context: row.context,
        addedDate: new Date(row.addedDate),
        mastered: Boolean(row.mastered)
      }));
    } catch (error) {
      throw this.createError(ErrorType.DATABASE_ERROR, 'Failed to get vocabulary', error);
    }
  }

  async deleteVocabulary(wordId: string): Promise<void> {
    this.ensureConnection();
    
    try {
      const stmt = this.db!.prepare('DELETE FROM vocabulary WHERE id = ?');
      stmt.run(wordId);
    } catch (error) {
      throw this.createError(ErrorType.DATABASE_ERROR, 'Failed to delete vocabulary', error);
    }
  }

  async updateVocabulary(wordId: string, updates: Partial<VocabularyItem>): Promise<void> {
    this.ensureConnection();
    
    try {
      const fields = Object.keys(updates).filter(key => key !== 'id');
      if (fields.length === 0) return;
      
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => {
        const value = (updates as any)[field];
        if (value instanceof Date) return value.toISOString();
        if (typeof value === 'boolean') return value ? 1 : 0;
        return value;
      });
      
      const stmt = this.db!.prepare(`UPDATE vocabulary SET ${setClause} WHERE id = ?`);
      stmt.run(...values, wordId);
    } catch (error) {
      throw this.createError(ErrorType.DATABASE_ERROR, 'Failed to update vocabulary', error);
    }
  }

  async markWordAsMastered(wordId: string, mastered: boolean): Promise<void> {
    this.ensureConnection();
    
    try {
      const stmt = this.db!.prepare('UPDATE vocabulary SET mastered = ? WHERE id = ?');
      stmt.run(mastered ? 1 : 0, wordId);
    } catch (error) {
      throw this.createError(ErrorType.DATABASE_ERROR, 'Failed to mark word as mastered', error);
    }
  }

  // 设置
  async saveSettings(bookId: string, settings: ReadingSettings): Promise<void> {
    this.ensureConnection();
    
    try {
      const stmt = this.db!.prepare(`
        INSERT OR REPLACE INTO reading_settings (
          bookId, fontFamily, fontSize, lineHeight, margin, theme, pageMode
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        bookId,
        settings.fontFamily,
        settings.fontSize,
        settings.lineHeight,
        settings.margin,
        settings.theme,
        settings.pageMode
      );
    } catch (error) {
      throw this.createError(ErrorType.DATABASE_ERROR, 'Failed to save settings', error);
    }
  }

  async getSettings(bookId: string): Promise<ReadingSettings | null> {
    this.ensureConnection();
    
    try {
      const stmt = this.db!.prepare('SELECT * FROM reading_settings WHERE bookId = ?');
      const row = stmt.get(bookId) as any;
      
      if (!row) return null;
      
      return {
        bookId: row.bookId,
        fontFamily: row.fontFamily,
        fontSize: row.fontSize,
        lineHeight: row.lineHeight,
        margin: row.margin,
        theme: row.theme,
        pageMode: row.pageMode
      };
    } catch (error) {
      throw this.createError(ErrorType.DATABASE_ERROR, 'Failed to get settings', error);
    }
  }

  async saveAppSettings(settings: AppSettings): Promise<void> {
    this.ensureConnection();
    
    try {
      const stmt = this.db!.prepare(`
        INSERT OR REPLACE INTO app_settings (
          id, theme, language, autoSave, cacheSize
        ) VALUES (1, ?, ?, ?, ?)
      `);
      
      stmt.run(
        settings.theme,
        settings.language,
        settings.autoSave ? 1 : 0,
        settings.cacheSize
      );
    } catch (error) {
      throw this.createError(ErrorType.DATABASE_ERROR, 'Failed to save app settings', error);
    }
  }

  async getAppSettings(): Promise<AppSettings> {
    this.ensureConnection();
    
    try {
      const stmt = this.db!.prepare('SELECT * FROM app_settings WHERE id = 1');
      const row = stmt.get() as any;
      
      if (!row) {
        // 返回默认设置
        return {
          theme: 'system',
          language: 'zh-CN',
          autoSave: true,
          cacheSize: 500 // MB
        };
      }
      
      return {
        theme: row.theme,
        language: row.language,
        autoSave: Boolean(row.autoSave),
        cacheSize: row.cacheSize
      };
    } catch (error) {
      throw this.createError(ErrorType.DATABASE_ERROR, 'Failed to get app settings', error);
    }
  }

  async backup(): Promise<string> {
    this.ensureConnection();
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(path.dirname(this.dbPath), `backup-${timestamp}.db`);
      
      // Simple file copy approach for backup
      const fs = require('fs');
      fs.copyFileSync(this.dbPath, backupPath);
      
      return backupPath;
    } catch (error) {
      throw this.createError(ErrorType.DATABASE_ERROR, 'Failed to create backup', error);
    }
  }

  async restore(backupPath: string): Promise<void> {
    try {
      if (this.db) {
        this.db.close();
      }
      
      // 复制备份文件到当前数据库位置
      const fs = require('fs');
      fs.copyFileSync(backupPath, this.dbPath);
      
      // 重新初始化数据库
      await this.initialize();
    } catch (error) {
      throw this.createError(ErrorType.DATABASE_ERROR, 'Failed to restore backup', error);
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) return;

    // 创建版本表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY
      )
    `);

    // 创建书籍表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS books (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        cover TEXT,
        format TEXT NOT NULL CHECK (format IN ('epub', 'pdf', 'mobi', 'txt')),
        filePath TEXT NOT NULL,
        fileSize INTEGER NOT NULL,
        importDate TEXT NOT NULL,
        lastReadDate TEXT,
        totalPages INTEGER NOT NULL,
        language TEXT NOT NULL,
        UNIQUE(filePath)
      )
    `);

    // 创建阅读进度表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS reading_progress (
        bookId TEXT PRIMARY KEY,
        currentPage INTEGER NOT NULL,
        currentChapter INTEGER NOT NULL,
        percentage REAL NOT NULL,
        position TEXT NOT NULL,
        lastUpdateTime TEXT NOT NULL,
        FOREIGN KEY (bookId) REFERENCES books(id) ON DELETE CASCADE
      )
    `);

    // 创建生词表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS vocabulary (
        id TEXT PRIMARY KEY,
        word TEXT NOT NULL,
        translation TEXT NOT NULL,
        pronunciation TEXT,
        example TEXT,
        bookId TEXT NOT NULL,
        context TEXT NOT NULL,
        addedDate TEXT NOT NULL,
        mastered INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (bookId) REFERENCES books(id) ON DELETE CASCADE
      )
    `);

    // 创建阅读设置表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS reading_settings (
        bookId TEXT PRIMARY KEY,
        fontFamily TEXT NOT NULL,
        fontSize INTEGER NOT NULL,
        lineHeight REAL NOT NULL,
        margin INTEGER NOT NULL,
        theme TEXT NOT NULL CHECK (theme IN ('light', 'dark')),
        pageMode TEXT NOT NULL CHECK (pageMode IN ('scroll', 'pagination')),
        FOREIGN KEY (bookId) REFERENCES books(id) ON DELETE CASCADE
      )
    `);

    // 创建应用设置表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        theme TEXT NOT NULL CHECK (theme IN ('light', 'dark', 'system')),
        language TEXT NOT NULL CHECK (language IN ('zh-CN', 'en-US')),
        autoSave INTEGER NOT NULL DEFAULT 1,
        cacheSize INTEGER NOT NULL DEFAULT 500
      )
    `);

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_books_import_date ON books(importDate);
      CREATE INDEX IF NOT EXISTS idx_books_last_read_date ON books(lastReadDate);
      CREATE INDEX IF NOT EXISTS idx_vocabulary_book_id ON vocabulary(bookId);
      CREATE INDEX IF NOT EXISTS idx_vocabulary_added_date ON vocabulary(addedDate);
      CREATE INDEX IF NOT EXISTS idx_vocabulary_mastered ON vocabulary(mastered);
    `);
  }

  private async runMigrations(): Promise<void> {
    if (!this.db) return;

    try {
      const migrations = new DatabaseMigrations(this.db);
      await migrations.runMigrations();
    } catch (error) {
      throw this.createError(ErrorType.DATABASE_ERROR, 'Database migration failed', error);
    }
  }

  private mapRowToBook(row: any): BookMetadata {
    return {
      id: row.id,
      title: row.title,
      author: row.author,
      cover: row.cover,
      format: row.format,
      filePath: row.filePath,
      fileSize: row.fileSize,
      importDate: new Date(row.importDate),
      lastReadDate: row.lastReadDate ? new Date(row.lastReadDate) : undefined,
      totalPages: row.totalPages,
      language: row.language
    };
  }

  private ensureConnection(): void {
    if (!this.db) {
      throw this.createError(ErrorType.DATABASE_ERROR, 'Database not initialized');
    }
  }

  private createError(type: ErrorType, message: string, details?: unknown): AppError {
    return {
      type,
      message,
      details,
      timestamp: new Date(),
      recoverable: type !== ErrorType.DATABASE_ERROR
    };
  }
}