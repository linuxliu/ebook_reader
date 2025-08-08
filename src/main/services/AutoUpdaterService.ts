import { autoUpdater } from 'electron-updater';
import { BrowserWindow, dialog } from 'electron';
import { EventEmitter } from 'events';

export interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes: string;
  downloadSize: number;
}

export interface UpdateProgress {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

export class AutoUpdaterService extends EventEmitter {
  private mainWindow: BrowserWindow | null = null;
  private updateAvailable = false;
  private updateDownloaded = false;

  constructor() {
    super();
    this.setupAutoUpdater();
  }

  public setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  public async checkForUpdates(): Promise<void> {
    try {
      await autoUpdater.checkForUpdatesAndNotify();
    } catch (error) {
      console.error('Error checking for updates:', error);
      this.emit('error', error);
    }
  }

  public async downloadUpdate(): Promise<void> {
    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      console.error('Error downloading update:', error);
      this.emit('error', error);
    }
  }

  public quitAndInstall(): void {
    if (this.updateDownloaded) {
      autoUpdater.quitAndInstall();
    }
  }

  public isUpdateAvailable(): boolean {
    return this.updateAvailable;
  }

  public isUpdateDownloaded(): boolean {
    return this.updateDownloaded;
  }

  private setupAutoUpdater(): void {
    // Configure auto-updater
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // Set update server URL (GitHub releases by default)
    if (process.env.NODE_ENV === 'development') {
      // In development, you might want to test with a local update server
      // autoUpdater.updateConfigPath = path.join(__dirname, 'dev-app-update.yml');
    }

    // Event handlers
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for update...');
      this.emit('checking-for-update');
    });

    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info);
      this.updateAvailable = true;
      this.emit('update-available', info);
      this.showUpdateAvailableDialog(info);
    });

    autoUpdater.on('update-not-available', (info) => {
      console.log('Update not available:', info);
      this.updateAvailable = false;
      this.emit('update-not-available', info);
    });

    autoUpdater.on('error', (error) => {
      console.error('Auto-updater error:', error);
      this.emit('error', error);
      this.showUpdateErrorDialog(error);
    });

    autoUpdater.on('download-progress', (progress) => {
      console.log(`Download progress: ${progress.percent}%`);
      this.emit('download-progress', progress);
      
      if (this.mainWindow) {
        this.mainWindow.webContents.send('update-download-progress', progress);
      }
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info);
      this.updateDownloaded = true;
      this.emit('update-downloaded', info);
      this.showUpdateDownloadedDialog(info);
    });
  }

  private async showUpdateAvailableDialog(info: any): Promise<void> {
    if (!this.mainWindow) return;

    const result = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is available!`,
      detail: `Current version: ${autoUpdater.currentVersion}\nNew version: ${info.version}\n\nRelease notes:\n${info.releaseNotes || 'No release notes available.'}`,
      buttons: ['Download Now', 'Download Later', 'Skip This Version'],
      defaultId: 0,
      cancelId: 1
    });

    switch (result.response) {
      case 0: // Download Now
        await this.downloadUpdate();
        break;
      case 1: // Download Later
        // User chose to download later, do nothing
        break;
      case 2: // Skip This Version
        // You might want to store this preference
        break;
    }
  }

  private async showUpdateDownloadedDialog(info: any): Promise<void> {
    if (!this.mainWindow) return;

    const result = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded successfully!',
      detail: `Version ${info.version} has been downloaded and is ready to install. The application will restart to apply the update.`,
      buttons: ['Restart Now', 'Restart Later'],
      defaultId: 0,
      cancelId: 1
    });

    if (result.response === 0) {
      this.quitAndInstall();
    }
  }

  private async showUpdateErrorDialog(error: Error): Promise<void> {
    if (!this.mainWindow) return;

    await dialog.showMessageBox(this.mainWindow, {
      type: 'error',
      title: 'Update Error',
      message: 'Failed to check for updates',
      detail: `An error occurred while checking for updates:\n\n${error.message}`,
      buttons: ['OK'],
      defaultId: 0
    });
  }

  // Manual update check (called from menu or UI)
  public async manualUpdateCheck(): Promise<void> {
    try {
      const result = await autoUpdater.checkForUpdates();
      
      if (!result || !result.updateInfo) {
        if (this.mainWindow) {
          await dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'No Updates',
            message: 'You are running the latest version!',
            detail: `Current version: ${autoUpdater.currentVersion}`,
            buttons: ['OK'],
            defaultId: 0
          });
        }
      }
    } catch (error) {
      console.error('Manual update check failed:', error);
      this.emit('error', error);
    }
  }

  // Get current version
  public getCurrentVersion(): string {
    return autoUpdater.currentVersion;
  }

  // Enable/disable auto-download
  public setAutoDownload(enabled: boolean): void {
    autoUpdater.autoDownload = enabled;
  }

  // Set update check interval (in milliseconds)
  public setUpdateCheckInterval(interval: number): void {
    setInterval(() => {
      this.checkForUpdates();
    }, interval);
  }
}

export const autoUpdaterService = new AutoUpdaterService();