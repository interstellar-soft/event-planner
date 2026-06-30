# Tony Makhlouf Photography Website

Dynamic MVP for Tony Makhlouf Photography event packages, digital invitations, RSVP storage, media quote requests, and admin review.

## Run locally

Use Node 18+.

```bash
npm start
```

On this Codex desktop workspace, you can also run:

```powershell
.\start-local.ps1
```

Then open:

- Website: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`

Default admin password for local development is:

```text
tony-admin
```

Set `ADMIN_PASSWORD` in production.

## Before deploying

1. Confirm WhatsApp is `+96170191294` in `data.js`.
2. Confirm Instagram is `https://www.instagram.com/capturedbytonymakhlouf?igsh=cDlibWNtdzJubmE3` in `data.js`.
3. Replace files in `assets/portfolio/` with Tony's real work when ready, keeping the same filenames for the fastest swap:
   - `wedding-placeholder.png`
   - `baptism-placeholder.png`
   - `business-placeholder.png`
4. Set a strong `ADMIN_PASSWORD`.

## Deploy

This is no longer a static site. Use a Node host such as Render, Railway, Fly.io, or a VPS. A `render.yaml` blueprint is included.

Render/Railway settings:

- Build command: leave empty or `npm install`
- Start command: `npm start`
- Environment variables:
  - `ADMIN_PASSWORD=<strong password>`
  - `OPENAI_API_KEY=<OpenAI API key>` enables AI invitation covers
  - `ELEVENLABS_API_KEY=<ElevenLabs API key>` enables instrumental soundtracks
  - `CLOUDINARY_CLOUD_NAME=<Cloudinary cloud name>`
  - `CLOUDINARY_API_KEY=<Cloudinary API key>`
  - `CLOUDINARY_API_SECRET=<Cloudinary API secret>`
  - `WHISH_PAYMENT_NUMBER=<Tony's Whish recipient number>`
  - `BANK_PAYMENT_DETAILS=<bank name, account/IBAN, and recipient>`
  - `PORT` is usually provided by the host

Clients browse 21 high-quality ready-to-use invitation templates by occasion: Wedding, Baptism, First Communion, Engagement, Birthday, Business, and Other Celebrations. Ready designs are priced from $49 to $89, while the $149 Custom Atelier service keeps AI cover and soundtrack controls on the admin side.

The admin AI controls remain disabled until their provider keys are configured. Cloudinary is strongly recommended in production so custom generated covers and soundtracks survive host restarts and redeployments. Without Cloudinary, generated files are stored temporarily in `generated/`.

Client purchases currently use manual verification. A client selects a template, previews it with a watermark, and submits a Whish or bank transfer reference from the private studio. Tony previews the result and approves or rejects it from `/admin`. Approval unlocks RSVP controls and publishing. Template selection locks while payment is under review.

Optional generation controls:

- `MAX_COVER_GENERATIONS=6`
- `MAX_MUSIC_GENERATIONS=3`
- `ELEVENLABS_MUSIC_MODEL=music_v1`

## Current limitations

This MVP stores data in `data/db.json`. That works for a small private deployment, but production at scale should move to PostgreSQL/Supabase and object storage for uploaded galleries.
