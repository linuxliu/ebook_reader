import React, { useState, useEffect, useRef } from 'react';
import { TranslationResult, VocabularyItem } from '../../../shared/types';
import { TranslationClient } from '../../services/TranslationClient';
import { generateWordId, findContainingSentence } from '../../utils/textProcessing';

interface TranslationPopupProps {
  selectedText: string;
  position: { x: number; y: number };
  visible: boolean;
  bookId: string;
  context: string;
  onAddToVocabulary: (word: VocabularyItem) => void;
  onClose: () => void;
}

const TranslationPopup: React.FC<TranslationPopupProps> = ({
  selectedText,
  position,
  visible,
  bookId,
  context,
  onAddToVocabulary,
  onClose
}) => {
  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddingToVocabulary, setIsAddingToVocabulary] = useState(false);
  const [addedToVocabulary, setAddedToVocabulary] = useState(false);
  
  const popupRef = useRef<HTMLDivElement>(null);
  const translationClient = useRef(new TranslationClient());

  // Calculate popup position to avoid going off-screen
  const getAdjustedPosition = () => {
    if (!popupRef.current) return position;

    const popup = popupRef.current;
    const rect = popup.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = position.x;
    let adjustedY = position.y;

    // Adjust horizontal position
    if (position.x + rect.width > viewportWidth) {
      adjustedX = viewportWidth - rect.width - 10;
    }
    if (adjustedX < 10) {
      adjustedX = 10;
    }

    // Adjust vertical position
    if (position.y + rect.height > viewportHeight) {
      adjustedY = position.y - rect.height - 10;
    }
    if (adjustedY < 10) {
      adjustedY = 10;
    }

    return { x: adjustedX, y: adjustedY };
  };

  // Fetch translation when selectedText changes
  useEffect(() => {
    if (!selectedText || !visible) {
      setTranslation(null);
      setError(null);
      setAddedToVocabulary(false);
      return;
    }

    const fetchTranslation = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const result = await translationClient.current.translate(selectedText);
        setTranslation(result);
      } catch (err) {
        setError('翻译失败，请稍后重试');
        console.error('Translation error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTranslation();
  }, [selectedText, visible]);

  // Handle click outside to close popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [visible, onClose]);

  // Handle escape key to close popup
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => document.removeEventListener('keydown', handleEscapeKey);
    }
  }, [visible, onClose]);

  const handleAddToVocabulary = async () => {
    if (!translation || isAddingToVocabulary) return;

    setIsAddingToVocabulary(true);
    
    try {
      const vocabularyItem: VocabularyItem = {
        id: generateWordId(selectedText, context, bookId),
        word: selectedText,
        translation: translation.translation,
        pronunciation: translation.pronunciation,
        example: translation.examples?.[0],
        bookId,
        context: findContainingSentence(context, selectedText),
        addedDate: new Date(),
        mastered: false
      };

      await onAddToVocabulary(vocabularyItem);
      setAddedToVocabulary(true);
      
      // Auto-close after 1 second
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to add to vocabulary:', err);
      setError('添加到生词表失败');
    } finally {
      setIsAddingToVocabulary(false);
    }
  };

  if (!visible) return null;

  const adjustedPosition = getAdjustedPosition();

  return (
    <div
      ref={popupRef}
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-w-sm"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
        minWidth: '280px',
        maxWidth: '400px'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-600">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {selectedText}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="关闭"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        {loading && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">翻译中...</span>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 py-2">
            {error}
          </div>
        )}

        {translation && !loading && (
          <div className="space-y-3">
            {/* Translation */}
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                翻译
              </div>
              <div className="text-base text-gray-900 dark:text-gray-100">
                {translation.translation}
              </div>
            </div>

            {/* Pronunciation */}
            {translation.pronunciation && (
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  发音
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                  {translation.pronunciation}
                </div>
              </div>
            )}

            {/* Definitions */}
            {translation.definitions && translation.definitions.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  释义
                </div>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {translation.definitions.slice(0, 3).map((definition, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-gray-400 mr-2">•</span>
                      <span>{definition}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Examples */}
            {translation.examples && translation.examples.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  例句
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 italic">
                  {translation.examples[0]}
                </div>
              </div>
            )}

            {/* Source */}
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
              <span>
                来源: {translation.source === 'online' ? '在线词典' : '本地词典'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {translation && !loading && (
        <div className="flex items-center justify-end p-3 border-t border-gray-200 dark:border-gray-600 space-x-2">
          {addedToVocabulary ? (
            <div className="flex items-center text-green-600 dark:text-green-400 text-sm">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              已添加到生词表
            </div>
          ) : (
            <button
              onClick={handleAddToVocabulary}
              disabled={isAddingToVocabulary}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAddingToVocabulary ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-1"></div>
                  添加中...
                </>
              ) : (
                <>
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  加入生词表
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TranslationPopup;