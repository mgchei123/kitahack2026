# 🚀 Quick Deploy Guide for Newbies

This guide will help you get the project running in minutes, even if you're new to development!

## 📦 Prerequisites

Before you start, make sure you have these installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** - [Download here](https://git-scm.com/)
- **Supabase CLI** (optional, for local development) - [Installation guide](https://supabase.com/docs/guides/cli)

## 🎯 Quick Start (3 Steps)

### Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/Suanloh/kitahack2026.git

# Switch to the ai-branch(optional)
git checkout ai-branch

# Install root dependencies
npm install

# Navigate to BIW directory and install dependencies
cd BIW
npm install
cd ..
```

### Step 2: Configure Environment

You need to set up your environment variables for Supabase and Gemini AI.

```bash
# Navigate to BIW environment directory
cd BIW/src/environments

# Copy the template file
cp environment.template.ts environment.ts

# Edit the environment.ts file with your credentials
# Use any text editor (notepad, VSCode, nano, etc.)
```

Edit `BIW/src/environments/environment.ts` with your actual credentials:

```typescript
export const environment = {
  production: false,
  supabase: {
    url: 'YOUR_SUPABASE_PROJECT_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY',
  },
  geminiApiKey: "YOUR_GEMINI_API_KEY",
  
};
```

#### 🔑 Where to get your credentials:

**Supabase Credentials:**
1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create a free account
3. Create a new project
4. Go to Project Settings > API
5. Copy your `URL` and `anon/public` key

**Gemini API Key:**
1. Go to [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

### Step 3: Deploy Supabase Functions (Optional but Recommended)

If you want to use the AI features (OCR, classification, meal recommendations):

```bash
# Make sure you're in the project root
cd /path/to/kitahack2026

# Deploy using our automated script
./deploy-supabase.sh
```

If you don't have the script yet, create it using the instructions below.

---

## 🎮 Running the Project

### Development Mode

```bash
# Navigate to BIW directory
cd BIW

# Start the development server
npm start

# Or use Angular CLI directly
ng serve
```

The application will be available at: **http://localhost:4200/**

### Production Build

```bash
cd BIW
npm run build

# The build artifacts will be in BIW/dist/ directory
```

---

## 🛠️ Using Deployment Scripts (Advanced)

### Create Deployment Script

Create a file called `deploy-supabase.sh` in the project root:

```bash
#!/bin/bash

# deploy-supabase.sh - Deploy Supabase Edge Functions

set -e  # Exit on error

echo "🚀 Deploying Supabase Edge Functions..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found!${NC}"
    echo "Please install it: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Navigate to project root
cd "$(dirname "$0")"

# Check if environment is set up
if [ ! -f "supabase/.temp/project-ref" ]; then
    echo -e "${RED}❌ Supabase project not linked!${NC}"
    echo "Run: supabase link --project-ref YOUR_PROJECT_REF"
    exit 1
fi

PROJECT_REF=$(cat supabase/.temp/project-ref)
echo -e "${BLUE}📦 Deploying to project: ${PROJECT_REF}${NC}"

# Deploy functions
FUNCTIONS=(
    "ocr"
    "parse-receipt"
    "classify-items"
    "meal-recommendation"
    "expiry-alerts"
    "get-usage-history"
    "update-meal-rating"
)

for func in "${FUNCTIONS[@]}"; do
    echo -e "${BLUE}📤 Deploying function: ${func}${NC}"
    supabase functions deploy "$func" --no-verify-jwt
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ ${func} deployed successfully${NC}"
    else
        echo -e "${RED}❌ Failed to deploy ${func}${NC}"
        exit 1
    fi
done

echo -e "${GREEN}🎉 All functions deployed successfully!${NC}"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo "1. Set GEMINI_API_KEY secret: supabase secrets set GEMINI_API_KEY=your_key"
echo "2. Test your endpoints in the Supabase dashboard"
```

Make it executable:

```bash
chmod +x deploy-supabase.sh
```

### Create Configuration Helper

Create `config-helper.sh` to help set up environment variables:

```bash
#!/bin/bash

# config-helper.sh - Interactive configuration helper

echo "🔧 Configuration Helper"
echo "======================="
echo ""

# Get Supabase URL
read -p "Enter your Supabase URL: " SUPABASE_URL

# Get Supabase Anon Key
read -p "Enter your Supabase Anon Key: " SUPABASE_ANON_KEY

# Get Gemini API Key
read -p "Enter your Gemini API Key: " GEMINI_API_KEY

# Create environment.ts file
cat > BIW/src/environments/environment.ts <<EOF
export const environment = {
  production: false,
  supabase: {
    url: '${SUPABASE_URL}',
    anonKey: '${SUPABASE_ANON_KEY}',
  },
  geminiApiKey: "${GEMINI_API_KEY}",
   
  ai: {
    ocrEndpoint: '${SUPABASE_URL}/functions/v1/ocr',
    classificationEndpoint: '${SUPABASE_URL}/functions/v1/classify-items',
    mealRecommendationEndpoint: '${SUPABASE_URL}/functions/v1/meal-recommendation'
  }
};
EOF

echo ""
echo "✅ Configuration file created at: BIW/src/environments/environment.ts"
echo "🎉 You're ready to run the project!"
```

Make it executable:

```bash
chmod +x config-helper.sh
```

---

## 🔥 One-Command Deploy (The Easy Way)

Create a master deployment script `quick-deploy.sh`:

```bash
#!/bin/bash

# quick-deploy.sh - One command to rule them all

set -e

echo "🚀 KitaHack 2026 - Quick Deploy Script"
echo "======================================"
echo ""

# Step 1: Install dependencies
echo "📦 Step 1/4: Installing dependencies..."
npm install
cd BIW
npm install
cd ..

# Step 2: Configure environment
echo "🔧 Step 2/4: Configuring environment..."
if [ ! -f "BIW/src/environments/environment.ts" ]; then
    echo "⚠️  Environment file not found. Running configuration helper..."
    ./config-helper.sh
else
    echo "✅ Environment file already exists"
fi

# Step 3: Deploy Supabase functions (optional)
echo "🚀 Step 3/4: Deploy Supabase functions? (y/n)"
read -p "Deploy functions: " DEPLOY_FUNCTIONS

if [ "$DEPLOY_FUNCTIONS" = "y" ]; then
    ./deploy-supabase.sh
else
    echo "⏭️  Skipping Supabase function deployment"
fi

# Step 4: Start development server
echo "🎮 Step 4/4: Starting development server..."
cd BIW
npm start
```

Make it executable:

```bash
chmod +x quick-deploy.sh
```

---

## 📝 Usage Examples

### First Time Setup (Complete)

```bash
# Clone and setup everything
git clone https://github.com/Suanloh/kitahack2026.git
cd supabase/functions

# Run the quick deploy script
./quick-deploy.sh
```

### Deploy Supabase Functions Only

```bash
# Deploy all edge functions
./deploy-supabase.sh
```

### Reconfigure Environment

```bash
# Interactive configuration
./config-helper.sh
```

---

## 🐛 Troubleshooting

### Port 4200 already in use

```bash
# Kill the process using port 4200
npx kill-port 4200

# Or start on a different port
ng serve --port 4300
```

### Supabase CLI not found

```bash
# Install Supabase CLI
npm install -g supabase

# Or use npx (no installation needed)
npx supabase <command>
```

### Module not found errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Angular CLI not found

```bash
# Install Angular CLI globally
npm install -g @angular/cli

# Or use npx
npx ng serve
```

---

## 📚 Additional Resources

- [Angular Documentation](https://angular.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Gemini AI Documentation](https://ai.google.dev/docs)
- [Project Issues](https://github.com/Suanloh/kitahack2026/issues)

---

