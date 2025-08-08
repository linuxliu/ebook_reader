import React, { useRef, useEffect, useState } from 'react';
import { ReadingSettings, VocabularyItem } from '../../../shared/types';
import { useTextSelection, TextSelectionInfo } from '../../hooks/useTextSelection';
import { analyzeSelectedText, findContainingSentence } from '../../utils/textProcessing';
import TranslationPopup from './TranslationPopup';

interface ReaderContentProps {
  content: string;
  settings: ReadingSettings;
  isFullscreen: boolean;
  bookId: string;
  onSettingsChange: (settings: ReadingSettings) => void;
  onAddToVocabulary?: (word: VocabularyItem) => void;
}

const ReaderContent: React.FC<ReaderContentProps> = ({
  content,
  settings,
  isFullscreen,
  bookId,
  onSettingsChange,
  onAddToVocabulary
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [translationPopup, setTranslationPopup] = useState<{
    visible: boolean;
    selectedText: string;
    position: { x: number; y: number };
    context: string;
  }>({
    visible: false,
    selectedText: '',
    position: { x: 0, y: 0 },
    context: ''
  });

  // Handle text selection with the custom hook
  const handleSelectionChange = (selection: TextSelectionInfo | null) => {
    if (selection) {
      const wordInfo = analyzeSelectedText(selection.text);
      
      if (wordInfo.isValid) {
        // Get context from the full content
        const context = findContainingSentence(content, selection.text);
        
        setTranslationPopup({
          visible: true,
          selectedText: selection.text,
          position: selection.position,
          context
        });
      } else {
        // Hide popup for invalid selections
        setTranslationPopup(prev => ({ ...prev, visible: false }));
      }
    } else {
      // Hide popup when no selection
      setTranslationPopup(prev => ({ ...prev, visible: false }));
    }
  };

  const { registerContainer, clearSelection } = useTextSelection({
    onSelectionChange: handleSelectionChange,
    minSelectionLength: 1,
    debounceMs: 150
  });

  const handleCloseTranslation = () => {
    setTranslationPopup(prev => ({ ...prev, visible: false }));
    clearSelection();
  };

  const handleAddToVocabulary = async (word: VocabularyItem) => {
    if (onAddToVocabulary) {
      await onAddToVocabulary(word);
    }
  };

  useEffect(() => {
    // Apply settings to content area
    if (contentRef.current) {
      const element = contentRef.current;
      element.style.fontFamily = settings.fontFamily;
      element.style.fontSize = `${settings.fontSize}px`;
      element.style.lineHeight = settings.lineHeight.toString();
      element.style.padding = `${settings.margin}px`;
      
      // Register the content element for text selection
      registerContainer(element);
    }
  }, [settings, registerContainer]);

  const contentClasses = `
    reader-content
    flex-1
    overflow-auto
    ${settings.pageMode === 'scroll' ? 'overflow-y-auto' : 'overflow-hidden'}
    ${settings.theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'}
    ${isFullscreen ? 'p-8' : 'p-6'}
    transition-all duration-300
    selection:bg-blue-200 dark:selection:bg-blue-800
    selection:text-blue-900 dark:selection:text-blue-100
  `;

  return (
    <div className={contentClasses}>
      <div
        ref={contentRef}
        className="reader-text max-w-4xl mx-auto leading-relaxed cursor-text"
        style={{
          fontFamily: settings.fontFamily,
          fontSize: `${settings.fontSize}px`,
          lineHeight: settings.lineHeight,
          margin: `0 ${settings.margin}px`,
          textAlign: 'justify',
          wordBreak: 'break-word',
          hyphens: 'auto',
          userSelect: 'text',
          WebkitUserSelect: 'text',
        }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
      
      {/* Reading area overlay for pagination mode */}
      {settings.pageMode === 'pagination' && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Page boundaries could be visualized here */}
        </div>
      )}

      {/* Translation Popup */}
      <TranslationPopup
        selectedText={translationPopup.selectedText}
        position={translationPopup.position}
        visible={translationPopup.visible}
        bookId={bookId}
        context={translationPopup.context}
        onAddToVocabulary={handleAddToVocabulary}
        onClose={handleCloseTranslation}
      />
    </div>
  );
};

export default ReaderContent;