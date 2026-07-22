# Ušetri

AI-powered grocery discount platform for Slovakia. Tracks weekly promotional leaflets
from Slovak supermarkets (Tesco, Lidl, Kaufland, Billa, COOP Jednota, Terno, Fresh,
Metro, Biedronka), extracts offers with AI, and helps users save with price comparison,
shopping-list optimization, and personalized email alerts.

Full system design: [`../ARCHITECTURE.md`](../ARCHITECTURE.md)

## Stack

Next.js 16 (App Router) · TypeScript · TailwindCSS 4 + shadcn/ui · PostgreSQL + Prisma 7 ·
Auth.js v5 · Inngest · Resend · next-intl (sk) · Vercel

## Development

```bash
npm install
cp .env.example .env        # fill in secrets
npx prisma dev              # local Postgres (or point DATABASE_URL elsewhere)
npx prisma migrate dev      # apply migrations
npm run db:seed             # chains, categories, brands
npm run dev                 # http://localhost:3000
```

## AI leaflet pipeline (local dev)

Two terminals:

```bash
npm run dev            # Next.js on :3000
npm run inngest:dev    # Inngest dev server on :8288 (dashboard + event queue)
```

Then in the admin (`/admin/letaky`): upload a chain's PDF → the pipeline renders pages,
extracts offers with the vision model, and stages them → review at `/admin/kontrola` →
publish. Requires `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:migrate` | Create/apply dev migration |
| `npm run db:seed` | Seed base data |
| `npm run db:studio` | Prisma Studio |

## Project layout

See `ARCHITECTURE.md` §3 — `src/app` (routes), `src/components`, `src/server`
(services/repositories), `src/jobs` (Inngest), `src/emails`, `src/i18n`, `prisma/`.
