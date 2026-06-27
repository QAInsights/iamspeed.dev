# iamspeed.dev — Feature Roadmap

A prioritized list of features to implement one-by-one. Each item is fully
doable **client-side only** (Canvas, URL hashes, localStorage, more
OpenAI-compatible adapters). The one thing that's *not* possible without a
backend is a true **global leaderboard** — social hooks are designed around
that limitation instead.

Legend: Impact / Effort (each Low–High).

---

## Tier 1 — Quick wins (ship first)

### 1. "Speed Grade" verdict 🏁 — Viral · Impact: High · Effort: Low
Like fast.com's verdict line, stamp every result with a fun tier based on
TPS thresholds: e.g. *Kachow! (1000+ tok/s)*, *Ludicrous Speed*, *Cruising*,
*Rush-hour traffic*. On-brand with the Cars theme, instantly
screenshot-worthy, and makes a bare number feel like an achievement.

- Touches: `src/components/HeroResult.tsx`, `src/components/race/RacePodium.tsx`, new `src/lib/grade.ts`.
- Acceptance:
  - A grade label + emoji renders under the hero TPS in Simple Mode.
  - A grade renders for each lane on the Race Mode podium.
  - Thresholds are unit-testable in `grade.ts`.

### 2. More "fast" providers (Cerebras, SambaNova, Together, Fireworks, DeepSeek, Mistral, xAI) — Viral + Value · Impact: High · Effort: Low–Med
Cerebras/SambaNova routinely hit **1000–2500 tok/s** — those jaw-dropping
numbers sell the app by themselves. Most are OpenAI-compatible, so they
mostly reuse `openaiCompatible.ts` + a `config.ts`/`index.ts` registration.

- Touches: `src/lib/providers/*`, `src/lib/config.ts`, CSP `connect-src` in `src/pages/index.astro`.
- Acceptance:
  - New providers appear in the Settings panel dropdown.
  - Each new provider's models load from `models.dev`.
  - CSP updated to allow the new API domains.
  - Manual smoke test: a run completes for each new provider.

### 3. Cost metrics 💰 — Value · Impact: High · Effort: Med
`models.dev` already returns pricing (currently fetched but ignored). Surface
**$ per request**, **$ / 1M tokens**, and a **TPS-per-dollar "value" score**.
In Race Mode, show a "cheapest" award alongside "fastest". This is the single
most-requested practical metric for choosing a model.

- Touches: `src/lib/modelRegistry.ts` (capture price fields), `src/lib/metrics.ts`, `src/components/SecondaryMetrics.tsx`, `src/components/race/RacePodium.tsx`.
- Acceptance:
  - $ / request and $ / 1M tokens shown in Secondary Metrics.
  - A "Best Value" award appears on the Race Mode podium.
  - Falls back gracefully when pricing is unknown.

### 4. Expanded history + export — Value · Impact: Med · Effort: Low
History is currently capped at 5 runs. Raise the cap, add a table view, and
**export CSV/JSON**. Cheap, and useful for the QA/perf crowd in the footer.

- Touches: `src/lib/history.ts`, `src/components/RecentRuns.tsx`.
- Acceptance:
  - History cap raised (e.g. 50).
  - "Export CSV" and "Export JSON" buttons in RecentRuns.
  - Clear-all still works.

---

## Tier 2 — Core bets

### 5. Shareable result image cards 🖼️ — Viral · Impact: High · Effort: Med
Today sharing is text-only. Generate a branded **PNG** client-side via Canvas
(podium, big TPS number, Speed Grade badge, model names). Offer download +
`navigator.share({ files })` on mobile. This is the highest-leverage viral
upgrade — images get ~10x the engagement of text links on social.

- Touches: new `src/lib/shareCard.ts` (Canvas renderer), `src/components/ShareBar.tsx`, `src/components/race/RacePodium.tsx`.
- Acceptance:
  - "Download image" button produces a 1200×630 PNG.
  - On mobile, `navigator.share({ files })` shares the PNG directly.
  - Image includes: site name, model(s), TPS, TTFT, Speed Grade, branding.

### 6. Shareable result permalinks 🔗 — Viral · Impact: High · Effort: Med
Encode a run/race result into the URL hash (`#r=<base64>`). Opening the link
renders a **read-only results view** (podium + metrics) with no API key
needed — "look what GPT-4o vs Claude did for me." Pairs naturally with #5.

- Caveat: no per-link social preview image without a backend (the in-app
  view still works); URL length must be kept small (store only summary
  metrics, not streamed text).
- Touches: new `src/lib/permalink.ts`, a results-view branch in `src/components/BenchmarkPanel.tsx` / `src/components/race/RacePanel.tsx`.
- Acceptance:
  - Share button copies a permalink.
  - Opening the permalink (no API key set) shows a read-only result.
  - Permalink stays under ~2 KB.

### 7. Multi-run statistical mode 📊 — Value · Impact: Med–High · Effort: Med–High
Single runs are noisy. Add "Run ×N" to report **median / mean / p95 /
std-dev** for TTFT and TPS, with a distribution sparkline. Turns a fun demo
into a number people trust enough to cite.

- Touches: `src/lib/metrics.ts` (aggregation), `src/components/BenchmarkPanel.tsx`, new results component.
- Acceptance:
  - "Run ×5 / ×10" option in Run Controls.
  - Results show median, mean, p95, std-dev for TPS and TTFT.
  - A distribution sparkline renders alongside the hero number.

---

## Tier 3 — Bigger bets (high ceiling)

### 8. Tournament / bracket mode 🏆 — Viral · Impact: High · Effort: High
Go beyond 3 lanes: seed N models into a knockout bracket, run head-to-head
rounds, crown a champion. Extremely shareable and a natural extension of
Race Mode's metaphor.

- Touches: new `src/lib/tournament/*`, new `src/components/tournament/*`, mode toggle in `TopBar.tsx`.
- Acceptance:
  - User seeds 4–8 models.
  - Bracket UI renders head-to-head rounds.
  - Champion is crowned with a shareable card.

### 9. Daily Challenge + personal-best "ghost" racing 👻 — Retention/Viral · Impact: Med–High · Effort: Med
A deterministic **prompt-of-the-day** (derived from the date, no server).
Race against your own saved **best-run "ghost" car**, track personal
bests/streaks. Drives repeat visits and "beat my time" sharing — all in
localStorage.

- Touches: new `src/lib/dailyChallenge.ts`, ghost lane in `RaceTrack.tsx`, streak UI in `TopBar.tsx`.
- Acceptance:
  - Same prompt for all users on a given day.
  - Ghost car replays the user's best run for that prompt.
  - Streak / personal-best persisted in localStorage.

### 10. Concurrency / mini load-test mode ⚡ — Value · Impact: Med · Effort: Med–High
Fire **N parallel requests** at one model; report aggregate throughput,
success rate, and latency under load. Squarely on-brand for the JMeter.ai /
QAInsights audience in the footer.

- Touches: new `src/lib/loadtest.ts`, new `src/components/LoadTestPanel.tsx`, mode toggle.
- Acceptance:
  - User picks concurrency level N and total requests.
  - Results show aggregate TPS, success rate, p95 latency.
  - A live counter shows in-flight requests.

---

## Suggested sequencing
1. **Speed Grade** + **more fast providers** (fast, high-visibility wins that
   boost shareability immediately)
2. **Cost metrics** + **history/export** (depth without much new surface area)
3. **Share image cards** + **permalinks** (the real viral engine)
4. **Multi-run stats**, then pick one Tier-3 bet (**Tournament** for viral or
   **Daily Challenge** for retention)

## Notable risks / constraints
- **No global leaderboard** purely client-side — Daily Challenge + permalinks
  + image cards are the social substitute.
- **CSP** in `src/pages/index.astro` must be updated for every new provider
  domain.
- **Permalink size** — encode only summary metrics, not streamed text, to
  keep URLs short.
- **Image-card sharing** — file sharing via `navigator.share` is mobile-only;
  desktop falls back to download.
