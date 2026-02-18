# Vibe Check

A dark, opinionated URL roast tool.

## Stack
- Frontend: React + Vite + TypeScript + Tailwind CSS (v4)
- Backend: Express API on `:3456`
- Screenshot: Playwright Chromium
- Vision analysis: Anthropic Claude (`claude-sonnet-4-20250514`)

## Run
```bash
npm install
npx playwright install chromium
npm run dev:api   # API server on 3456
npm run dev       # Vite frontend on 5173
```

## Endpoints
- `GET /api/health`
- `POST /api/analyze` body: `{ "url": "https://example.com" }`

Returns:
- normalized URL
- screenshot data URL (`screenshotBase64`)
- structured analysis JSON with scores, verdict, category roasts, AI slop signals

## Dev URL (Tailscale)
- Frontend: `http://spaceynycs-mac-mini-1.tailbf3a3b.ts.net:5173`
- API: `http://spaceynycs-mac-mini-1.tailbf3a3b.ts.net:3456`
