# AI usage disclosure

ETHGlobal Tokyo 2026 allows AI tools but requires teams to state which files or parts used them, and to keep specs, prompts, and planning files in the repository when the workflow is spec-driven. This file is that statement. The artifacts it points to live in [`docs/planning/`](planning/README.md).

## Summary

Claude Code wrote the code in this repository; the team made the decisions, ran the deployment and the live verification, and reviewed the results. The workflow was spec-driven: AI agents drafted and reviewed the plan, a team member approved it, and executor agents implemented its task cards. The contracts, the web app, the scripts and the documentation are AI-written; the prompts that directed them and the decisions behind them are recorded verbatim in [`docs/planning/`](planning/README.md). Nothing about the project existed before the hackathon opened: the first session started at 01:45 JST on 2026-09-26, twelve hours after hacking opened, and the first commit is at 04:38 JST the same day.

## Tools and models

| Tool | Where it shows up |
|---|---|
| Claude Code (CLI) | All three sessions; the lead session ran on `claude-fable-5-1` (with `claude-opus-5-5` appearing in the same transcript) |
| oh-my-claudecode plugin 4.15.7 | `/ralplan` (planner, architect, critic agents) and `/ralph` (parallel executor agents with PRD-based verification) |
| Sub-agents | 24 spawns: 1 planner, 1 architect, 1 critic, 21 executors, on the plugin's `sonnet` (15), `opus` (6), and default (3) tiers, plus 49 follow-up instructions |
| Claude in Chrome, Playwright | Live World ID simulator runs, screenshot capture for `docs/USER_GUIDE.md` and `docs/manual/` |
| Foundry, wagmi CLI, Next.js, viem, IDKit | Ordinary toolchain, invoked by the agents |

## What AI produced, by path

| Path | AI involvement | Human involvement |
|---|---|---|
| `contracts/` (Solidity, Foundry scripts, 46 fork tests, broadcast receipts) | Written and tested by executor agents for task cards A0–A6 of [`planning/PLAN.md`](planning/PLAN.md) §3 | Funded the deployer wallet; supplied wallet addresses and RPC; read the lead's verification summaries |
| `web/` (Next.js app, World ID verify API route, e2e and diagnostic scripts) | Written by executor agents for cards B0–B6 and C0–C2 | Created the World Developer Portal app and action; supplied the app ID, RP ID, signing key, and the team API key that opened the staging window; connected their own browser wallet for the live simulator flow |
| `web/lib/{format,roles,copy}.ts`, `web/components/{ui/,RoleCards,RoleBanner,TechDetails,AddressChip,ChainGuard}.tsx`, the plain-language copy in the panels and forms, and the RPC multicall/fallback change in `web/lib/{invoices,ens,wagmi}.ts` | The "plain-language + role entry" UX layer ([`planning/PLAN-UX.md`](planning/PLAN-UX.md)): planned by the lead session with an analyst agent, implemented by seven executor agents (L1–L6, R1, F1) and checked by an independent verifier agent (L8), 21:00–23:00 JST on 26 Sep | Asked for a UI that non-web3 people understand with three clear roles, chose the "plain-language layer first, dashboards after submission" scope and Ralph over Team for execution, and asked for the global (not Japan-specific) framing |
| `docs/README.md`, `docs/ENS_INTEGRATION.md`, `docs/WORLD_ID_DEBRIEF.md`, `docs/DEMO_SCRIPT.md`, `docs/SHOWCASE.md`, `docs/SUBMISSION.md` | Written by executor agents C3 and C4; live tx hashes filled by the lead session | Asked for them via the plan; reviewed |
| The demo video (`seikyu-demo.mp4`, 2:59, linked from the README) | Recorded by an agent driving the live site with Playwright (real Sepolia transactions on inv-15/16/17, World ID via the Simulator's identity #3), narrated with macOS text-to-speech (voice "Samantha") from the talk track in `docs/DEMO_SCRIPT.md`, assembled and rendered in Blender 5.2's sequencer by the lead session through the Blender MCP bridge; no human voice or hand-recorded footage | Chose the three-wallet, no-F3 cut and the TTS-plus-captions narration; reviewed the render before uploading it |
| `docs/slides/` (four HTML decks, speaker scripts, PDFs and the slide images) | Decks and scripts written by the lead session and three executor agents against the facts in `docs/SUBMISSION.md`; every screenshot is a frame cut from the recorded live-site demo, not a mockup | Asked for slide decks instead of a live demo, set the ~10-slide shape and the split into one main deck plus one per partner, and presents them |
| `docs/USER_GUIDE.md`, `docs/manual/` | Written by an executor agent; screenshots captured by AI-written Playwright scripts against the live Sepolia deployment | Requested the manual in Thai with click-by-click screenshots (17:36 JST) |
| `docs/planning/PLAN.md` | Drafted by the planner agent, revised through one architect review and two critic rounds | Read progress, asked for a time estimate, and approved execution at 04:19 JST |
| `docs/planning/prompts/01-`…`03-` | None; these are the humans' own words | Written by the human lead |
| `docs/planning/`, `docs/AI_USAGE.md` | Assembled by Claude Code in the third session | Requested; the human decided what the disclosure must cover |

## What the humans did, with evidence

- **Chose the target and the idea.** Pasted the prize page and asked for a prize-by-prize analysis, then for prior-art checks on ten candidates, then for plain-language summaries of the two finalists before picking Invoice RWA. See [`prompts/01-`](planning/prompts/01-lead-session-human-prompts.md), 01:45–02:12 JST.
- **Approved the plan.** After two review rounds by the architect and critic agents, the human read the status and approved execution via `/ralph` at 04:19 JST. The gate result is in [`planning/state/ralplan-state.json`](planning/state/ralplan-state.json).
- **Did every step that needs a person.** [`PLAN.md`](planning/PLAN.md) §3 lists eight of them (H1–H8). Execution idled for about nine and a half hours (05:47–15:12 JST) until the human funded the deployer with 0.3 Sepolia ETH ([tx `0x823d…9044`](https://eth-sepolia.blockscout.com/tx/0x823d2bdeaf67446626607689858104efe1d566d1de655e21f8ea5ffaa63d9044)), created the World Developer Portal app and action (15:20–15:29, with screenshots of the portal), obtained the portal team API key that let the agents open the staging verification window (17:25), created the GitHub organisation (17:28) and repository (19:21) from their own session, approved making the repository public at 19:48 (`gh repo edit --visibility public`, run by the lead session on that approval), and imported the repo into Vercel and pointed the `seikyu.xyz` DNS at it (19:55–20:00). The lead session then diagnosed the first deploy's 404s (framework preset auto-detected as "Other") and pinned it in `web/vercel.json`. See [`planning/PROGRESS.md`](planning/PROGRESS.md).
- **Own wallet on the first live verification.** The first live World ID verification on Sepolia was recorded for the lead's own browser wallet (`0x2aaA…259A`, [tx `0xffdf…b975`](https://eth-sepolia.blockscout.com/tx/0xffdf3910f2e55373ac6a084bab8575a593c0467050bb3a026f3b1cc11ef3b975)).
- **Directed the documentation.** Asked for the Thai user manual, for explainer artifacts aimed at non-technical readers, and for this disclosure and planning directory, and, when the question of reshaping the commit history came up, kept it as it happened.

## How to audit this

- `git log --format='%h %ad %an%n%b' --date=iso` shows every commit with its `Co-Authored-By: Claude` trailer — the trailer names the model that actually wrote the commit: `Claude Fable 5.1` for the lead session, `Claude Sonnet 5` for executor sub-agents (the UX-layer commits after `d62740c` are mostly the latter); all commits are authored under the lead's email with the shared name "Seikyu Team" until this disclosure, and under the lead's own name after it.
- `docs/planning/prompts/01-`…`03-` are the human prompts; `04-` are the prompts the lead session gave each agent. Compare a task card in `PLAN.md` §3 with its spawn prompt in `04-` and the resulting commit to trace any file back to its instruction.
- The full transcripts (about 86 MB) are kept locally and can be shared with judges on request.

## Team

| GitHub | Role |
|---|---|
| [@ikhalas112](https://github.com/ikhalas112) | Lead: ran every Claude Code session, made the decisions above, holds the deployer and operator keys |
| [@KoonPorZa](https://github.com/KoonPorZa) | Patipol Pantarat, team member (web developer); organization owner |
| [@prakasit-lertprakitsin](https://github.com/prakasit-lertprakitsin) | Prakasit "Farm" Lertprakitsin, team member (web developer); organization owner |
| [@TaiChi112](https://github.com/TaiChi112) | Anothai Vichapaiboon, team member (CS student, agentic systems); organization owner |

Roles for the three members other than the lead are taken from their public GitHub profiles. All commits in this repository up to this disclosure were made from the lead's sessions; see the git log for who authored what after it.
