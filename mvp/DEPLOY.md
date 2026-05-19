# Deploy configuration

## Railway deploy configuration

To ensure migrations are applied on every deploy:
1. Open Railway project > the Studio service
2. Settings > Deploy > Custom Start Command: `npm run start`
3. Save & redeploy

The `start` script runs `prisma migrate deploy` before `next start`, ensuring schema is always current.

## Environment variables required

Set these in Railway > Variables:

- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_URL` — public URL of the deployed Studio (e.g. `https://studio.railway.app`)
- `NEXTAUTH_SECRET` — random secret for JWT signing
- `RESEND_API_KEY` — for magic link emails
- `EMAIL_FROM` — sender address for magic link emails
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` — Cloudflare R2 storage

Do NOT set `DEV_BYPASS_AUTH` in production environments. It is ignored when `NODE_ENV=production`, but setting it is misleading and should be avoided.
