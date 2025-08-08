#!/usr/bin/env node

/**
 * Build script for Electron Ebook Reader
 * Handles building for different platforms and configurations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Build configuration
const config = {
  platforms: {
    win: {
      targets: ['nsis', 'portable'],
      archs: ['x64', 'ia32']
    },
    mac: {
      targets: ['dmg', 'zip'],
      archs: ['x64', 'arm64']
    },
    linux: {
      targets: ['AppImage', 'deb', 'rpm'],
      archs: ['x64']
    }
  },
  
  // Environment variables for code signing
  codeSign: {
    win: {
      certificateFile: process.env.CSC_LINK,
      certificatePassword: process.env.CSC_KEY_PASSWORD
    },
    mac: {
      identity: process.env.CSC_IDENTITY_AUTO_DISCOVERY !== 'false',
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_ID_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID
    }
  }
};

/**
 * Execute command with error handling
 */
function exec(command, options = {}) {
  console.log(`Executing: ${command}`);
  try {
    return execSync(command, { 
      stdio: 'inherit', 
      encoding: 'utf8',
      ...options 
    });
  } catch (error) {
    console.error(`Command failed: ${command}`);
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * Clean build directories
 */
function clean() {
  console.log('🧹 Cleaning build directories...');
  
  const dirsToClean = ['dist', 'release'];
  
  dirsToClean.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`Cleaned ${dir}/`);
    }
  });
}

/**
 * Build the application
 */
function buildApp() {
  console.log('🔨 Building application...');
  exec('npm run build');
}

/**
 * Build for specific platform
 */
function buildPlatform(platform) {
  console.log(`📦 Building for ${platform}...`);
  
  const platformConfig = config.platforms[platform];
  if (!platformConfig) {
    console.error(`Unknown platform: ${platform}`);
    process.exit(1);
  }
  
  // Set environment variables for code signing
  const codeSignConfig = config.codeSign[platform];
  if (codeSignConfig) {
    Object.entries(codeSignConfig).forEach(([key, value]) => {
      if (value) {
        process.env[key.toUpperCase()] = value;
      }
    });
  }
  
  // Build command
  let command = `electron-builder --${platform}`;
  
  // Add specific targets if needed
  if (process.env.BUILD_TARGET) {
    command += ` --${process.env.BUILD_TARGET}`;
  }
  
  // Add architecture if specified
  if (process.env.BUILD_ARCH) {
    command += ` --${process.env.BUILD_ARCH}`;
  }
  
  exec(command);
}

/**
 * Build for all platforms
 */
function buildAll() {
  console.log('🌍 Building for all platforms...');
  exec('npm run dist:all');
}

/**
 * Create portable version
 */
function buildPortable(platform = 'win') {
  console.log(`📱 Creating portable version for ${platform}...`);
  
  if (platform === 'win') {
    exec('electron-builder --win portable');
  } else {
    console.log('Portable builds are currently only supported for Windows');
  }
}

/**
 * Validate build environment
 */
function validateEnvironment() {
  console.log('🔍 Validating build environment...');
  
  // Check if required files exist
  const requiredFiles = [
    'package.json',
    'src/main/main.ts',
    'src/renderer/index.tsx'
  ];
  
  requiredFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      console.error(`Required file missing: ${file}`);
      process.exit(1);
    }
  });
  
  // Check if assets exist
  const assetFiles = [
    'assets/icon.png',
    'assets/icon.ico',
    'assets/icon.icns'
  ];
  
  assetFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      console.warn(`Asset file missing: ${file} (using placeholder)`);
    }
  });
  
  console.log('✅ Environment validation passed');
}

/**
 * Show build information
 */
function showInfo() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  console.log('📋 Build Information:');
  console.log(`   App Name: ${packageJson.name}`);
  console.log(`   Version: ${packageJson.version}`);
  console.log(`   Description: ${packageJson.description}`);
  console.log(`   Author: ${packageJson.author}`);
  console.log(`   Node Version: ${process.version}`);
  console.log(`   Platform: ${process.platform}`);
  console.log(`   Architecture: ${process.arch}`);
  
  if (process.env.BUILD_NUMBER) {
    console.log(`   Build Number: ${process.env.BUILD_NUMBER}`);
  }
  
  if (process.env.NODE_ENV) {
    console.log(`   Environment: ${process.env.NODE_ENV}`);
  }
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  showInfo();
  
  switch (command) {
    case 'clean':
      clean();
      break;
      
    case 'build':
      validateEnvironment();
      buildApp();
      break;
      
    case 'win':
    case 'windows':
      validateEnvironment();
      buildApp();
      buildPlatform('win');
      break;
      
    case 'mac':
    case 'macos':
      validateEnvironment();
      buildApp();
      buildPlatform('mac');
      break;
      
    case 'linux':
      validateEnvironment();
      buildApp();
      buildPlatform('linux');
      break;
      
    case 'all':
      validateEnvironment();
      buildApp();
      buildAll();
      break;
      
    case 'portable':
      validateEnvironment();
      buildApp();
      buildPortable(args[1] || 'win');
      break;
      
    case 'full':
      clean();
      validateEnvironment();
      buildApp();
      buildAll();
      break;
      
    default:
      console.log('🚀 Electron Ebook Reader Build Script');
      console.log('');
      console.log('Usage: node scripts/build.js <command>');
      console.log('');
      console.log('Commands:');
      console.log('  clean     - Clean build directories');
      console.log('  build     - Build application only');
      console.log('  win       - Build for Windows');
      console.log('  mac       - Build for macOS');
      console.log('  linux     - Build for Linux');
      console.log('  all       - Build for all platforms');
      console.log('  portable  - Create portable version');
      console.log('  full      - Clean, build, and package for all platforms');
      console.log('');
      console.log('Environment Variables:');
      console.log('  BUILD_TARGET  - Specific build target (nsis, dmg, AppImage, etc.)');
      console.log('  BUILD_ARCH    - Target architecture (x64, ia32, arm64)');
      console.log('  BUILD_NUMBER  - Build number for versioning');
      console.log('  CSC_LINK      - Path to code signing certificate');
      console.log('  CSC_KEY_PASSWORD - Certificate password');
      break;
  }
}

// Run the script
main();