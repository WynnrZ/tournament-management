#!/usr/bin/env node

// Simple fix for Render deployment
const { execSync } = require('child_process');
const fs = require('fs');

console.log('Starting simple Render fix...');

// Check current directory structure
console.log('Current directory:', process.cwd());
console.log('Files in current directory:', fs.readdirSync('.').join(', '));

// Check if client directory exists
if (fs.existsSync('client')) {
  console.log('Client directory found');
  console.log('Files in client:', fs.readdirSync('client').join(', '));
} else {
  console.log('Client directory not found');
  process.exit(1);
}

try {
  // Build with explicit configuration
  console.log('Building client with explicit root...');
  execSync('npx vite build --root client --outDir ../dist/public', { stdio: 'inherit' });
  
  console.log('Building server...');
  execSync('npx esbuild server/index.ts --platform=node --bundle --format=esm --outdir=dist', { stdio: 'inherit' });
  
  console.log('Build completed successfully');
  
} catch (error) {
  console.error('Build failed:', error.message);
  
  // Fallback: try with different approach
  try {
    console.log('Trying fallback build...');
    execSync('cd client && npx vite build --outDir ../dist/public', { stdio: 'inherit' });
    execSync('npx esbuild server/index.ts --platform=node --bundle --format=esm --outdir=dist', { stdio: 'inherit' });
    console.log('Fallback build succeeded');
  } catch (fallbackError) {
    console.error('All build attempts failed');
    process.exit(1);
  }
}