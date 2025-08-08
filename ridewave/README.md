# RideWave

AI-powered vehicle booking platform (buses, minibuses, shuttles) built with Next.js, Prisma, PostgreSQL, Tailwind, shadcn-style UI, Clerk, Stripe, Mapbox, Redis.

## Tech Stack
- Next.js (App Router, SSR/SSG)
- Tailwind CSS (dark theme, gold/blue accents)
- Prisma ORM + PostgreSQL
- Clerk (authentication, RBAC)
- Stripe (payments)
- Mapbox (maps)
- React Query (data fetching)
- Redis (caching)
- xAI Grok (AI chat/recommendations)

## Getting Started
1. Clone and install dependencies:
   ```bash
   cd ridewave
   npm install
   ```
2. Start Postgres and Redis (optional, via Docker):
   ```bash
   docker compose up -d
   ```
3. Configure environment:
   ```bash
   cp .env.example .env
   # fill in keys for Clerk, Stripe, Mapbox, xAI
   ```
4. Initialize DB:
   ```bash
   npx prisma migrate dev --name init
   npm run prisma:seed
   ```
5. Run dev server:
   ```bash
   npm run dev
   ```

## Scripts
- `npm run dev` – Next.js dev server
- `npm run build` – Build (runs `prisma generate` first)
- `npm run start` – Start production server
- `npm run prisma:migrate` – Prisma migration (dev)
- `npm run prisma:seed` – Seed sample data
- `npm run prisma:studio` – Prisma Studio

## Notes
- Update `app/page.tsx` and `app/search/page.tsx` to refine the UX.
- Add shadcn/ui components gradually (`Button` provided as minimal Tailwind variant).
- Ensure Clerk, Stripe webhooks are configured in your dashboard.
- Configure Vercel env vars before deploying.