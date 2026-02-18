import { useMemo, useState, useCallback } from 'react';
import type { FormEvent } from 'react';
import { Sparkles, Flame, WandSparkles, TriangleAlert, CheckCircle2, ClipboardCopy, Check } from 'lucide-react';

type ScoreKey = 'palette' | 'typography' | 'layout' | 'originality' | 'overallVibe';

type AnalysisResponse = {
  url: string;
  screenshotBase64: string;
  analysis: {
    verdict: string;
    scores: Record<ScoreKey, number>;
    aiSlopDetected: boolean;
    aiSlopSignals: string[];
    categoryRoasts: Record<ScoreKey, string>;
    overallAssessment: string;
  };
};

const categoryMeta: Array<{ key: ScoreKey; label: string; icon: string }> = [
  { key: 'palette', label: 'Palette', icon: 'P' },
  { key: 'typography', label: 'Typography', icon: 'T' },
  { key: 'layout', label: 'Layout', icon: 'L' },
  { key: 'originality', label: 'Originality', icon: 'O' },
  { key: 'overallVibe', label: 'Overall Vibe', icon: 'V' },
];

const loadingLines = [
  'Calibrating design snobbery...',
  'Sniffing out template crimes...',
  'Consulting the brutalist council...',
  'Zooming in on questionable kerning...',
];

function scoreClass(score: number): string {
  if (score <= 3) return 'bg-rose-500 shadow-rose-500/30';
  if (score <= 6) return 'bg-amber-400 shadow-amber-400/30';
  return 'bg-emerald-400 shadow-emerald-400/30';
}

function scoreTextClass(score: number): string {
  if (score <= 3) return 'text-rose-300';
  if (score <= 6) return 'text-amber-200';
  return 'text-emerald-300';
}

function buildPrompt(r: AnalysisResponse): string {
  const a = r.analysis;
  const scores = categoryMeta.map(({ key, label }) => `- ${label}: ${a.scores[key]}/10 — ${a.categoryRoasts[key]}`).join('\n');
  const slop = a.aiSlopDetected
    ? `AI slop was detected. Signals:\n${a.aiSlopSignals.map((s) => `- ${s}`).join('\n')}`
    : 'No obvious AI slop detected.';

  return `I ran my website (${r.url}) through an aesthetic scorer and here are the results. Use this feedback to improve the design.

## Verdict
${a.verdict}

## Scores & Feedback
${scores}

## AI Slop Check
${slop}

## Overall Assessment
${a.overallAssessment}

---

Based on this analysis, please suggest specific code changes to improve the weakest scoring areas. Focus on:
1. The lowest-scoring categories first
2. Concrete CSS/component changes (not vague advice)
3. Removing any AI slop patterns detected
4. Keeping changes minimal and high-impact`;
}

export default function App() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyPrompt = useCallback(() => {
    if (!result) return;
    navigator.clipboard.writeText(buildPrompt(result)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [result]);

  const loadingMessage = useMemo(() => {
    const index = Math.floor(Date.now() / 1000) % loadingLines.length;
    return loadingLines[index];
  }, [isLoading]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const payload = (await response.json()) as AnalysisResponse | { error: string };
      if (!response.ok) {
        throw new Error('error' in payload ? payload.error : 'Failed to analyze');
      }

      setResult(payload as AnalysisResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(244,63,94,0.16),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(251,191,36,0.12),transparent_35%),radial-gradient(circle_at_70%_80%,rgba(16,185,129,0.14),transparent_40%)]" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 pb-16 pt-14 md:px-8">
        <header className="space-y-4 text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-zinc-700/70 bg-zinc-900/80 px-4 py-2 text-xs uppercase tracking-[0.22em] text-zinc-300">
            <WandSparkles className="h-3.5 w-3.5" /> Vibe Check
          </p>
          <h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold leading-tight text-zinc-50 md:text-6xl">
            Your website gets a <span className="text-rose-300">brutally honest</span> aesthetic verdict.
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-zinc-400 md:text-base">
            Paste a URL. We screenshot it, roast it, and score every design decision from color palette to originality.
          </p>
        </header>

        <section className="mx-auto w-full max-w-3xl rounded-3xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-2xl shadow-black/50 backdrop-blur md:p-5">
          <form className="flex flex-col gap-3 md:flex-row" onSubmit={handleSubmit}>
            <label htmlFor="url" className="sr-only">
              Website URL
            </label>
            <input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-questionable-design.com"
              required
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-5 py-4 text-base text-zinc-100 outline-none ring-0 transition focus:border-zinc-500"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="cursor-pointer rounded-2xl bg-zinc-100 px-7 py-4 font-medium text-zinc-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? 'Judging...' : 'Judge it'}
            </button>
          </form>
          {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
        </section>

        {isLoading && (
          <section className="mx-auto grid w-full max-w-4xl gap-4 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-950 animate-pulse">
              <Sparkles className="h-8 w-8 text-amber-300" />
            </div>
            <p className="text-lg font-medium text-zinc-100">{loadingMessage}</p>
            <p className="text-sm text-zinc-400">We are peeking at spacing crimes and color sins. Hold tight.</p>
          </section>
        )}

        {result && (
          <section className="grid gap-6">
            <article className="grid gap-6 rounded-3xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-2xl shadow-black/60 md:grid-cols-[1fr_1.4fr] md:p-6">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-400">Snapshot</p>
                <img
                  src={result.screenshotBase64}
                  alt={`Screenshot of ${result.url}`}
                  className="max-h-[460px] w-full rounded-2xl border border-zinc-800 object-cover object-top"
                />
                <a
                  href={result.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-300 underline decoration-zinc-600 underline-offset-4 hover:text-zinc-100"
                >
                  Open site
                </a>
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-zinc-700 bg-zinc-950/80 p-5">
                  <p className="mb-2 text-xs uppercase tracking-[0.25em] text-zinc-400">Verdict</p>
                  <h2 className="text-2xl font-semibold leading-tight text-zinc-50 md:text-3xl">{result.analysis.verdict}</h2>
                </div>

                <div className="grid gap-3">
                  {categoryMeta.map(({ key, label, icon }) => {
                    const score = result.analysis.scores[key];
                    return (
                      <div key={key} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                            <span className="flex h-6 w-6 items-center justify-center rounded-md border border-zinc-700 text-[11px]">{icon}</span>
                            {label}
                          </p>
                          <p className={`text-sm font-semibold ${scoreTextClass(score)}`}>{score}/10</p>
                        </div>
                        <div className="h-2 rounded-full bg-zinc-800">
                          <div
                            className={`h-2 rounded-full shadow-lg transition-all duration-300 ${scoreClass(score)}`}
                            style={{ width: `${score * 10}%` }}
                          />
                        </div>
                        <p className="mt-3 text-sm text-zinc-300">{result.analysis.categoryRoasts[key]}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </article>

            <article className="grid gap-4 rounded-3xl border border-zinc-800 bg-zinc-900/80 p-5 md:p-6">
              <h3 className="text-sm uppercase tracking-[0.22em] text-zinc-400">AI Slop Check</h3>
              <div
                className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm ${
                  result.analysis.aiSlopDetected
                    ? 'bg-rose-500/20 text-rose-200'
                    : 'bg-emerald-500/20 text-emerald-200'
                }`}
              >
                {result.analysis.aiSlopDetected ? (
                  <>
                    <TriangleAlert className="h-4 w-4" /> AI slop detected
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> No obvious AI slop
                  </>
                )}
              </div>

              {result.analysis.aiSlopSignals.length > 0 && (
                <ul className="grid gap-2 text-sm text-zinc-300">
                  {result.analysis.aiSlopSignals.map((signal) => (
                    <li key={signal} className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3">
                      {signal}
                    </li>
                  ))}
                </ul>
              )}

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-zinc-200">
                <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-zinc-100">
                  <Flame className="h-4 w-4 text-amber-300" /> Final Assessment
                </p>
                <p className="text-sm leading-relaxed text-zinc-300">{result.analysis.overallAssessment}</p>
              </div>

              <button
                onClick={handleCopyPrompt}
                className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl border border-zinc-700 bg-zinc-950/80 px-5 py-4 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900 hover:text-white"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" /> Copied — paste into your AI coder
                  </>
                ) : (
                  <>
                    <ClipboardCopy className="h-4 w-4" /> Copy roast as AI coding prompt
                  </>
                )}
              </button>
            </article>
          </section>
        )}
      </div>
    </main>
  );
}
