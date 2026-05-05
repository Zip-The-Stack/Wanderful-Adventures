# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Initial Setup

```bash
# Run the setup script
./setup.sh

# Or manually:
bun install
cp .env.example .env.local
# Edit .env.local with your credentials
```

### 2. Start Developing

```bash
bun run dev
# Open http://localhost:5173
```

### 3. Make Changes & Test

```bash
# Format code
bun run format

# Check for errors
bun run lint
```

## 📁 What Was Set Up

### Configuration Files

- **`.env.example`** - Template for environment variables
- **`.env.local`** - Your local development credentials (git-ignored)
- **`.env.production`** - Production environment template
- **`.gitignore`** - Prevents committing sensitive files

### Setup & Documentation

- **`SETUP.md`** - Comprehensive setup & deployment guide
- **`DEPLOYMENT_CHECKLIST.md`** - Pre-deployment verification
- **`setup.sh`** - Automated setup script (executable)

### Infrastructure

- **`Dockerfile`** - Container build configuration
- **`docker-compose.yml`** - Local PostgreSQL + Redis for development

### CI/CD Pipelines

- **`.github/workflows/deploy.yml`** - Auto-deploy on push to main
- **`.github/workflows/pr-checks.yml`** - PR validation (lint, build, type check)

## 🔧 Available Commands

```bash
# Development
bun run dev          # Start dev server (http://localhost:5173)
bun run build        # Production build
bun run preview      # Preview production build locally

# Code Quality
bun run lint         # Check for errors
bun run format       # Auto-format code

# Deployment
bunx wrangler deploy # Deploy to Cloudflare Workers
```

## 🔑 Required Credentials

Before starting, get your **Supabase** credentials:

1. **Supabase** (supabase.com)
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

Add them to `.env.local`

## 📦 Tech Stack

- **Frontend**: React 19 + TypeScript
- **Routing**: TanStack Router
- **Styling**: Tailwind CSS + Radix UI
- **Backend**: Supabase (PostgreSQL + Auth)
- **Package Manager**: Bun
- **Hosting**: Cloudflare Workers
- **CI/CD**: GitHub Actions

## 🚢 Deployment Workflow

1. **Local Development**

   ```bash
   bun run dev
   ```

2. **Testing**

   ```bash
   bun run build
   bun run preview
   ```

3. **Deploy to Production**
   - Push to `main` branch
   - GitHub Actions automatically builds and deploys
   - Or manually: `bunx wrangler deploy`

## ✅ Next Steps

- [ ] Edit `.env.local` with your credentials
- [ ] Run `bun run dev` to start development
- [ ] Read `SETUP.md` for detailed information
- [ ] Review `DEPLOYMENT_CHECKLIST.md` before deploying
- [ ] Set up GitHub secrets for CI/CD (if using GitHub Actions)

## 📚 Additional Resources

- [SETUP.md](SETUP.md) - Complete setup guide
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Pre-deployment checklist
- [TanStack Router](https://tanstack.com/router/latest)
- [Supabase Docs](https://supabase.com/docs)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Vite Documentation](https://vitejs.dev)

## 🆘 Troubleshooting

### Dependencies won't install

```bash
bun install --force
```

### Port 5173 already in use

```bash
bun run dev --port 3000
```

### Build fails

```bash
rm -rf dist
bun run build
```

### Environment variables not loading

- Restart dev server after updating `.env.local`
- Verify variable names match (case-sensitive)
- Check for spaces in values

## 💡 Tips

- Use `bun run format` before committing
- Check `.env.example` for all available variables
- Review logs with `bunx wrangler tail` after deploying
- Enable Supabase local development with `supabase start` (requires Docker)

---

**Ready to code?** Run `./setup.sh` or `bun run dev` to start! 🎉
