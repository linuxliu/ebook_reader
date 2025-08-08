import { app, BrowserWindow, Menu } from 'electron';
import * as path from 'path';
import { IPCHandlers } from './ipc/IPCHandlers';
import { StartupOptimizer } from './services/StartupOptimizer';
import { DatabaseService } from './services/DatabaseService';
import { CacheService } from './services/CacheService';
import { autoUpdaterService } from './services/AutoUpdaterService';

class ElectronApp {
  private mainWindow: BrowserWindow | null = null;
  private ipcHandlers: IPCHandlers | null = null;
  private startupOptimizer: StartupOptimizer | null = null;

  constructor() {
    this.initializeApp();
  }

  private initializeApp(): void {
    // Handle app ready event
    app.whenReady().then(async () => {
      await this.setupIpcHandlers();
      this.createMainWindow();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createMainWindow();
        }
      });
    });

    // Handle window closed events
    app.on('window-all-closed', async () => {
      // 清理 IPC 处理器
      if (this.ipcHandlers) {
        await this.ipcHandlers.cleanup();
      }
      if (this.startupOptimizer) {
        await this.startupOptimizer.cleanup();
      }
      
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // Handle app quit
    app.on('before-quit', async () => {
      if (this.ipcHandlers) {
        await this.ipcHandlers.cleanup();
      }
      if (this.startupOptimizer) {
        await this.startupOptimizer.cleanup();
      }
    });
  }

  private createMainWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js'),
      },
      titleBarStyle: 'default',
      show: false,
    });

    // Set up auto-updater
    autoUpdaterService.setMainWindow(this.mainWindow);
    
    // Create application menu
    this.createApplicationMenu();

    // Load the renderer
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
      // 在生产模式下也打开开发者工具，便于调试
      this.mainWindow.webContents.openDevTools();
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      
      // Check for updates after window is shown (only in production)
      if (process.env.NODE_ENV !== 'development') {
        setTimeout(() => {
          autoUpdaterService.checkForUpdates();
        }, 3000); // Wait 3 seconds after startup
      }
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private async setupIpcHandlers(): Promise<void> {
    try {
      // Initialize startup optimizer first
      const databaseService = new DatabaseService();
      const cacheService = new CacheService();
      this.startupOptimizer = new StartupOptimizer(databaseService, cacheService);
      
      // Optimize startup performance
      const metrics = await this.startupOptimizer.optimizeStartup();
      console.log('Startup optimization completed:', metrics);
      
      this.ipcHandlers = new IPCHandlers();
      await this.ipcHandlers.initialize();
      console.log('IPC handlers initialized successfully');
    } catch (error) {
      console.error('Failed to initialize IPC handlers:', error);
      // 可以选择显示错误对话框或退出应用
      app.quit();
    }
  }

  private createApplicationMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Import Book',
            accelerator: 'CmdOrCtrl+O',
            click: () => {
              this.mainWindow?.webContents.send('menu-import-book');
            }
          },
          { type: 'separator' },
          {
            label: 'Exit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              app.quit();
            }
          }
        ]
      },
      {
        label: 'View',
        submenu: [
          {
            label: 'Bookshelf',
            accelerator: 'CmdOrCtrl+1',
            click: () => {
              this.mainWindow?.webContents.send('menu-view-bookshelf');
            }
          },
          {
            label: 'Vocabulary',
            accelerator: 'CmdOrCtrl+2',
            click: () => {
              this.mainWindow?.webContents.send('menu-view-vocabulary');
            }
          },
          { type: 'separator' },
          {
            label: 'Toggle Fullscreen',
            accelerator: 'F11',
            click: () => {
              if (this.mainWindow) {
                this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
              }
            }
          },
          {
            label: 'Toggle Developer Tools',
            accelerator: 'F12',
            click: () => {
              this.mainWindow?.webContents.toggleDevTools();
            }
          }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'Check for Updates',
            click: () => {
              autoUpdaterService.manualUpdateCheck();
            }
          },
          { type: 'separator' },
          {
            label: 'About',
            click: () => {
              this.mainWindow?.webContents.send('menu-about');
            }
          }
        ]
      }
    ];

    // macOS specific menu adjustments
    if (process.platform === 'darwin') {
      template.unshift({
        label: app.getName(),
        submenu: [
          {
            label: 'About ' + app.getName(),
            role: 'about'
          },
          {
            label: 'Check for Updates',
            click: () => {
              autoUpdaterService.manualUpdateCheck();
            }
          },
          { type: 'separator' },
          {
            label: 'Services',
            role: 'services',
            submenu: []
          },
          { type: 'separator' },
          {
            label: 'Hide ' + app.getName(),
            accelerator: 'Command+H',
            role: 'hide'
          },
          {
            label: 'Hide Others',
            accelerator: 'Command+Shift+H',
            role: 'hideothers'
          },
          {
            label: 'Show All',
            role: 'unhide'
          },
          { type: 'separator' },
          {
            label: 'Quit',
            accelerator: 'Command+Q',
            click: () => {
              app.quit();
            }
          }
        ]
      });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
}

// Initialize the application
new ElectronApp();