import Database from 'better-sqlite3';
import { DatabaseMigrations, Migration } from '../DatabaseMigrations';
import { ErrorType } from '../../../shared/types';
import fs from 'fs';
import path from 'path';

describe('DatabaseMigrations', () => {
  let db: Database.Database;
  let migrations: DatabaseMigrations;
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = path.join('/tmp', `test-migrations-${Date.now()}.db`);
    db = new Database(testDbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // 创建基础的 schema_version 表
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY
      )
    `);

    migrations = new DatabaseMigrations(db);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('版本管理', () => {
    test('应该返回正确的当前版本', async () => {
      // 初始版本应该是 0
      const initialVersion = await migrations.getCurrentVersion();
      expect(initialVersion).toBe(0);

      // 插入版本记录
      db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(5);
      const currentVersion = await migrations.getCurrentVersion();
      expect(currentVersion).toBe(5);
    });

    test('应该返回正确的最新版本', async () => {
      const latestVersion = await migrations.getLatestVersion();
      expect(latestVersion).toBe(1); // 基础版本
    });
  });

  describe('迁移执行', () => {
    test('应该跳过已经是最新版本的迁移', async () => {
      // 设置当前版本为最新版本
      db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(1);

      // 运行迁移应该不做任何事情
      await migrations.runMigrations();

      const version = await migrations.getCurrentVersion();
      expect(version).toBe(1);
    });

    test('应该正确执行迁移', async () => {
      // 创建一个测试迁移
      const testMigrations = new TestDatabaseMigrations(db);

      await testMigrations.runMigrations();

      // 验证迁移是否执行
      const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='test_table'
      `).get();

      expect(tables).toBeDefined();

      const version = await testMigrations.getCurrentVersion();
      expect(version).toBe(2);
    });

    test('应该处理迁移失败', async () => {
      const failingMigrations = new FailingDatabaseMigrations(db);

      await expect(failingMigrations.runMigrations()).rejects.toMatchObject({
        type: ErrorType.DATABASE_ERROR,
        message: 'Database migration failed'
      });
    });
  });

  describe('回滚功能', () => {
    test('应该正确回滚迁移', async () => {
      const testMigrations = new TestDatabaseMigrations(db);

      // 先执行迁移
      await testMigrations.runMigrations();

      // 验证表存在
      let tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='test_table'
      `).get();
      expect(tables).toBeDefined();

      // 验证当前版本是 2
      let version = await testMigrations.getCurrentVersion();
      expect(version).toBe(2);

      // 回滚到版本 0 (这应该回滚版本2的迁移)
      await testMigrations.rollback(0);

      // 验证表被删除
      tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='test_table'
      `).get();
      expect(tables).toBeUndefined();

      // 检查版本是否正确更新
      version = await testMigrations.getCurrentVersion();
      expect(version).toBe(0);
    });

    test('应该跳过不需要的回滚', async () => {
      // 当前版本低于或等于目标版本时应该跳过
      db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(1);

      const testMigrations = new TestDatabaseMigrations(db);
      await testMigrations.rollback(2); // 回滚到更高版本

      const version = await testMigrations.getCurrentVersion();
      expect(version).toBe(1); // 版本不应该改变
    });
  });

  describe('架构验证', () => {
    test('应该验证完整的架构', async () => {
      // 创建完整的数据库架构
      createCompleteSchema(db);

      const isValid = await migrations.validateSchema();
      expect(isValid).toBe(true);
    });

    test('应该检测缺失的表', async () => {
      // 只创建部分表
      db.exec(`
        CREATE TABLE books (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL
        )
      `);

      const isValid = await migrations.validateSchema();
      expect(isValid).toBe(false);
    });

    test('应该检测外键约束违反', async () => {
      createCompleteSchema(db);

      // 插入正常数据
      db.prepare('INSERT INTO books (id, title, author, format, filePath, fileSize, importDate, totalPages, language) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run('book1', 'Test Book', 'Test Author', 'epub', '/path', 1000, new Date().toISOString(), 100, 'zh-CN');

      // 临时禁用外键约束以插入违反约束的数据
      db.pragma('foreign_keys = OFF');
      db.prepare('INSERT INTO reading_progress (bookId, currentPage, currentChapter, percentage, position, lastUpdateTime) VALUES (?, ?, ?, ?, ?, ?)')
        .run('nonexistent-book', 1, 1, 0.1, 'pos', new Date().toISOString());
      db.pragma('foreign_keys = ON');

      const isValid = await migrations.validateSchema();
      expect(isValid).toBe(false);
    });
  });

  describe('架构修复', () => {
    test('应该修复缺失的索引', async () => {
      createCompleteSchema(db);

      // 删除一个索引
      db.exec('DROP INDEX IF EXISTS idx_books_import_date');

      // 修复架构
      await migrations.repairSchema();

      // 验证索引被重新创建
      const index = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND name='idx_books_import_date'
      `).get();

      expect(index).toBeDefined();
    });
  });

  describe('架构信息', () => {
    test('应该返回正确的架构信息', async () => {
      createCompleteSchema(db);
      db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(1);

      const info = await migrations.getSchemaInfo();

      expect(info.currentVersion).toBe(1);
      expect(info.latestVersion).toBe(1);
      expect(info.tables).toContain('books');
      expect(info.tables).toContain('vocabulary');
      expect(info.indexes).toContain('idx_books_import_date');
    });
  });
});

// 测试用的迁移类
class TestDatabaseMigrations extends DatabaseMigrations {
  constructor(db: Database.Database) {
    super(db);
    // 重写 migrations 数组以包含测试迁移
    (this as any).migrations = [
      {
        version: 2,
        description: 'Add test table',
        up: (db: Database.Database) => {
          db.exec(`
            CREATE TABLE test_table (
              id INTEGER PRIMARY KEY,
              name TEXT NOT NULL
            )
          `);
        },
        down: (db: Database.Database) => {
          db.exec('DROP TABLE IF EXISTS test_table');
        }
      }
    ];
  }
}

// 失败的迁移类用于测试错误处理
class FailingDatabaseMigrations extends DatabaseMigrations {
  constructor(db: Database.Database) {
    super(db);
    (this as any).migrations = [
      {
        version: 2,
        description: 'Failing migration',
        up: (db: Database.Database) => {
          // 故意执行无效的 SQL
          db.exec('INVALID SQL STATEMENT');
        }
      }
    ];
  }
}

// 创建完整的数据库架构的辅助函数
function createCompleteSchema(db: Database.Database): void {
  db.exec(`
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
    );

    CREATE TABLE IF NOT EXISTS reading_progress (
      bookId TEXT PRIMARY KEY,
      currentPage INTEGER NOT NULL,
      currentChapter INTEGER NOT NULL,
      percentage REAL NOT NULL,
      position TEXT NOT NULL,
      lastUpdateTime TEXT NOT NULL,
      FOREIGN KEY (bookId) REFERENCES books(id) ON DELETE CASCADE
    );

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
    );

    CREATE TABLE IF NOT EXISTS reading_settings (
      bookId TEXT PRIMARY KEY,
      fontFamily TEXT NOT NULL,
      fontSize INTEGER NOT NULL,
      lineHeight REAL NOT NULL,
      margin INTEGER NOT NULL,
      theme TEXT NOT NULL CHECK (theme IN ('light', 'dark')),
      pageMode TEXT NOT NULL CHECK (pageMode IN ('scroll', 'pagination')),
      FOREIGN KEY (bookId) REFERENCES books(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      theme TEXT NOT NULL CHECK (theme IN ('light', 'dark', 'system')),
      language TEXT NOT NULL CHECK (language IN ('zh-CN', 'en-US')),
      autoSave INTEGER NOT NULL DEFAULT 1,
      cacheSize INTEGER NOT NULL DEFAULT 500
    );

    CREATE INDEX IF NOT EXISTS idx_books_import_date ON books(importDate);
    CREATE INDEX IF NOT EXISTS idx_books_last_read_date ON books(lastReadDate);
    CREATE INDEX IF NOT EXISTS idx_vocabulary_book_id ON vocabulary(bookId);
    CREATE INDEX IF NOT EXISTS idx_vocabulary_added_date ON vocabulary(addedDate);
    CREATE INDEX IF NOT EXISTS idx_vocabulary_mastered ON vocabulary(mastered);
  `);
}