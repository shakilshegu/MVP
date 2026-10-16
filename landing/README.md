# Rota landing page

Marketing site for Rota, built with Next.js (static export). English at `/`, German at `/de`.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

## Build

```bash
npm run build      # writes the finished site to out/
```

`out/` is plain HTML, CSS and JS and can be hosted anywhere.

## Deploy on Vercel

Import the repo on vercel.com as a new project and set **Root Directory** to `landing`. Vercel detects Next.js automatically.

## Before going live

- **Demo link:** set the environment variable `NEXT_PUBLIC_APP_URL` to the address of the Rota app (for example the Vercel URL of `restaurant-scheduler`). Until it is set, "Open the live demo" opens an email instead.
- **Contact email:** change `site.email` in `src/content.ts` (currently `hello@rota.app`).
- **Impressum and Datenschutz:** required in Germany. Link the footer items in `src/components/Landing.tsx` to the real pages.

## Editing the text

All copy, in both languages, is in `src/content.ts`. Screenshots are in `public/screens/`.
