/**
 * Electron Builder Configuration
 * @see https://www.electron.build/configuration/configuration
 */

const config = {
  appId: 'com.electronebookreader.app',
  productName: 'Electron Ebook Reader',
  copyright: 'Copyright © 2024 ${author}',
  
  directories: {
    output: 'release',
    buildResources: 'build'
  },
  
  files: [
    'dist/**/*',
    'node_modules/**/*',
    'package.json'
  ],
  
  extraResources: [
    {
      from: 'assets',
      to: 'assets',
      filter: ['**/*']
    }
  ],
  
  // Windows configuration
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64', 'ia32']
      },
      {
        target: 'portable',
        arch: ['x64', 'ia32']
      }
    ],
    icon: 'assets/icon.ico',
    requestedExecutionLevel: 'asInvoker',
    publisherName: 'Electron Ebook Reader',
    verifyUpdateCodeSignature: false
  },
  
  // macOS configuration
  mac: {
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64']
      },
      {
        target: 'zip',
        arch: ['x64', 'arm64']
      }
    ],
    icon: 'assets/icon.icns',
    category: 'public.app-category.productivity',
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
    notarize: false // Set to true when you have Apple Developer credentials
  },
  
  // Linux configuration
  linux: {
    target: [
      {
        target: 'AppImage',
        arch: ['x64']
      },
      {
        target: 'deb',
        arch: ['x64']
      },
      {
        target: 'rpm',
        arch: ['x64']
      }
    ],
    icon: 'assets/icon.png',
    category: 'Office',
    desktop: {
      Name: 'Electron Ebook Reader',
      Comment: 'A cross-platform ebook reader',
      Keywords: 'ebook;reader;epub;pdf;mobi;txt;'
    }
  },
  
  // NSIS installer configuration (Windows)
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'Electron Ebook Reader',
    include: 'build/installer.nsh',
    script: 'build/installer.nsh',
    deleteAppDataOnUninstall: false,
    runAfterFinish: true,
    menuCategory: 'Productivity'
  },
  
  // DMG configuration (macOS)
  dmg: {
    title: '${productName}',
    icon: 'assets/icon.icns',
    background: 'assets/dmg-background.png',
    contents: [
      {
        x: 130,
        y: 220
      },
      {
        x: 410,
        y: 220,
        type: 'link',
        path: '/Applications'
      }
    ],
    window: {
      width: 540,
      height: 380
    }
  },
  
  // Auto-updater configuration
  publish: {
    provider: 'github',
    owner: 'your-github-username',
    repo: 'electron-ebook-reader',
    private: false
  },
  
  // Code signing (configure when you have certificates)
  codeSign: {
    // Windows code signing
    certificateFile: process.env.CSC_LINK,
    certificatePassword: process.env.CSC_KEY_PASSWORD,
    
    // macOS code signing
    identity: process.env.CSC_IDENTITY_AUTO_DISCOVERY !== 'false'
  },
  
  // Compression
  compression: 'maximum',
  
  // Build version
  buildVersion: process.env.BUILD_NUMBER || '1',
  
  // Metadata
  metadata: {
    name: 'electron-ebook-reader',
    version: '1.0.0',
    description: 'A cross-platform ebook reader built with Electron and React',
    author: {
      name: 'Your Name',
      email: 'your.email@example.com'
    },
    homepage: 'https://github.com/your-github-username/electron-ebook-reader',
    repository: {
      type: 'git',
      url: 'https://github.com/your-github-username/electron-ebook-reader.git'
    },
    bugs: {
      url: 'https://github.com/your-github-username/electron-ebook-reader/issues'
    },
    keywords: ['electron', 'ebook', 'reader', 'react', 'typescript']
  }
};

module.exports = config;