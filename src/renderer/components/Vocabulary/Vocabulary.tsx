import React, { useState, useEffect } from 'react';
import { VocabularyItem } from '../../../shared/types';
import VocabularyList from './VocabularyList';
import VocabularyEdit from './VocabularyEdit';
import VocabularyExport from './VocabularyExport';
import { useAppState } from '../../store/hooks';
import { IPCClient } from '../../services/IPCClient';

const Vocabulary: React.FC = () => {
  const { state, dispatch } = useAppState();
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<VocabularyItem | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  useEffect(() => {
    loadVocabulary();
  }, []);

  const loadVocabulary = async () => {
    setLoading(true);
    try {
      const vocabulary = await IPCClient.invoke('vocabulary:get');
      dispatch({
        type: 'SET_VOCABULARY',
        payload: vocabulary
      });
    } catch (error) {
      console.error('Failed to load vocabulary:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: {
          type: 'DATABASE_ERROR',
          message: '加载生词表失败',
          timestamp: new Date()
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (wordId: string) => {
    try {
      await IPCClient.invoke('vocabulary:delete', { wordId });
      dispatch({
        type: 'DELETE_VOCABULARY_ITEM',
        payload: wordId
      });
    } catch (error) {
      console.error('Failed to delete vocabulary item:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: {
          type: 'DATABASE_ERROR',
          message: '删除生词失败',
          timestamp: new Date()
        }
      });
    }
  };

  const handleMarkMastered = async (wordId: string, mastered: boolean) => {
    try {
      await IPCClient.invoke('vocabulary:mark-mastered', { wordId, mastered });
      dispatch({
        type: 'UPDATE_VOCABULARY_ITEM',
        payload: { wordId, updates: { mastered } }
      });
    } catch (error) {
      console.error('Failed to mark vocabulary item as mastered:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: {
          type: 'DATABASE_ERROR',
          message: '更新生词状态失败',
          timestamp: new Date()
        }
      });
    }
  };

  const handleExport = async (format: 'csv' | 'txt', options?: any) => {
    try {
      // 根据选项过滤生词表
      let vocabularyToExport = state.vocabulary;
      
      if (options?.onlyMastered) {
        vocabularyToExport = vocabularyToExport.filter(item => item.mastered);
      } else if (options?.onlyUnmastered) {
        vocabularyToExport = vocabularyToExport.filter(item => !item.mastered);
      }
      
      const result = await IPCClient.invoke('vocabulary:export', { 
        format, 
        vocabulary: vocabularyToExport 
      });
      
      // 显示成功消息
      dispatch({
        type: 'SET_SUCCESS_MESSAGE',
        payload: `生词表已导出到: ${result.filePath}`
      });
    } catch (error) {
      console.error('Failed to export vocabulary:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: {
          type: 'FILE_SYSTEM_ERROR',
          message: '导出生词表失败',
          timestamp: new Date()
        }
      });
    }
  };

  const handleOpenExportDialog = () => {
    setShowExportDialog(true);
  };

  const handleCloseExportDialog = () => {
    setShowExportDialog(false);
  };

  const handleEdit = (item: VocabularyItem) => {
    setEditingItem(item);
    setShowEditDialog(true);
  };

  const handleSaveEdit = async (updatedItem: VocabularyItem) => {
    try {
      await IPCClient.invoke('vocabulary:update', {
        wordId: updatedItem.id,
        updates: {
          word: updatedItem.word,
          translation: updatedItem.translation,
          pronunciation: updatedItem.pronunciation,
          example: updatedItem.example,
          context: updatedItem.context,
          mastered: updatedItem.mastered
        }
      });

      dispatch({
        type: 'UPDATE_VOCABULARY_ITEM',
        payload: {
          wordId: updatedItem.id,
          updates: updatedItem
        }
      });

      setShowEditDialog(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Failed to update vocabulary item:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: {
          type: 'DATABASE_ERROR',
          message: '更新生词失败',
          timestamp: new Date()
        }
      });
    }
  };

  const handleCancelEdit = () => {
    setShowEditDialog(false);
    setEditingItem(null);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">生词表</h1>
          <div className="text-sm text-gray-500">
            管理您的学习词汇
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <VocabularyList
          vocabulary={state.vocabulary}
          loading={loading}
          onDelete={handleDelete}
          onMarkMastered={handleMarkMastered}
          onExport={handleExport}
          onOpenExportDialog={handleOpenExportDialog}
          onEdit={handleEdit}
        />
      </div>

      <VocabularyEdit
        item={editingItem}
        visible={showEditDialog}
        onSave={handleSaveEdit}
        onCancel={handleCancelEdit}
      />

      <VocabularyExport
        isOpen={showExportDialog}
        onClose={handleCloseExportDialog}
        onExport={handleExport}
        totalCount={state.vocabulary.length}
      />
    </div>
  );
};

export default Vocabulary;