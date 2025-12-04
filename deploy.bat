@echo off
echo Starting deployment process...

REM Check if Netlify CLI is installed
netlify --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Netlify CLI could not be found. Installing...
    npm install -g netlify-cli
)

echo Building the project...
npm run build

echo Deploying to Netlify...
netlify deploy --prod --dir=dist

echo Deployment completed!
pause