# Josh Maggs Sports Massage Website

A complete Next.js 14 App Router website for Josh Maggs Sports Massage Therapy, built with Tailwind CSS and shadcn-style UI components. The site includes public marketing pages, a client booking flow, and a password-protected admin area backed by JSON file storage.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn-style UI components
- JSON file storage in `data/`

## Features

- Mobile-first landing page with athletic dark theme
- Treatments page powered by `data/treatments.json`
- Multi-step booking flow with live availability lookup
- Admin area for treatment management and booking status updates
- File-based booking storage with no database required

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create your environment file:
   ```bash
   cp .env.example .env.local
   ```
3. Set an admin password in `.env.local`:
   ```env
   ADMIN_PASSWORD=your-secure-password
   ADMIN_SESSION_SECRET=replace-with-a-long-random-string
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Visit:
   - `http://localhost:3000` — website
   - `http://localhost:3000/admin` — admin panel

## Data Storage

The site uses JSON files inside `data/`:

- `data/treatments.json` — editable treatment catalogue
- `data/bookings.json` — booking requests (gitignored)
- `data/working-hours.json` — business availability used to generate slots

## Build

```bash
npm run build
```

## Deployment Notes

- This project is designed for environments where the filesystem is writable.
- Ensure `ADMIN_PASSWORD` is configured in production.
- Set `ADMIN_SESSION_SECRET` in production to a long random string so admin sessions remain valid across restarts and instances.
- If you deploy to a serverless environment, persisted JSON writes may require adapted storage.
