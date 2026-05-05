# Wanderful Journeys - Setup & Deployment Guide

## Project Overview

This is a full-stack web application built with:

- **Frontend**: React 19 + TanStack Router + Vite
- **Styling**: Tailwind CSS + Radix UI components
- **Backend**: Supabase (PostgreSQL + Auth)
- **Hosting**: Cloudflare Workers (via Wrangler)
- **Package Manager**: Bun

## Prerequisites

Before you start, ensure you have installed:

- **Bun** (recommended) or Node.js v18+ - [Install Bun](https://bun.sh)
- **Git** - for version control
- A **Supabase** account - [supabase.com](https://supabase.com)
- A **Cloudflare** account (for deployment) - [cloudflare.com](https://cloudflare.com)

## Local Development Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd wanderful-journeys

# Install dependencies with Bun
bun install

# Or with npm
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and add your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your values:

```plaintext
VITE_SUPABASE_URL=https://wtudcdjceuawacrowdhi.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_APP_ENV=development
```

**Where to get these values:**

- **Supabase**: Dashboard → Project Settings → API Keys

### 3. Set Up Supabase Locally (Optional but Recommended)

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Start local Supabase (requires Docker)
supabase start

# Run migrations
supabase migration list
supabase db pull  # pulls latest schema from remote
```

### 4. Start Development Server

```bash
# Using Bun
bun run dev

# Or with npm
npm run dev
```

The application will be available at `http://localhost:5173`

## Development Commands

```bash
# Start development server
bun run dev

# Build for production
bun run build

# Build in development mode
bun run build:dev

# Preview production build locally
bun run preview

# Lint code
bun run lint

# Format code
bun run format
```

## Project Structure

```
src/
├── components/        # React components
│   ├── ui/           # Shadcn/Radix UI components
│   ├── Header.tsx
│   ├── UploadDialog.tsx
│   └── WorldMap.tsx
├── routes/           # TanStack Router route definitions
├── integrations/     # External service integrations
│   └── supabase/    # Supabase client & auth
├── hooks/           # Custom React hooks
├── lib/             # Utilities & helpers
├── assets/          # Images and static files
├── router.tsx       # Router configuration
├── routeTree.gen.ts # Generated route types
└── styles.css       # Global styles

supabase/
├── migrations/      # Database migrations
└── config.toml      # Supabase local config

wrangler.jsonc       # Cloudflare Workers config
vite.config.ts       # Vite configuration
```

## Database & Migrations

### View Current Schema

```bash
# Check Supabase migrations
supabase migration list

# Connect to local database
supabase db start
```

### Create New Migration

```bash
# Generate a new migration
supabase migration new <migration_name>

# Or make schema changes and pull them
supabase db pull
```

### Apply Migrations to Production

```bash
# Migrations auto-apply on deploy, but you can manually trigger:
supabase db remote set <version>
```

## Building & Testing

### Local Testing

```bash
# Build production bundle
bun run build

# Preview the production build locally
bun run preview
```

This simulates how the app will behave in production.

### Testing Checklist

- [ ] All routes load correctly
- [ ] Authentication flows work
- [ ] File upload functionality works
- [ ] Map displays correctly
- [ ] Database queries return expected data
- [ ] No console errors or warnings
- [ ] Responsive design works on mobile/tablet

## Deployment to Cloudflare Workers

### Prerequisites

1. **Cloudflare Account**: [Sign up](https://dash.cloudflare.com)
2. **Wrangler CLI**: Already in devDependencies
3. **Environment Setup**: Production `.env` variables

### Initial Setup

```bash
# Authenticate with Cloudflare
bunx wrangler login

# Create Cloudflare project (if not already created)
bunx wrangler deploy --dry-run
```

### Deploy to Production

```bash
# Build and deploy in one command
bun run build && bunx wrangler deploy

# Or manually:
bun run build
bunx wrangler deploy
```

### Environment Variables in Production

Set environment variables in Cloudflare dashboard:

1. Go to Workers → Your Project → Settings → Variables
2. Add the following secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_LOVABLE_PROJECT_ID`
   - `VITE_LOVABLE_API_KEY`
   - `VITE_APP_ENV=production`

### Monitor Deployment

```bash
# Check deployment status
bunx wrangler deployments list

# View logs
bunx wrangler tail

# Check current version
bunx wrangler deployments view
```

## Troubleshooting

### Dependencies Won't Install

```bash
# Clear Bun cache
bun install --force

# Or with npm
npm install --force
```

### Supabase Connection Issues

- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- Check Supabase project is active (not paused)
- Ensure RLS policies allow your operations

### Build Fails

```bash
# Clear build cache
rm -rf dist

# Try fresh build
bun run build
```

### Deployment Issues

- Verify all environment variables are set in Cloudflare
- Check `wrangler.jsonc` configuration
- Review Wrangler logs: `bunx wrangler tail`
- Ensure routes are properly configured in `src/routes/`

## Continuous Integration/Deployment

### Recommended CI/CD Setup (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run lint
      - run: bun run build
      - name: Deploy to Cloudflare
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: bunx wrangler deploy
```

## Git Workflow

```bash
# Never commit these files
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore
echo "dist/" >> .gitignore
echo ".DS_Store" >> .gitignore

# Commit and push changes
git add .
git commit -m "Feature: add new component"
git push origin main
```

## Performance Optimization

### Before Deployment

1. **Run Lighthouse**: DevTools → Lighthouse
2. **Check Bundle Size**: `bun run build` and analyze `dist/`
3. **Optimize Images**: Compress images in `src/assets/`
4. **Remove Unused Dependencies**: Check `package.json`

### Monitoring Production

- Set up error tracking (e.g., Sentry)
- Monitor database performance in Supabase
- Track Cloudflare Worker metrics

## Useful Links

- [TanStack Router Docs](https://tanstack.com/router/latest)
- [Supabase Documentation](https://supabase.com/docs)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)

## Support & Issues

- Check existing issues in your repository
- Review logs: `bunx wrangler tail`
- Consult Supabase dashboard for database issues
- Review browser DevTools Console for client-side errors

---

**Last Updated**: May 5, 2026
