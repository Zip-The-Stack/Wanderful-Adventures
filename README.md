# Wanderful Journeys

A modern full-stack travel journeys application built with cutting-edge web technologies. Explore destinations, upload photos with EXIF data, and discover the world through an interactive map interface.

**Built by:** Zip The Stack  
**Created:** May 2026

## 🌍 Features

- **Interactive World Map** - Explore destinations visually with an interactive map interface
- **Photo Upload** - Upload travel photos with automatic EXIF data extraction (location, date, camera info)
- **Location Management** - Create, view, and manage your travel locations
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- **Real-time Database** - Powered by Supabase PostgreSQL
- **Authentication** - Secure user authentication via Supabase Auth
- **Beautiful UI** - Built with Radix UI components and Tailwind CSS
- **File Management** - Cloud storage integration via Supabase Storage

## 🛠️ Tech Stack

**Frontend:**

- React 19 - Modern UI library
- TypeScript - Type-safe development
- TanStack Router - Advanced routing
- Tailwind CSS - Utility-first styling
- Radix UI - Accessible components
- Recharts - Data visualization
- React Hook Form - Form management

**Backend:**

- Supabase - PostgreSQL database + Auth + Storage
- Node.js - Runtime environment

**Development & Deployment:**

- Bun - Fast package manager & runtime
- Vite - Lightning-fast build tool
- Cloudflare Workers - Serverless deployment
- GitHub Actions - CI/CD automation

**Additional Tools:**

- exifr - EXIF data extraction from photos
- react-dropzone - File upload handling
- react-resizable-panels - Flexible layouts
- sonner - Toast notifications

## 📋 Prerequisites

Before you start, ensure you have installed:

- **Bun** v1.3+ - [Install Bun](https://bun.sh)
- **Git** - [Install Git](https://git-scm.com)
- A **Supabase** account - [Create account](https://supabase.com)
- A **Cloudflare** account (for deployment) - [Create account](https://cloudflare.com)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd wanderful-journeys
bun install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_APP_ENV=development
```

**Get your credentials:**

1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Settings → API
4. Copy Project URL and anon key

### 3. Start Development Server

```bash
bun run dev
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

## 📁 Project Structure

```
wanderful-journeys/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # Radix UI components
│   │   ├── Header.tsx
│   │   ├── UploadDialog.tsx
│   │   └── WorldMap.tsx
│   ├── routes/             # TanStack Router pages
│   │   ├── index.tsx       # Home page
│   │   ├── atlas.tsx       # Atlas/map view
│   │   ├── login.tsx       # Login page
│   │   └── location.$locationId.tsx  # Location detail
│   ├── integrations/       # External services
│   │   └── supabase/       # Supabase client & auth
│   ├── lib/                # Utilities & helpers
│   ├── hooks/              # Custom React hooks
│   ├── assets/             # Images and static files
│   └── styles.css          # Global styles
├── supabase/
│   ├── migrations/         # Database migrations
│   └── config.toml
├── .github/workflows/      # CI/CD pipelines
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
├── package.json            # Dependencies
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
└── wrangler.jsonc          # Cloudflare Workers config
```

## 🔧 Available Commands

```bash
# Development
bun run dev              # Start dev server (http://localhost:8080)
bun run build            # Build for production
bun run preview          # Preview production build locally

# Code Quality
bun run lint             # Check code with ESLint
bun run format           # Format code with Prettier

# Deployment
bunx wrangler deploy     # Deploy to Cloudflare Workers
```

## 🗄️ Database Setup

Database migrations are automatically applied when you run:

```bash
supabase db push
```

Current migrations handle:

- User profiles and authentication
- Location data storage
- Photo metadata and file references
- Travel journal entries

## 🚢 Deployment

### Deploy to Cloudflare Workers

#### Prerequisites

1. Cloudflare account with Wrangler CLI
2. Environment variables configured in Cloudflare dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_APP_ENV=production`

#### Deploy

```bash
# Build and deploy
bun run build
bunx wrangler deploy

# Or in one command
bunx wrangler deploy
```

#### Monitor Deployment

```bash
# View deployment logs
bunx wrangler tail

# Check deployment history
bunx wrangler deployments list
```

### Automatic Deployment with GitHub Actions

1. Configure secrets in GitHub (see [GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md))
2. Push to `main` branch
3. GitHub Actions automatically builds and deploys

## 📚 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - 5-minute setup guide
- **[SETUP.md](SETUP.md)** - Complete setup & configuration guide
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Pre-deployment verification
- **[GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md)** - GitHub Actions setup

## 🆘 Troubleshooting

### Dev server won't start

```bash
# Clear cache and reinstall
bun install --force
bun run dev
```

### Can't connect to Supabase

- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`
- Check Supabase project is active (not paused)
- Restart dev server after updating `.env.local`

### Build fails

```bash
# Clean build
rm -rf dist
bun run build
```

### Port 8080 already in use

```bash
bun run dev --port 3000
```

## 🔐 Security

- Never commit `.env.local` or `.env.production` (both in `.gitignore`)
- Keep API keys private - use Supabase's Row Level Security policies
- Enable HTTPS in production (automatic with Cloudflare)
- Rotate authentication tokens regularly

## 📊 Performance

- **Bundle Size**: Optimized with code splitting
- **Images**: Compressed world map asset (~3MB)
- **Database**: PostgreSQL with indexes for fast queries
- **CDN**: Cloudflare global edge network

## 🎨 Customization

### Styling

- Colors and spacing in `tailwind.config.js` (Tailwind CSS)
- Global styles in `src/styles.css`
- Component styles in respective `.tsx` files

### Add New Pages

1. Create new file in `src/routes/`
2. Export default component
3. Router auto-discovers new routes

### Add New Components

1. Create component in `src/components/`
2. Use Radix UI from `src/components/ui/`
3. Import and use in routes

## 🐛 Reporting Issues

When reporting issues, please include:

- Steps to reproduce
- Expected vs actual behavior
- Environment (OS, browser, Node/Bun version)
- Error messages or logs

## 📝 Contributing

1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Make your changes and commit: `git commit -m 'Add amazing feature'`
3. Push to branch: `git push origin feature/amazing-feature`
4. Open a Pull Request

## 📄 License

This project is private and proprietary.

---

**Happy traveling! 🌍✈️**

Built with ❤️ by Zip The Stack
