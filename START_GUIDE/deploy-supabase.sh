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