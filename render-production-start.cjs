#!/usr/bin/env node

console.log('🚀 Starting WynnrZ production server...');

// Debug environment variables
console.log('Environment check:');
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'MISSING');
console.log('- SESSION_SECRET:', process.env.SESSION_SECRET ? 'SET' : 'MISSING');
console.log('- NODE_ENV:', process.env.NODE_ENV);

// Set NODE_ENV if not set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
  console.log('✅ Set NODE_ENV to production');
}

// Generate SESSION_SECRET if missing
if (!process.env.SESSION_SECRET) {
  const crypto = require('crypto');
  process.env.SESSION_SECRET = crypto.randomBytes(64).toString('hex');
  console.log('✅ Generated SESSION_SECRET');
}

// Verify DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is required');
  process.exit(1);
}

console.log('🌟 Starting server from dist/index.js...');

// Start the server
try {
  await import('./dist/index.js');
} catch (error) {
  console.error('❌ Failed to start server:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}