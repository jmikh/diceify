# Agentic Readiness - diceify.art (checked 2026-10-03)

**Agentic Readiness score: 60/100** (own heuristic; not a Lighthouse number).

## Method and limits
- lighthouse_agentic.py: PSI HTTP 429 (daily quota, no API key). No Lighthouse Agentic Browsing fraction available. Lighthouse 12.8.2 has no such category; proxy below uses accessibility audits only and is NOT an X/N Agentic fraction.
- agent_ux_check.py: unavailable (no Chromium). Agent-UX 0-100 heuristic not computed. Substituted: Lighthouse a11y audits + static read of the /editor page chunk.
- agentic_check.py ran fully (static). No --ua-matrix.

## A11y proxy (Lighthouse 12.8.2, audits: aria-*, button-name, link-name, image-alt, label, heading-order, landmark-one-main, link-in-text-block, document-title, html-has-lang, target-size, color-contrast)
- home mobile/desktop 15/15; gallery 14/14 each; dice-art 15/16 each (fail: link-in-text-block, pink links without underline).
- /editor was not Lighthouse-tested.

## Findings
P1 - /editor has no content for non-JS fetchers: no-JS text is "Loading workspace..." (66 words). Agents that do not execute JS see only title/h1. Fix: add a short static intro (what it does, free, upload JPG/PNG, steps crop/tune/build, link to /dice-art) in the pre-hydration HTML.
P1 - Access policy undeclared: robots.txt has one `*` group (Allow /, Disallow /account); no named AI groups, no Content-Signal. Training, search, user-triggered agents are all implicitly allowed. Decide deliberately; if desired add `Content-Signal: search=yes, ai-input=yes, ai-train=no` (Content-Signal is a Cloudflare/IETF draft preference, not enforcement; checked 2026-09-23). Note Cloudflare may inject managed robots content if enabled - verify.
P2 - /account returns 200 `index,follow` with the same title/description as /editor (only robots Disallow). Add noindex via metadata (also an SEO item).
P2 (opportunity) - No llms.txt / llms-full.txt (404). Community spec; Google ignores it; Lighthouse counts it when present. Cheap: static public/llms.txt (H1, > summary, links to /, /dice-art, /gallery, /editor, /blog).
P3 (opportunity) - Markdown: `Accept: text/markdown` on / and /dice-art returns text/html, no Vary: Accept, no .md sibling, no alternate link. No consumer agent confirmed to request it; low priority. HTML is clean and server-rendered (738 / 1202 words), so agents are already served.
P3 (opportunity) - /.well-known/: ai-plugin.json, mcp.json, agent-card.json, ai-catalog.json, api-catalog, oauth-*, ucp, security.txt all 404. ai-catalog.json is a draft; agent-card/MCP are proposals; none needed. security.txt (RFC 9116) is a hygiene item, optional.
P3 (opportunity) - WebMCP: 0 registerTool calls, no navigator.modelContext, 0 <form> elements. WebMCP is a W3C Community Group draft (WebKit opposes, Mozilla neutral; 2026-09-23). Recommendation: a tiny tool "generate_dice_pattern(image, dice_count/size, colour)" is feasible for a client-only app (the core/dice pipeline is pure TS and deterministic) but not worth building now: the user must supply an image via file picker, no agent traffic evidence, and the draft is unstable. Revisit when Chrome ships it stable; then register one imperative tool calling core pipeline. Not a defect.
PASS - Real 404s (no soft 404; but the 404 page has two robots metas, minor). Marketing pages SSR with full content, JSON-LD static, robots.txt reachable, no user-agent blocked.

## /editor accessibility tree (static read of page-0973da7c31152a4a.js)
- Good: aria-labels on icon controls (Choose a photo, Aspect ratio, Dice colour, Dice orientation, Editor steps, Canvas, Account menu, Close, Next/Previous die, Project name, Rename/Delete/Open project), one role=dialog, role=group x4. The upload is a real `<input>` (react-dropzone, accept image/*) with an accessible name, so a Playwright-driven agent can set files.
- Gaps: only 1 slider/range marker found; confirm tune controls expose role=slider with value text. No aria-live found for build/save status (autosave, saving state) - agents and screen readers get no completion signal. Canvas preview is probably a bitmap/SVG without text alternative; the build output (rows of dice faces) is not exposed as text. Needs a runtime tree check once Chromium is available.

## Access policy lines
- Training crawlers: allowed implicitly (no rules, no Content-Signal).
- Search crawlers/AI search: allowed (Allow /; /account disallowed).
- User-triggered agents (ChatGPT-User, Claude-User, Perplexity-User): not blocked; vendor behaviour per agentic_check: Claude-User honours robots, Perplexity-User/Google-Agent generally ignore.

## Standards status (checked 2026-09-23 per tool facts)
Content-Signal: Cloudflare CC0 policy + IETF draft; WebMCP: W3C CG draft; ai-catalog.json: draft; Web Bot Auth: proposal; llms.txt: community spec.

## Score rationale (60)
+ SSR content, clean semantics, 100 a11y on home, no blocking, real 404s, labelled editor controls and real file input (~50)
+ no penalty for missing drafts
- editor shell empty without JS, undeclared AI policy, unverified live status/slider semantics, no agent-ux/Lighthouse agentic data (-)

## audit-data.json entries (AI Search Readiness)
[{"title":"/editor has no static content (Loading workspace...)","severity":"medium","description":"Non-JS agents see ~66 words.","recommendation":"Add static intro text pre-hydration."},
{"title":"No AI access policy / Content-Signal","severity":"medium","description":"robots.txt has only a * group.","recommendation":"Declare intended training/search/user policy."},
{"title":"/account indexable with duplicate title","severity":"low","description":"200 index,follow, same metadata as /editor.","recommendation":"noindex."},
{"title":"No llms.txt, Markdown, well-known, WebMCP","severity":"info","description":"Opportunities, not defects.","recommendation":"Optional llms.txt; defer WebMCP."},
{"title":"No live-status announcements in editor","severity":"low","description":"No aria-live in editor chunk.","recommendation":"Add role=status for save/build state."}]
