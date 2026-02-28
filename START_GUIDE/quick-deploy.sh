#!/bin/bash

# quick-deploy.sh - One command deployment for newbies

set -e

echo "🚀 KitaHack 2026 - Quick Deploy Script"
echo "======================================"
echo ""

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"
echo ""

# Step 1: Install dependencies
echo "📦 Step 1/4: Installing dependencies..."
echo "Installing root dependencies..."
npm install

echo "Installing BIW dependencies..."
cd BIW
npm install
cd ..

echo "✅ Dependencies installed"
echo ""

# Step 2: Configure environment
echo "🔧 Step 2/4: Configuring environment..."
if [ ! -f "BIW/src/environments/environment.ts" ]; then
    echo "⚠️  Environment file not found."
    read -p "Would you like to configure it now? (y/n): " CONFIG_NOW
    
    if [ "$CONFIG_NOW" = "y" ]; then
        chmod +x config-helper.sh
        ./config-helper.sh
    else
        echo "⏭️  Skipping configuration. You'll need to set it up manually later."
        echo "Copy BIW/src/environments/environment.template.ts to environment.ts and fill in your credentials"
    fi
else
    echo "✅ Environment file already exists"
fi
echo ""

# Step 3: Deploy Supabase functions (optional)
echo "🚀 Step 3/4: Supabase Functions Deployment"
read -p "Would you like to deploy Supabase functions? (y/n): " DEPLOY_FUNCTIONS

if [ "$DEPLOY_FUNCTIONS" = "y" ]; then
    if command -v supabase &> /dev/null; then
        chmod +x deploy-supabase.sh
        ./deploy-supabase.sh
    else
        echo "⚠️  Supabase CLI not found. Skipping function deployment."
        echo "Install it later with: npm install -g supabase"
    fi
else
    echo "⏭️  Skipping Supabase function deployment"
fi
echo ""

# Step 4: Start development server
echo "🎮 Step 4/4: Ready to start!"
echo ""
read -p "Would you like to start the development server now? (y/n): " START_SERVER

if [ "$START_SERVER" = "y" ]; then
    echo "Starting Angular development server..."
    echo "The app will be available at http://localhost:4200"
    cd BIW
    npm start
else
    echo "✅ Setup complete!"
    echo ""
    echo "To start the development server later, run:"
    echo "  cd BIW"
    echo "  npm start"
fi