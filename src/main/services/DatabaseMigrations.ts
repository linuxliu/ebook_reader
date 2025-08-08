import Database from 'better-sqlite3';
import { ErrorType, AppError } from '../../shared/types';

export interface Migration {
  version: number;
  description: string;
  up: (db: Database.Database) => void;
  down?: (db: Database.Database) => void;
}

export class DatabaseMigrations {
  private migrations: Migration[] = [
    // 未来的迁移可以在这里添加
    // {
    //   version: 2,
    //   description: 'Add reading statistics table',
    //   up: (db) => {
    //     db.exec(`
    //       CREATE TABLE reading_statistics (
    //         bookId TEXT PRIMARY KEY,
    //         totalReadingTime INTEGER NOT NULL DEFAULT 0,
    //         pagesRead INTEGER NOT NULL DEFAULT 0,
    //         wordsLearned INTEGER NOT NULL DEFAULT 0,
    //         lastReadDate TEXT,
    //         readingStreak INTEGER NOT NULL DEFAULT 0,
    //         FOREIGN KEY (bookId) REFERENCES books(id) ON DELETE CASCADE
    //       )
    //     `);
    //   },
    //   down: (db) => {
    //     db.exec('DROP TABLE IF EXISTS reading_statistics');
    //   }
    // }
  ];

  constructor(private db: Database.Database) {}

  async getCurrentVersion(): Promise<number> {
    try {
      const row = this.db.prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1').get() as any;
      return row ? row.version : 0;
    } catch {
      return 0;
    }
  }

  async getLatestVersion(): Promise<number> {
    return this.migrations.length > 0 
      ? Math.max(...this.migrations.map(m => m.version))
      : 1; // 基础版本
  }

  async runMigrations(targetVersion?: number): Promise<void> {
    const currentVersion = await this.getCurrentVersion();
    const latestVersion = targetVersion || await this.getLatestVersion();

    if (currentVersion >= latestVersion) {
      return; // 已经是最新版本
    }

    const migrationsToRun = this.migrations
      .filter(m => m.version > currentVersion && m.version <= latestVersion)
      .sort((a, b) => a.version - b.version);

    if (migrationsToRun.length === 0) {
      // 没有迁移需要运行，只更新版本号
      this.updateVersion(latestVersion);
      return;
    }

    const transaction = this.db.transaction(() => {
      for (const migration of migrationsToRun) {
        try {
          migration.up(this.db);
          this.updateVersion(migration.version);
        } catch (error) {
          throw this.createError(
            ErrorType.DATABASE_ERROR,
            `Migration ${migration.version} failed: ${migration.description}`,
            error
          );
        }
      }
    });

    try {
      transaction();
    } catch (error) {
      throw this.createError(
        ErrorType.DATABASE_ERROR,
        'Database migration failed',
        error
      );
    }
  }

  async rollback(targetVersion: number): Promise<void> {
    const currentVersion = await this.getCurrentVersion();

    if (currentVersion <= targetVersion) {
      return; // 目标版本不低于当前版本
    }

    const migrationsToRollback = this.migrations
      .filter(m => m.version > targetVersion && m.version <= currentVersion && m.down)
      .sort((a, b) => b.version - a.version); // 降序执行回滚

    const transaction = this.db.transaction(() => {
      for (const migration of migrationsToRollback) {
        try {
          migration.down!(this.db);
        } catch (error) {
          throw this.createError(
            ErrorType.DATABASE_ERROR,
            `Rollback of migration ${migration.version} failed: ${migration.description}`,
            error
          );
        }
      }
      this.updateVersion(targetVersion);
    });

    try {
      transaction();
    } catch (error) {
      throw this.createError(
        ErrorType.DATABASE_ERROR,
        'Database rollback failed',
        error
      );
    }
  }

  async validateSchema(): Promise<boolean> {
    try {
      // 验证必要的表是否存在
      const requiredTables = [
        'books',
        'reading_progress',
        'vocabulary',
        'reading_settings',
        'app_settings',
        'schema_version'
      ];

      for (const table of requiredTables) {
        const result = this.db.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name=?
        `).get(table);

        if (!result) {
          console.error(`Required table '${table}' is missing`);
          return false;
        }
      }

      // 验证外键约束
      const foreignKeyCheck = this.db.prepare('PRAGMA foreign_key_check').all();
      if (foreignKeyCheck.length > 0) {
        console.error('Foreign key constraint violations found:', foreignKeyCheck);
        return false;
      }

      // 验证索引
      const requiredIndexes = [
        'idx_books_import_date',
        'idx_books_last_read_date',
        'idx_vocabulary_book_id',
        'idx_vocabulary_added_date',
        'idx_vocabulary_mastered'
      ];

      for (const index of requiredIndexes) {
        const result = this.db.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='index' AND name=?
        `).get(index);

        if (!result) {
          console.warn(`Index '${index}' is missing`);
        }
      }

      return true;
    } catch (error) {
      console.error('Schema validation failed:', error);
      return false;
    }
  }

  async repairSchema(): Promise<void> {
    try {
      console.log('Attempting to repair database schema...');

      // 重新创建缺失的索引
      const indexCreationStatements = [
        'CREATE INDEX IF NOT EXISTS idx_books_import_date ON books(importDate)',
        'CREATE INDEX IF NOT EXISTS idx_books_last_read_date ON books(lastReadDate)',
        'CREATE INDEX IF NOT EXISTS idx_vocabulary_book_id ON vocabulary(bookId)',
        'CREATE INDEX IF NOT EXISTS idx_vocabulary_added_date ON vocabulary(addedDate)',
        'CREATE INDEX IF NOT EXISTS idx_vocabulary_mastered ON vocabulary(mastered)'
      ];

      const transaction = this.db.transaction(() => {
        for (const statement of indexCreationStatements) {
          this.db.exec(statement);
        }
      });

      transaction();
      console.log('Schema repair completed successfully');
    } catch (error) {
      throw this.createError(
        ErrorType.DATABASE_ERROR,
        'Schema repair failed',
        error
      );
    }
  }

  async getSchemaInfo(): Promise<{
    currentVersion: number;
    latestVersion: number;
    tables: string[];
    indexes: string[];
  }> {
    const currentVersion = await this.getCurrentVersion();
    const latestVersion = await this.getLatestVersion();

    const tables = this.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all().map((row: any) => row.name);

    const indexes = this.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='index' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all().map((row: any) => row.name);

    return {
      currentVersion,
      latestVersion,
      tables,
      indexes
    };
  }

  private updateVersion(version: number): void {
    // First, delete all existing versions
    this.db.prepare('DELETE FROM schema_version').run();
    
    // Then insert the new version
    this.db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(version);
  }

  private createError(type: ErrorType, message: string, details?: unknown): AppError {
    return {
      type,
      message,
      details,
      timestamp: new Date(),
      recoverable: false
    };
  }
}

// 导出一个便利函数用于运行迁移
export async function runDatabaseMigrations(db: Database.Database): Promise<void> {
  const migrations = new DatabaseMigrations(db);
  await migrations.runMigrations();
}

// 导出一个便利函数用于验证数据库架构
export async function validateDatabaseSchema(db: Database.Database): Promise<boolean> {
  const migrations = new DatabaseMigrations(db);
  return await migrations.validateSchema();
}