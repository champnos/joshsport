# Josh Maggs | MMT – Mobile Sports Massage Therapy

A complete Next.js 14 App Router website for Josh Maggs / Maggs Massage Therapy (MMT), built with Tailwind CSS and Supabase.

## Tech Stack
- **Next.js 14** (App Router + TypeScript)
- **Tailwind CSS** with brand tokens (`brand-blue: #012255`, `brand-gold: #d4a62d`)
- **Supabase** for database (treatments + bookings)
- **shadcn/ui** components
- **Vercel** ready

## Features
- Mobile-first landing page with brand colours
- Treatments page with all 4 treatments and full pricing
- 7-step booking flow (treatment → date/time → details → emergency contact → medical history → injury history → confirm)
- Availability checking with 30-min slot blocking (9am–8pm, up to 2 weeks in advance)
- Admin panel (password protected) for managing treatments and bookings
- Supabase-backed API routes

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Supabase
1. Create a free project at [supabase.com](https://supabase.com)
2. In the Supabase SQL editor, run the contents of `supabase/schema.sql`
3. Go to **Project Settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Configure environment variables
```bash
cp .env.example .env.local
```
Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
ADMIN_PASSWORD=your-secure-password
```

### 4. Run development server
```bash
npm run dev
```

Visit:
- `http://localhost:3000` — website
- `http://localhost:3000/admin` — admin panel

## Deploying to Vercel
1. Push to GitHub
2. Import the repo in [vercel.com](https://vercel.com)
3. Add the environment variables from `.env.local` in the Vercel dashboard
4. Deploy — Vercel will auto-build on every push to `main`

## Adding the Real Logo
Replace `public/logo.svg` with the real MMT logo file (`logo.png` or `logo.svg`), then update `components/Navbar.tsx` to use:
```tsx
<Image src="/logo.png" alt="MMT Logo" width={120} height={48} />
```

## Adding Photos
Look for `TODO: Replace with <Image ...` comments throughout the code to find photo placeholder spots:
- `app/page.tsx` — Josh's profile photo in the About section
- `app/treatments/page.tsx` — treatment photos section
