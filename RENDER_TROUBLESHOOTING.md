# Render Deployment Troubleshooting

## Fixed Issues in This Version

### 1. Vite Build Error - "Could not resolve entry module"
**Problem**: Replit-specific plugins and incorrect path resolution
**Solution**: 
- Removed `@replit/vite-plugin-runtime-error-modal` and `@replit/vite-plugin-cartographer`
- Updated `__dirname` to use `fileURLToPath(import.meta.url)` for ES modules
- Cleaned up Vite configuration for production deployment

### 2. Database Setup During Build
**Problem**: Database push was running during build phase without DATABASE_URL
**Solution**: 
- Moved `npm run db:push` to the build command after environment variables are available
- Database schema will be pushed during deployment when DATABASE_URL is set

## Deployment Steps for Render

1. **Create Web Service**:
   - Build Command: `npm install --production=false && npm run build && npm run db:push`
   - Start Command: `npm start`

2. **Create PostgreSQL Database**:
   - Database Name: `ams_database`
   - Connect to web service

3. **Environment Variables**:
   ```
   NODE_ENV=production
   DATABASE_URL=<auto-populated-from-database>
   SESSION_SECRET=<render-will-generate>
   VITE_GOOGLE_MAPS_API_KEY=<your-key-optional>
   RESEND_API_KEY=<your-key-optional>
   ```

## Common Deployment Issues

### Build Failures
- Ensure Node.js 20+ is selected
- Check that all dependencies are in the correct sections (dependencies vs devDependencies)
- Verify TypeScript compilation passes

### Database Connection
- Ensure DATABASE_URL is properly set from the connected PostgreSQL service
- Database schema will be automatically created during first deployment

### Environment Variables
- SESSION_SECRET must be set for authentication to work
- Google Maps API key is optional but needed for map features
- Email service keys are optional but needed for notifications

## Verification Steps After Deployment

1. Check application starts without errors
2. Verify database connection and schema creation
3. Test login with default admin credentials:
   - Email: admin@ams.com
   - Password: admin123
4. Change default admin password immediately

## Support

If deployment still fails:
1. Check Render build logs for specific error messages
2. Verify all environment variables are properly set
3. Ensure database service is running and connected
4. Review application logs for runtime errors