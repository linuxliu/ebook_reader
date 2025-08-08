#!/usr/bin/env node

/**
 * Test script for packaging functionality
 * Verifies that all packaging components are working correctly
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧪 Testing Packaging Configuration...\n');

// Test 1: Check required files exist
console.log('1. Checking required files...');
const requiredFiles = [
  'package.json',
  'electron-builder.config.js',
  'build/entitlements.mac.plist',
  'build/installer.nsh',
  'assets/icon.png',
  'assets/icon.ico',
  'assets/icon.icns',
  'scripts/build.js',
  'scripts/update-server.js',
  '.github/workflows/build-and-release.yml'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing!');
  process.exit(1);
}

// Test 2: Check package.json configuration
console.log('\n2. Checking package.json configuration...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const requiredScripts = [
  'pack',
  'dist',
  'dist:win',
  'dist:mac',
  'dist:linux',
  'dist:all',
  'publish',
  'build:clean',
  'build:full',
  'build:portable',
  'update-server'
];

let allScriptsExist = true;
requiredScripts.forEach(script => {
  if (packageJson.scripts[script]) {
    console.log(`   ✅ ${script}: ${packageJson.scripts[script]}`);
  } else {
    console.log(`   ❌ ${script} - MISSING`);
    allScriptsExist = false;
  }
});

if (!allScriptsExist) {
  console.log('\n❌ Some required scripts are missing!');
  process.exit(1);
}

// Test 3: Check build configuration
console.log('\n3. Checking build configuration...');
if (packageJson.build) {
  console.log('   ✅ Build configuration exists');
  
  const buildConfig = packageJson.build;
  const requiredBuildFields = ['appId', 'productName', 'directories', 'files'];
  
  requiredBuildFields.forEach(field => {
    if (buildConfig[field]) {
      console.log(`   ✅ build.${field}`);
    } else {
      console.log(`   ❌ build.${field} - MISSING`);
    }
  });
  
  // Check platform configurations
  const platforms = ['win', 'mac', 'linux'];
  platforms.forEach(platform => {
    if (buildConfig[platform]) {
      console.log(`   ✅ build.${platform} configuration`);
    } else {
      console.log(`   ❌ build.${platform} configuration - MISSING`);
    }
  });
} else {
  console.log('   ❌ Build configuration missing!');
  process.exit(1);
}

// Test 4: Check dependencies
console.log('\n4. Checking dependencies...');
const requiredDeps = ['electron-builder', 'electron-updater'];
const devDeps = packageJson.devDependencies || {};
const deps = packageJson.dependencies || {};

requiredDeps.forEach(dep => {
  if (devDeps[dep] || deps[dep]) {
    console.log(`   ✅ ${dep}`);
  } else {
    console.log(`   ❌ ${dep} - MISSING`);
  }
});

// Test 5: Test build script
console.log('\n5. Testing build script...');
try {
  execSync('node scripts/build.js', { stdio: 'pipe' });
  console.log('   ✅ Build script executes without errors');
} catch (error) {
  console.log('   ❌ Build script has errors');
  console.log(`   Error: ${error.message}`);
}

// Test 6: Test update server script
console.log('\n6. Testing update server script...');
try {
  // Just check if the script can be required without errors
  require('../scripts/update-server.js');
  console.log('   ✅ Update server script loads without errors');
} catch (error) {
  console.log('   ❌ Update server script has errors');
  console.log(`   Error: ${error.message}`);
}

// Test 7: Check GitHub Actions workflow
console.log('\n7. Checking GitHub Actions workflow...');
const workflowPath = '.github/workflows/build-and-release.yml';
if (fs.existsSync(workflowPath)) {
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  
  const requiredJobs = ['test', 'build', 'release'];
  let allJobsExist = true;
  
  requiredJobs.forEach(job => {
    if (workflow.includes(`${job}:`)) {
      console.log(`   ✅ Job: ${job}`);
    } else {
      console.log(`   ❌ Job: ${job} - MISSING`);
      allJobsExist = false;
    }
  });
  
  if (allJobsExist) {
    console.log('   ✅ All required jobs exist');
  }
} else {
  console.log('   ❌ GitHub Actions workflow missing');
}

// Test 8: Validate electron-builder config
console.log('\n8. Validating electron-builder configuration...');
try {
  const builderConfig = require('../electron-builder.config.js');
  
  const requiredFields = ['appId', 'productName', 'directories'];
  let configValid = true;
  
  requiredFields.forEach(field => {
    if (builderConfig[field]) {
      console.log(`   ✅ ${field}`);
    } else {
      console.log(`   ❌ ${field} - MISSING`);
      configValid = false;
    }
  });
  
  if (configValid) {
    console.log('   ✅ Electron-builder configuration is valid');
  }
} catch (error) {
  console.log('   ❌ Electron-builder configuration has errors');
  console.log(`   Error: ${error.message}`);
}

console.log('\n🎉 Packaging configuration test completed!');
console.log('\nNext steps:');
console.log('1. Replace placeholder icon files with actual icons');
console.log('2. Configure code signing certificates');
console.log('3. Set up GitHub repository secrets for CI/CD');
console.log('4. Test building for your target platforms');
console.log('5. Set up auto-update server or GitHub releases');

console.log('\nTo test building:');
console.log('  npm run pack          # Test packaging');
console.log('  npm run dist          # Build for current platform');
console.log('  npm run build:full    # Full clean build');

console.log('\nTo test auto-updates:');
console.log('  npm run update-server # Start development update server');
console.log('  npm run dist          # Build application');
console.log('  # Test update functionality in the built app');