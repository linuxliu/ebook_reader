#!/usr/bin/env node

/**
 * Simple update server for development testing
 * This server serves update files and metadata for testing auto-updates
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const UPDATES_DIR = path.join(__dirname, '../release');

// Enable CORS for all routes
app.use(cors());

// Serve static files from release directory
app.use('/updates', express.static(UPDATES_DIR));

// Update metadata endpoint
app.get('/updates/latest.yml', (req, res) => {
  const latestYmlPath = path.join(UPDATES_DIR, 'latest.yml');
  
  if (fs.existsSync(latestYmlPath)) {
    res.sendFile(latestYmlPath);
  } else {
    // Generate a mock update metadata for testing
    const mockMetadata = `version: 1.0.1
files:
  - url: electron-ebook-reader-1.0.1.exe
    sha512: mock-sha512-hash
    size: 100000000
path: electron-ebook-reader-1.0.1.exe
sha512: mock-sha512-hash
releaseDate: '${new Date().toISOString()}'
releaseName: 1.0.1
releaseNotes: |
  ## What's New
  - Bug fixes and improvements
  - Performance optimizations
  - UI enhancements
`;
    
    res.set('Content-Type', 'text/yaml');
    res.send(mockMetadata);
  }
});

// Update metadata endpoint for macOS
app.get('/updates/latest-mac.yml', (req, res) => {
  const latestMacYmlPath = path.join(UPDATES_DIR, 'latest-mac.yml');
  
  if (fs.existsSync(latestMacYmlPath)) {
    res.sendFile(latestMacYmlPath);
  } else {
    const mockMetadata = `version: 1.0.1
files:
  - url: electron-ebook-reader-1.0.1.dmg
    sha512: mock-sha512-hash
    size: 100000000
path: electron-ebook-reader-1.0.1.dmg
sha512: mock-sha512-hash
releaseDate: '${new Date().toISOString()}'
releaseName: 1.0.1
releaseNotes: |
  ## What's New
  - Bug fixes and improvements
  - Performance optimizations
  - UI enhancements
`;
    
    res.set('Content-Type', 'text/yaml');
    res.send(mockMetadata);
  }
});

// Update metadata endpoint for Linux
app.get('/updates/latest-linux.yml', (req, res) => {
  const latestLinuxYmlPath = path.join(UPDATES_DIR, 'latest-linux.yml');
  
  if (fs.existsSync(latestLinuxYmlPath)) {
    res.sendFile(latestLinuxYmlPath);
  } else {
    const mockMetadata = `version: 1.0.1
files:
  - url: electron-ebook-reader-1.0.1.AppImage
    sha512: mock-sha512-hash
    size: 100000000
path: electron-ebook-reader-1.0.1.AppImage
sha512: mock-sha512-hash
releaseDate: '${new Date().toISOString()}'
releaseName: 1.0.1
releaseNotes: |
  ## What's New
  - Bug fixes and improvements
  - Performance optimizations
  - UI enhancements
`;
    
    res.set('Content-Type', 'text/yaml');
    res.send(mockMetadata);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    updatesDir: UPDATES_DIR,
    files: fs.existsSync(UPDATES_DIR) ? fs.readdirSync(UPDATES_DIR) : []
  });
});

// List available updates
app.get('/updates', (req, res) => {
  if (!fs.existsSync(UPDATES_DIR)) {
    return res.json({ updates: [], message: 'No updates directory found' });
  }
  
  const files = fs.readdirSync(UPDATES_DIR);
  const updates = files.filter(file => 
    file.endsWith('.exe') || 
    file.endsWith('.dmg') || 
    file.endsWith('.AppImage') ||
    file.endsWith('.deb') ||
    file.endsWith('.rpm')
  );
  
  res.json({ 
    updates,
    count: updates.length,
    directory: UPDATES_DIR
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.path 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Update server running on http://localhost:${PORT}`);
  console.log(`📁 Serving updates from: ${UPDATES_DIR}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Available updates: http://localhost:${PORT}/updates`);
  
  // Check if updates directory exists
  if (!fs.existsSync(UPDATES_DIR)) {
    console.warn(`⚠️  Updates directory does not exist: ${UPDATES_DIR}`);
    console.log('   Run "npm run dist" to generate update files');
  }
});

module.exports = app;