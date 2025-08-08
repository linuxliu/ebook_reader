import React, { useState } from 'react';
import { BookMetadata, AppError, ErrorType } from '../../../shared/types';
import { ipcClient } from '../../services/IPCClient';

interface ImportProgress {
  fileName: string;
  progress: number; // 0-100
  stage: 'selecting' | 'parsing' | 'caching' | 'saving' | 'complete' | 'error';
  error?: AppError;
}

interface ImportButtonProps {
  onImportSuccess: (book: BookMetadata) => void;
  onImportError: (error: AppError) => void;
  disabled?: boolean;
}

const ImportButton: React.FC<ImportButtonProps> = ({ 
  onImportSuccess, 
  onImportError, 
  disabled = false 
}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);

  const handleImport = async () => {
    if (isImporting) return;

    setIsImporting(true);
    setImportProgress({
      fileName: '',
      progress: 0,
      stage: 'selecting'
    });

    try {
      // 阶段1: 文件选择和验证
      setImportProgress(prev => prev ? { ...prev, stage: 'selecting', progress: 10 } : null);
      
      // 调用主进程的导入功能（会打开文件选择对话框）
      const response = await ipcClient.importBook();
      
      if (!response || !response.book) {
        // 用户取消了文件选择
        setIsImporting(false);
        setImportProgress(null);
        return;
      }

      const book = response.book;

      // 验证导入的书籍数据
      console.log('Validating imported book data:', book);
      console.log('Title:', book.title, 'Author:', book.author, 'Format:', book.format);
      
      if (!book.title || !book.author || !book.format) {
        const missingFields = [];
        if (!book.title) missingFields.push('title');
        if (!book.author) missingFields.push('author');
        if (!book.format) missingFields.push('format');
        
        console.error('Missing fields:', missingFields);
        throw {
          type: ErrorType.PARSE_ERROR,
          message: `书籍信息不完整，缺少字段: ${missingFields.join(', ')}`,
          timestamp: new Date(),
          recoverable: true
        } as AppError;
      }

      // 阶段2: 解析书籍内容
      setImportProgress(prev => prev ? { 
        ...prev, 
        fileName: book.title || '未知书籍',
        stage: 'parsing', 
        progress: 30 
      } : null);

      // 模拟解析进度
      await new Promise(resolve => setTimeout(resolve, 500));
      setImportProgress(prev => prev ? { ...prev, progress: 60 } : null);

      // 阶段3: 生成缓存
      setImportProgress(prev => prev ? { ...prev, stage: 'caching', progress: 80 } : null);
      await new Promise(resolve => setTimeout(resolve, 300));

      // 阶段4: 保存到数据库
      setImportProgress(prev => prev ? { ...prev, stage: 'saving', progress: 90 } : null);
      await new Promise(resolve => setTimeout(resolve, 200));

      // 完成
      setImportProgress(prev => prev ? { ...prev, stage: 'complete', progress: 100 } : null);
      
      // 显示成功状态一段时间
      setTimeout(() => {
        setIsImporting(false);
        setImportProgress(null);
        onImportSuccess(book);
      }, 1000);

    } catch (error) {
      console.error('Import failed:', error);
      
      const appError = error as AppError || {
        type: ErrorType.PARSE_ERROR,
        message: '导入失败',
        timestamp: new Date(),
        recoverable: true
      };

      setImportProgress(prev => prev ? { 
        ...prev, 
        stage: 'error', 
        progress: 0,
        error: appError
      } : null);

      // 显示错误状态一段时间后清理
      setTimeout(() => {
        setIsImporting(false);
        setImportProgress(null);
        onImportError(appError);
      }, 3000);
    }
  };

  const getStageText = (stage: ImportProgress['stage']) => {
    switch (stage) {
      case 'selecting': return '选择文件...';
      case 'parsing': return '解析内容...';
      case 'caching': return '生成缓存...';
      case 'saving': return '保存数据...';
      case 'complete': return '导入完成';
      case 'error': return '导入失败';
      default: return '处理中...';
    }
  };

  const getStageIcon = (stage: ImportProgress['stage']) => {
    switch (stage) {
      case 'selecting':
        return (
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'parsing':
      case 'caching':
      case 'saving':
        return (
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'complete':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        );
    }
  };

  if (isImporting && importProgress) {
    return (
      <div className="flex flex-col gap-2 min-w-[200px]">
        {/* 导入按钮（显示进度状态） */}
        <button
          disabled
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
            importProgress.stage === 'complete' 
              ? 'bg-green-600 text-white'
              : importProgress.stage === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-blue-600 text-white'
          }`}
          title={importProgress.fileName || '导入中...'}
        >
          {getStageIcon(importProgress.stage)}
          <span className="hidden sm:inline">{getStageText(importProgress.stage)}</span>
          <span className="sm:hidden">
            {importProgress.stage === 'complete' ? '完成' : 
             importProgress.stage === 'error' ? '失败' : '导入中'}
          </span>
        </button>

        {/* 进度条 */}
        {importProgress.stage !== 'complete' && importProgress.stage !== 'error' && (
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div 
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${importProgress.progress}%` }}
            />
          </div>
        )}

        {/* 文件名显示 */}
        {importProgress.fileName && (
          <div className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[200px]" title={importProgress.fileName}>
            {importProgress.fileName}
          </div>
        )}

        {/* 错误信息 */}
        {importProgress.stage === 'error' && importProgress.error && (
          <div className="text-xs text-red-600 dark:text-red-400 max-w-[200px]">
            {importProgress.error.message}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleImport}
      disabled={disabled || isImporting}
      className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 whitespace-nowrap"
      title="导入电子书文件"
    >
      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      <span className="hidden sm:inline">导入书籍</span>
      <span className="sm:hidden">导入</span>
    </button>
  );
};

export default ImportButton;