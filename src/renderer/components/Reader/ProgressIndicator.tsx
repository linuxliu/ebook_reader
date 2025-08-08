import React from 'react';
import { ReadingProgress } from '../../../shared/types';

interface ProgressIndicatorProps {
  progress: ReadingProgress;
  totalPages: number;
  isVisible?: boolean;
  showDetails?: boolean;
  className?: string;
  onProgressClick?: (percentage: number) => void;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  totalPages,
  isVisible = true,
  showDetails = true,
  className = '',
  onProgressClick
}) => {
  if (!isVisible || !progress) return null;

  const handleProgressBarClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onProgressClick) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = Math.round((clickX / rect.width) * 100);
    onProgressClick(Math.max(0, Math.min(100, percentage)));
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProgressColor = (percentage: number) => {
    if (percentage < 25) return 'bg-red-500';
    if (percentage < 50) return 'bg-yellow-500';
    if (percentage < 75) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <div className={`progress-indicator ${className}`}>
      {/* 进度条 */}
      <div className="progress-bar-container mb-2">
        <div
          className={`
            relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden
            ${onProgressClick ? 'cursor-pointer' : ''}
          `}
          onClick={handleProgressBarClick}
          title={onProgressClick ? '点击跳转到指定位置' : undefined}
        >
          <div
            className={`
              h-full transition-all duration-300 ease-out rounded-full
              ${getProgressColor(progress.percentage)}
            `}
            style={{ width: `${progress.percentage}%` }}
          />
          
          {/* 进度指示器 */}
          <div
            className="absolute top-0 w-1 h-full bg-white shadow-md transition-all duration-300"
            style={{ left: `${progress.percentage}%`, transform: 'translateX(-50%)' }}
          />
        </div>
      </div>

      {/* 详细信息 */}
      {showDetails && (
        <div className="progress-details flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
          <div className="progress-stats flex items-center space-x-4">
            <span className="page-info">
              第 {progress.currentPage} 页 / 共 {totalPages} 页
            </span>
            <span className="percentage-info font-medium">
              {progress.percentage}%
            </span>
          </div>
          
          <div className="progress-meta flex items-center space-x-2">
            <span className="last-update" title="最后更新时间">
              {formatTime(new Date(progress.lastUpdateTime))}
            </span>
            
            {/* 进度状态指示器 */}
            <div className="flex items-center space-x-1">
              <div
                className={`
                  w-2 h-2 rounded-full
                  ${progress.percentage === 0 ? 'bg-gray-400' : ''}
                  ${progress.percentage > 0 && progress.percentage < 100 ? 'bg-blue-500' : ''}
                  ${progress.percentage === 100 ? 'bg-green-500' : ''}
                `}
                title={
                  progress.percentage === 0 ? '未开始阅读' :
                  progress.percentage === 100 ? '已完成阅读' : '阅读中'
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* 章节信息 */}
      {showDetails && progress.currentChapter !== undefined && (
        <div className="chapter-info mt-1 text-xs text-gray-500 dark:text-gray-500">
          当前章节: 第 {progress.currentChapter + 1} 章
        </div>
      )}
    </div>
  );
};

export default ProgressIndicator;