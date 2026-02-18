import 'dotenv/config';

import cors from 'cors';
import express from 'express';
import { chromium } from 'playwright';

const PORT = 3342;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'google/gemini-3-flash-preview';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const ANALYSIS_PROMPT = `You are a ruthless but fair web design critic.
Analyze the provided website screenshot and return only valid JSON matching this exact shape:
{
  "verdict": "string - one savage but useful line",
  "scores": {
    "palette": number, 
    "typography": number,
    "layout": number,
    "originality": number,
    "overallVibe": number
  },
  "aiSlopDetected": boolean,
  "aiSlopSignals": ["string", "..."],
  "categoryRoasts": {
    "palette": "string",
    "typography": "string",
    "layout": "string",
    "originality": "string",
    "overallVibe": "string"
  },
  "overallAssessment": "string"
}

Scoring rules:
- Each score must be an integer from 1 to 10.
- 1-3 = rough, 4-6 = mid, 7-10 = strong.
- Be specific and visually grounded in the screenshot.
- Detect obvious "AI slop" patterns (generic gradients, stock hero sameness, bland copy blocks, template overuse, weak hierarchy).
- Keep tone witty and direct, but useful.
- Output JSON only, no markdown, no commentary.`;

type AnalysisResult = {
  verdict: string;
  scores: {
    palette: number;
    typography: number;
    layout: number;
    originality: number;
    overallVibe: number;
  };
  aiSlopDetected: boolean;
  aiSlopSignals: string[];
  categoryRoasts: {
    palette: string;
    typography: string;
    layout: string;
    originality: string;
    overallVibe: string;
  };
  overallAssessment: string;
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 1;
  const rounded = Math.round(value);
  return Math.min(10, Math.max(1, rounded));
}

function sanitizeResult(raw: AnalysisResult): AnalysisResult {
  return {
    ...raw,
    scores: {
      palette: clampScore(raw.scores?.palette),
      typography: clampScore(raw.scores?.typography),
      layout: clampScore(raw.scores?.layout),
      originality: clampScore(raw.scores?.originality),
      overallVibe: clampScore(raw.scores?.overallVibe),
    },
    aiSlopDetected: Boolean(raw.aiSlopDetected),
    aiSlopSignals: Array.isArray(raw.aiSlopSignals) ? raw.aiSlopSignals.slice(0, 6) : [],
  };
}

async function captureScreenshot(targetUrl: string): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1.5,
  });

  try {
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30_000 });
    await page.waitForTimeout(600);

    // Scroll through the page to trigger lazy-loaded content
    const scrollHeight = await page.evaluate('document.body.scrollHeight') as number;
    const step = 800;
    for (let y = 0; y < scrollHeight; y += step) {
      await page.evaluate(`window.scrollTo(0, ${y})`);
      await page.waitForTimeout(200);
    }
    // Scroll back to top and wait for final paints
    await page.evaluate('window.scrollTo(0, 0)');
    await page.waitForTimeout(800);

    return await page.screenshot({ type: 'png', fullPage: true });
  } finally {
    await page.close();
    await browser.close();
  }
}

function safeParseJson(content: string): AnalysisResult {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Model did not return JSON');
  const parsed = JSON.parse(match[0]) as AnalysisResult;
  return sanitizeResult(parsed);
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/analyze', async (req, res) => {
  const { url } = req.body as { url?: string };

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' });
  }

  let normalized: URL;
  try {
    normalized = new URL(url.startsWith('http') ? url : `https://${url}`);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY is missing in environment' });
  }

  try {
    const screenshot = await captureScreenshot(normalized.toString());
    const base64 = screenshot.toString('base64');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://vibe-check.spaceynyc.dev',
        'X-Title': 'Vibe Check',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1600,
        messages: [
          { role: 'system', content: ANALYSIS_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this website screenshot for aesthetics and design quality. URL: ${normalized.toString()}`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${base64}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenRouter error ${response.status}: ${err}`);
    }

    const data = await response.json() as { choices: { message: { content: string } }[] };
    const text = data.choices?.[0]?.message?.content ?? '';

    const analysis = safeParseJson(text);

    return res.json({
      url: normalized.toString(),
      screenshotBase64: `data:image/png;base64,${base64}`,
      analysis,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return res.status(500).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`Vibe Check API running on http://localhost:${PORT}`);
});
