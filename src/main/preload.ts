import { contextBridge, ipcRenderer } from 'electron';
import { IPCRequest, IPCResponse } from '../shared/types';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('global', globalThis);

contextBridge.exposeInMainWorld('electron', {
  require: (module) => {
    if (module === 'events') {
      return require('events');
    }
    // Add other modules if needed
    throw new Error(`Module ${module} is not supported`);
  }
});


contextBridge.exposeInMainWorld('electronAPI', {
  // 通用 IPC 调用方法
  invoke: (channel: string, request: IPCRequest): Promise<IPCResponse> => {
    return ipcRenderer.invoke(channel, request);
  },

  // 事件监听方法（用于未来的实时通信）
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, callback);
  },

  // 移除事件监听
  removeListener: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },

  // 移除所有监听器
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // 发送单向消息（不需要响应）
  send: (channel: string, ...args: any[]) => {
    ipcRenderer.send(channel, ...args);
  },

  // 获取应用版本
  getVersion: (): Promise<string> => {
    const request: IPCRequest = {
      id: `app-version-${Date.now()}`,
      channel: 'app:get-version',
      timestamp: Date.now()
    };
    return ipcRenderer.invoke('app:get-version', request).then((response: IPCResponse<string>) => {
      if (response.success) {
        return response.data!;
      } else {
        throw new Error(response.error?.message || 'Failed to get app version');
      }
    });
  },

  // 获取平台信息
  getPlatform: (): Promise<string> => {
    const request: IPCRequest = {
      id: `app-platform-${Date.now()}`,
      channel: 'app:get-platform',
      timestamp: Date.now()
    };
    return ipcRenderer.invoke('app:get-platform', request).then((response: IPCResponse<string>) => {
      if (response.success) {
        return response.data!;
      } else {
        throw new Error(response.error?.message || 'Failed to get platform info');
      }
    });
  }
});

// Type definitions for the exposed API
export interface ElectronAPI {
  invoke: (channel: string, request: IPCRequest) => Promise<IPCResponse>;
  on: (channel: string, callback: (...args: any[]) => void) => void;
  removeListener: (channel: string, callback: (...args: any[]) => void) => void;
  removeAllListeners: (channel: string) => void;
  send: (channel: string, ...args: any[]) => void;
  getVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}