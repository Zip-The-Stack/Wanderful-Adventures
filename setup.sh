#!/bin/bash

# Wanderful Journeys - Local Development Setup Script
# This script sets up everything needed for local development

set -e  # Exit on error

echo "🚀 Wanderful Journeys - Setup Script"
echo "=================================="

# Check for required tools
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install it first:"
        echo "   $2"
        exit 1
    fi
}

echo "📋 Checking prerequisites..."
check_command "bun" "https://bun.sh"
check_command "git" "https://git-scm.com"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
bun install

# Create environment file if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo ""
    echo "⚙️  Creating .env.local..."
    cp .env.example .env.local
    echo "⚠️  Please edit .env.local with your Supabase and Lovable credentials"
fi

# Setup Supabase (optional)
echo ""
echo "🗄️  Supabase Setup (optional)"
if command -v supabase &> /dev/null; then
    echo "✅ Supabase CLI detected"
    read -p "Start local Supabase? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        supabase start
    fi
else
    echo "ℹ️  Supabase CLI not found. Optional for local development."
    echo "   Install: brew install supabase/tap/supabase"
fi

# Run linter
echo ""
echo "🔍 Running linter..."
bun run lint --fix || true

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local with your credentials"
echo "2. Run 'bun run dev' to start the development server"
echo "3. Visit http://localhost:5173"
echo ""
echo "📚 For more info, see SETUP.md"
