# Atom website

The public product website for Atom, a voice-first and offline-first personal reminder assistant.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production

```bash
npm run build
npm start
```

The project is a standard Next.js application ready to import into Vercel. Set `NEXT_PUBLIC_SITE_URL` to the production URL when one is assigned.

## Android APK

The official Android APK is served from `public/atom.v.04.apk`. Replace that file and update the version copy in the site when publishing a new Android release.
