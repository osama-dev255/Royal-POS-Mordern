# Netlify Deployment Guide

This guide explains how to deploy the POS application to Netlify.

## Prerequisites

1. A Netlify account (free tier available at [netlify.com](https://netlify.com))
2. The application code (already built and tested)

## Deployment Steps

### Option 1: Deploy with Netlify CLI (Recommended)

1. Install Netlify CLI globally:
   ```bash
   npm install -g netlify-cli
   ```

2. Login to your Netlify account:
   ```bash
   netlify login
   ```

3. Deploy the site:
   ```bash
   netlify deploy --prod
   ```
   
   When prompted:
   - Select "Create & configure a new site"
   - Choose your team
   - Enter a site name (or leave blank for auto-generated)
   - For the publish directory, enter: `dist`

### Option 2: Deploy via Git (Continuous Deployment)

1. Push your code to a GitHub repository (already done)
2. Go to [Netlify Dashboard](https://app.netlify.com/)
3. Click "New site from Git"
4. Select your GitHub repository
5. Configure the deployment settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Click "Deploy site"

### Option 3: Manual Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Go to [Netlify Dashboard](https://app.netlify.com/)
3. Drag and drop the `dist` folder to the deployment area

## Environment Variables

After deployment, you need to set the environment variables in Netlify:

1. Go to your site settings in Netlify
2. Navigate to "Environment variables"
3. Add the following variables:
   ```
   VITE_SUPABASE_URL=https://asnfodewuwxabbsdnjgi.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzbmZvZGV3dXd4YWJic2RuamdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMzE0NzMsImV4cCI6MjA3NjYwNzQ3M30.Chu69zvIEWrVQiEo9YS1OyIDlsI7M3ILkBQzmEa8Fp8
   ```

Note: These are the same values from your `.env` file.

## Configuration Files

- `netlify.toml`: Contains build settings and redirects
- `vite.config.ts`: Vite configuration for the build process
- `.env`: Local environment variables (not committed to Git)

## Troubleshooting

### Build Issues
If you encounter build issues:
1. Check that all dependencies are in `package.json`
2. Ensure the build command in `netlify.toml` matches `package.json` scripts
3. Verify Node.js version compatibility

### Environment Variables Not Working
1. Make sure variables are prefixed with `VITE_`
2. Check that variables are set in Netlify dashboard
3. Redeploy the site after adding environment variables

### Database Connection Issues
1. Verify Supabase credentials are correct
2. Check that RLS policies are properly configured
3. Ensure the Supabase project is accessible

## Post-Deployment

After successful deployment:
1. Test the live site
2. Verify product creation works
3. Check all functionality
4. Monitor Netlify logs for any errors

The site should now be accessible at your Netlify URL (e.g., `https://your-site-name.netlify.app`).