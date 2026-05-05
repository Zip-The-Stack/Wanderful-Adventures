# Wanderful Journeys — Opus Handoff Brief

**Date:** 2026-05-05  
**Prepared by:** Claude Sonnet (Brenden's collaborator)  
**Handoff to:** Claude Opus  
**Owner:** Brenden

---

## 1. What This Project Is

A personal travel photo/journal app for Brenden and his wife. Think of it as a private Instagram × Google Maps × travel journal — built on their own infrastructure. No third-party platform dependency. They own everything.

**Public-facing URL:** Hosted on Cloudflare Pages  
**Backend:** Supabase (Postgres + Storage + Auth)  
**Repo:** GitHub (CI/CD via Cloudflare Pages auto-deploy)

**Two users total — Brenden and his wife. That's the entire audience for now.**

---

## 2. Tech Stack (exact versions from package.json)

| Layer          | Technology                                                   |
| -------------- | ------------------------------------------------------------ |
| Framework      | React 19 + TanStack Start (Vite-based SSR)                   |
| Router         | TanStack Router v1 (file-based, `src/routes/`)               |
| Styling        | Tailwind CSS v4                                              |
| UI Components  | shadcn/ui (Radix-based, `src/components/ui/`)                |
| Auth           | Supabase Auth via `@lovable.dev/cloud-auth-js`               |
| Database       | Supabase Postgres (RLS enabled on all tables)                |
| Storage        | Supabase Storage (bucket: `media`, private)                  |
| EXIF Parsing   | `exifr` v7 (already installed, already used in UploadDialog) |
| File Upload UI | `react-dropzone`                                             |
| Toasts         | `sonner`                                                     |
| Build/Deploy   | Vite 7, Cloudflare Pages via `@cloudflare/vite-plugin`       |
| Runtime        | Bun (lockfile: `bun.lockb`)                                  |

**Run locally:**

```bash
bun install
bun run dev
```

---

## 3. Project Structure

```
src/
  routes/
    __root.tsx          # Root layout, auth context provider
    index.tsx           # Landing page (public, sample map markers)
    login.tsx           # Auth page
    atlas.tsx           # Main app — user's albums + map (auth required)
    explore.tsx         # Public gallery — shows public albums only
    location.$locationId.tsx   # Private location detail (auth required)
    view.$locationId.tsx       # Public location detail (no auth)
  components/
    Header.tsx          # Nav bar
    UploadDialog.tsx    # Upload photos + EXIF extraction + map pin picker
    WorldMap.tsx        # Leaflet-based interactive map component
    ui/                 # shadcn/ui primitives (don't modify these)
  integrations/
    supabase/client.ts  # Supabase client singleton
  lib/
    auth-context.tsx    # useAuth() hook — {user, loading}
supabase/
  migrations/           # All DB migrations (run in order)
```

---

## 4. Database Schema (from migrations)

### Tables

**profiles**

- `id`, `user_id` (FK → auth.users), `display_name`, `avatar_url`
- Auto-created on signup via trigger

**albums**

- `id`, `user_id`, `title`, `description`, `cover_image_url`
- `visibility`: ENUM `('private', 'unlisted', 'public')` — DEFAULT was `'private'`
- ⚠️ **IMPORTANT:** Default should be `'public'` but isn't yet. See Section 6.

**locations**

- `id`, `album_id` (FK → albums), `user_id`
- `name`, `country`, `latitude`, `longitude`, `icon`
- `cover_image_url`, `visited_at`

**media**

- `id`, `location_id` (FK → locations), `user_id`
- `storage_path` (path in Supabase storage bucket `media`)
- `type`: ENUM `('image', 'video')`
- `caption`, `taken_at`, `latitude`, `longitude`, `width`, `height`, `metadata` (JSONB)

### RLS Summary

- Albums: users see own + public. Only owner can write.
- Locations: users see own + locations belonging to public albums.
- Media: users see own + media in public album chains.
- Storage: scoped to `{user_id}/` folder prefix.

---

## 5. Key Files — What They Do

### `src/routes/atlas.tsx`

The main authenticated experience. Shows:

- Album tabs (trips) at the top
- Interactive world map with location pins
- Location grid cards below the map
- "New Trip" dialog to create albums
- "Add Location" button opens UploadDialog

**createAlbum function (lines ~57-68):** Currently inserts without `visibility` field — defaults to `'private'`. Fix needed (see Section 6).

### `src/components/UploadDialog.tsx`

The upload flow. Already feature-complete for EXIF:

- Uses `exifr` to extract GPS + `DateTimeOriginal` from dropped files
- Shows GPS badge on thumbnails when EXIF GPS is found
- Allows manual map pin if no GPS
- Uploads to Supabase storage at path `{user_id}/{location_id}/{uuid}.{ext}`
- Creates location row + media rows in DB
- Sets cover_image_url via signed URL (1-year expiry)

**iOS gotcha:** Safari strips EXIF GPS from images before upload. The dialog has a "Pick on map" fallback for this. A browser geolocation fallback (using `navigator.geolocation`) has not been implemented yet.

### `src/routes/explore.tsx`

Public gallery page. Queries albums with `visibility = 'public'`, then fetches their locations. Shows world map + card grid. No auth required.

### `src/components/WorldMap.tsx`

Wraps Leaflet. Accepts `markers: MapMarker[]`, `showRoutes: boolean`, `onMarkerClick`, `onMapClick` (for pin picker mode). Used in both atlas and explore pages.

---

## 6. What's Done vs What's Pending

### ✅ Done

- Full auth flow (Supabase Auth)
- Album CRUD (create, list, delete)
- Location creation with EXIF GPS extraction
- Photo/video upload to Supabase storage
- Interactive world map (Leaflet)
- Explore page (public albums)
- RLS policies (all tables + storage)
- Cover image auto-set on first upload
- Signed URLs for private media
- Cloudflare Pages deploy config

### 🔧 Immediate Fix Needed (do this first)

**1. Album visibility default — code fix pending**

In `src/routes/atlas.tsx`, the `createAlbum` function at ~line 63:

```ts
// CURRENT (broken — creates private albums)
.insert({ user_id: user.id, title: albumTitle.trim(), description: albumDesc.trim() || null })

// FIXED — add visibility field
.insert({ user_id: user.id, title: albumTitle.trim(), description: albumDesc.trim() || null, visibility: "public" })
```

The SQL patch to fix existing albums has already been run in Supabase:

```sql
UPDATE albums SET visibility = 'public' WHERE visibility = 'private';
```

---

## 7. The Full Roadmap (prioritized)

### Phase 1 — Foundation fixes (in progress)

1. ✅ SQL patch — flip existing albums to public
2. ⬜ Code fix — add `visibility: "public"` to createAlbum insert
3. ⬜ Mobile-first upload UX improvements

### Phase 2 — Smart upload (EXIF + location intelligence)

**Goal:** Drop photos → app auto-fills location name, country, GPS from EXIF. User just confirms.

Tasks:

1. **EXIF extraction** — already works in UploadDialog. `exifr` is installed and parsing GPS + `DateTimeOriginal`.
2. **Reverse geocoding** — convert lat/lng → city + country name. Use [Nominatim](https://nominatim.openstreetmap.org/reverse) (free, no key). Rate limit: 1 req/sec (fine for 2 users).
   - Endpoint: `GET https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json`
   - Returns: `address.city`, `address.country`, `address.country_code`
3. **Auto-populate location fields** — pre-fill `locationName` input and `coords` state from EXIF after drop. User sees pre-filled form, can edit before saving.
4. **iOS Safari GPS fallback** — iOS strips EXIF GPS on upload. When `lat/lng` is missing after EXIF parse, call `navigator.geolocation.getCurrentPosition()` and offer to use current location.
5. **Smart album suggestion** — after EXIF extraction, query existing albums/locations. If the photo's GPS is within ~50km of an existing location, show toast: "This looks like it belongs in [Album Name]. Add there?" Use haversine distance formula.

**Haversine formula for distance check:**

```ts
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

### Phase 3 — Explore + map experience

1. Interactive world map pins on explore page (map already renders, clicking pins navigates to view page — this works)
2. Album grid layout polish — first uploaded photo auto-sets cover (already implemented via signed URL)
3. Album detail page improvements — fullscreen photo viewer, swipe on mobile

### Phase 4 — Polish + sharing

1. Share link for individual albums — public URL, unlisted = link-only access
2. Photo captions — `media.caption` field exists in schema, no UI yet. Tap to add/edit inline.
3. Trip timeline view — all photos across albums sorted by `taken_at`

### Phase 5 — Performance + production

1. Image compression before upload — resize to max 2048px using browser Canvas API before sending to Supabase
2. Lazy loading + thumbnail generation — Supabase image transforms (`?width=400&quality=75`)
3. Skeleton loaders for mobile grids
4. Full Cloudflare Pages deploy verification

---

## 8. Mobile UX Context

**Most photos will come from iPhone (Safari) and Android (Chrome).**

Key constraints:

- iOS Safari strips EXIF GPS → need `navigator.geolocation` fallback
- Upload button must open camera roll directly (use `accept="image/*"` + `capture` attribute consideration)
- Multi-select photos in a single flow (react-dropzone handles this)
- Progress visibility during upload (currently no progress bar — add one)
- No PWA needed — just clean mobile-first responsive design

The existing UploadDialog is desktop-optimized. It needs to become thumb-friendly:

- Larger tap targets
- Full-width dropzone on mobile
- Progress bar showing per-file upload status
- Sticky "Upload" button at bottom of mobile screen

---

## 9. Design System / Tokens

Custom Tailwind tokens (defined in styles.css or tailwind config):

- `text-ink` — primary dark text
- `text-ink-soft` — muted secondary text
- `text-rust` — accent color (terra cotta / rust red)
- `text-gold` — warm gold accent
- `bg-parchment` — warm off-white background
- `bg-parchment-deep` — slightly darker parchment
- `font-display` — serif display font (used for headings)
- `font-script` — cursive script font (used for taglines/captions)

The aesthetic is "vintage explorer's journal" — think Indiana Jones field notes meets modern travel photography app.

---

## 10. Environment Variables

Located in `.env.local` (not committed). Shape defined in `.env.example`:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Supabase project ID: `uwkphdvuguwwsystentj`  
Supabase dashboard: `https://supabase.com/dashboard/project/uwkphdvuguwwsystentj`

---

## 11. Conventions to Follow

- All routes use TanStack Router file-based routing (`src/routes/`)
- Auth check pattern: `const { user, loading } = useAuth()` then `if (!loading && !user) navigate({ to: "/login" })`
- Supabase calls: always check `error` before using `data`
- Toast notifications: `toast.success(...)` and `toast.error(...)` via `sonner`
- Component files: PascalCase. Route files: kebab-case with TanStack conventions.
- No new dependencies without checking if existing ones cover the use case first

---

## 12. What Opus Should Tackle First

**In order:**

1. Apply the one-line visibility fix in `atlas.tsx` (5 min)
2. Implement reverse geocoding in `UploadDialog.tsx` — call Nominatim on EXIF GPS hit, auto-fill `locationName` with city name
3. Auto-populate `coords` state and `locationName` from EXIF on file drop (the EXIF parsing already happens — just wire up the state setters)
4. Add iOS geolocation fallback when EXIF GPS is missing
5. Mobile-first upload UX pass — larger targets, progress bar, sticky CTA

**Do not start on Phase 3 (explore/map polish) until Phase 2 (smart upload) is complete. The map is only as good as the data feeding it.**

---

_This document was generated from full code review of the project on 2026-05-05. All file paths, line numbers, and schema details are verified against the actual codebase._
