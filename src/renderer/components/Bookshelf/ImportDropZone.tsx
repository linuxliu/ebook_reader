import React, { useState, useCallback } from 'react';
import { BookMetadata, AppError, ErrorType } from '../../../shared/types';
import { ipcClient } from '../../services/IPCClient';

interface ImportDropZoneProps {
  onImportSuccess: (book: BookMetadata) => void;
  onImportError: (error: AppError) => void;
  children: React.ReactNode;
}

const ImportDropZone: React.FC<ImportDropZoneProps> = ({
  onImportSuccess,
  onImportError,
  children
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const validateFile = (file: File): boolean => {
    const supportedFormats = ['epub', 'pdf', 'mobi', 'txt'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !supportedFormats.includes(fileExtension)) {
      onImportError({
        type: ErrorType.UNSUPPORTED_FORMAT,
        message: `不支持的文件格式: ${fileExtension}。支持的格式: ${supportedFormats.join(', ')}`,
        timestamp: new Date(),
        recoverable: false
      });
      return false;
    }

    // 检查文件大小 (限制为 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      onImportError({
        type: ErrorType.STORAGE_FULL,
        message: `文件过大: ${(file.size / 1024 / 1024).toFixed(1)}MB。最大支持 100MB`,
        timestamp: new Date(),
        recoverable: false
      });
      return false;
    }

    return true;
  };

  const handleFileImport = async (filePath: string) => {
    if (isImporting) return;

    setIsImporting(true);
    try {
      const book = await ipcClient.importBook(filePath);
      onImportSuccess(book);
    } catch (error) {
      console.error('Import failed:', error);
      onImportError(error as AppError);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isDragOver) {
      setIsDragOver(true);
    }
  }, [isDragOver]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 只有当离开整个拖拽区域时才设置为 false
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (isImporting) return;

    const files = Array.from(e.dataTransfer.files);
    
    if (files.length === 0) {
      onImportError({
        type: ErrorType.FILE_NOT_FOUND,
        message: '没有检测到有效的文件',
        timestamp: new Date(),
        recoverable: false
      });
      return;
    }

    if (files.length > 1) {
      onImportError({
        type: ErrorType.PARSE_ERROR,
        message: '一次只能导入一个文件',
        timestamp: new Date(),
        recoverable: false
      });
      return;
    }

    const file = files[0];
    
    if (!validateFile(file)) {
      return;
    }

    // 使用文件路径导入
    await handleFileImport(file.path);
  }, [isImporting, onImportSuccess, onImportError]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative transition-all duration-200
        ${isDragOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
      `}
    >
      {children}
      
      {/* 拖拽覆盖层 */}
      {isDragOver && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-blue-50/90 dark:bg-blue-900/40 border-2 border-dashed border-blue-400 dark:border-blue-500 rounded-lg">
          <div className="text-center">
            <div className="text-4xl mb-2">📚</div>
            <p className="text-blue-700 dark:text-blue-300 font-medium">
              释放以导入电子书
            </p>
            <p className="text-blue-600 dark:text-blue-400 text-sm mt-1">
              支持 EPUB、PDF、MOBI、TXT 格式
            </p>
          </div>
        </div>
      )}
      
      {/* 导入中覆盖层 */}
      {isImporting && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 dark:bg-gray-900/80">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-2"></div>
            <p className="text-gray-700 dark:text-gray-300 font-medium">
              正在导入...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportDropZone;