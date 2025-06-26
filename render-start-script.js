#!/usr/bin/env node

// Render Production Startup Script
// Handles database initialization and starts the server

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Starting WynnrZ on Render...');

// Check if we're in production environment
const isProduction = process.env.NODE_ENV === 'production';
console.log(`Environment: ${isProduction ? 'production' : 'development'}`);

// Debug environment variables
console.log('Environment variables check:');
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'MISSING');
console.log('- SESSION_SECRET:', process.env.SESSION_SECRET ? 'SET' : 'MISSING');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- CREATE_ADMIN_USER:', process.env.CREATE_ADMIN_USER);

// Generate SESSION_SECRET if not provided (Render compatibility)
if (!process.env.SESSION_SECRET) {
  console.log('⚠️ SESSION_SECRET not found, generating temporary secret...');
  process.env.SESSION_SECRET = require('crypto').randomBytes(64).toString('hex');
  console.log('✅ Temporary SESSION_SECRET generated');
}

// Verify required environment variables
const requiredEnvVars = ['DATABASE_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

// Initialize database schema if needed
if (process.env.CREATE_ADMIN_USER === 'true') {
  console.log('🔧 Initializing database schema...');
  try {
    execSync('npm run db:push', { stdio: 'inherit' });
    console.log('✅ Database schema initialized');
  } catch (error) {
    console.log('⚠️ Database schema initialization skipped (may already exist)');
  }
}

// Start the application
console.log('🌟 Starting WynnrZ Tournament Management System...');
try {
  if (fs.existsSync('./dist/index.js')) {
    // Production mode - use built files
    require('./dist/index.js');
  } else {
    // Development mode - use tsx
    execSync('tsx server/index.ts', { stdio: 'inherit' });
  }
} catch (error) {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
}