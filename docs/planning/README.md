# Planning, specs, and prompts

This directory is the audit trail behind the code. ETHGlobal Tokyo 2026 asks spec-driven teams to keep their specs, prompts, and planning files in the repository, so everything the AI agents were given, and everything the humans decided, is kept here verbatim. Only secret values are redacted (marked `[REDACTED]`). The companion disclosure is [`../AI_USAGE.md`](../AI_USAGE.md).

| Path | What it is | Produced by |
|---|---|---|
| [`PLAN.md`](PLAN.md) | The execution plan, v2.2 (Thai). Architecture, ENSv2 flow, contract interfaces, World ID decision, 30+ task cards for parallel executors, hourly schedule, 22 acceptance criteria, verification runbook, risks, ADR. | Planner agent; revised after an architect review (7 blocking issues) and two critic rounds (APPROVE on round 2); approved by the human lead at 2026-09-26 04:19 JST |
| [`PRD.json`](PRD.json) | 24 user stories with acceptance criteria that `/ralph` executed against. `passes` is the state at the last snapshot, not the final state. | Lead session, derived from `PLAN.md` |
| [`PROGRESS.md`](PROGRESS.md) | The lead session's running log: what each executor delivered, what the lead re-ran and verified, on-chain tx hashes, and every point where work stopped to wait for a human. | Lead session |
| [`research/`](research/) | Time-boxed spikes that closed the plan's `[UNVERIFIED]` items: ENSv2 tag pin and role constants (`spike-ensv2.md`), resolver read paths (`spike-ens-read.md`), World ID IDKit v4 credential and signal binding (`spike-world.md`), a captured live simulator result, and the staging-window response (token redacted). | Executor agents A0, B1, C0 |
| [`state/`](state/) | The `/ralplan` gate result (critic verdict, human approval) and the `/ralph` iteration state. | Tooling snapshots |
| [`prompts/01-`](prompts/01-lead-session-human-prompts.md) … [`03-`](prompts/03-repo-session-human-prompts.md) | Every prompt a person typed, in order, with JST timestamps, across the three Claude Code sessions. | Humans |
| [`prompts/04-`](prompts/04-lead-to-agent-prompts.md) | Every task prompt the lead session gave to a sub-agent: 24 spawns (1 planner, 1 architect, 1 critic, 21 executors) and 49 follow-up messages. | Lead session |

## How the work actually ran (all times JST, 2026-09-26)

1. **Ideation, 01:45–02:12.** The human lead pasted the ETHGlobal prize page and asked for a prize-by-prize analysis and project candidates, then asked for prior-art checks on ten candidates, a comparison table, and plain-language summaries. The human picked Invoice RWA (Seikyu).
2. **Planning, 02:24–04:35.** `/ralplan`: a planner agent drafted the plan, an architect agent raised 7 blocking issues, a critic agent required fixes in round 1 and approved in round 2. The result is `PLAN.md` v2.2.
3. **Approval, 04:19.** The human read the status and approved execution: "เมื่อ plan confirm แล้ว ดำเนินการตาม plan ด้วย /ralph ต่อได้เลย".
4. **Execution, from 04:38.** `/ralph`: the lead session spawned one executor per task card in three parallel lanes (A contracts, B frontend, C integrations/docs), verified each story against `PRD.json`, and committed with explicit pathspecs. Every commit carries a `Co-Authored-By: Claude` trailer.
5. **Human gates.** The plan lists eight tasks only a person could do (`PLAN.md` §3, "งานที่ต้องใช้คน"). Execution idled from 05:47 to 15:12 waiting on them. The human then funded the deployer with 0.3 Sepolia ETH (15:14, tx `0x823d…9044`), created the World Developer Portal app and action (15:20–15:29, with screenshots), and supplied the portal API key that opened the staging verification window (17:25).
6. **Documentation and review, from 17:36.** The human asked for a Thai user manual with screenshots, for explainer artifacts (sequence diagrams, plain-language descriptions), and for this planning directory and the AI disclosure.

## What is deliberately not here

- The full agent transcripts (about 86 MB of JSONL, including every tool call and file diff). They exist locally and can be provided to judges on request.
- Tooling-injected messages that nobody typed: skill instructions, agent-to-agent status notifications (106 in the lead session), and task-completion callbacks. They are omitted from `prompts/01-`…`03-`; the agent-side instructions are in `prompts/04-`.
- Secrets: the GitHub token, the World Developer Portal team API key, the staging verification token, and any private key. Each is replaced with `[REDACTED]` at the position where it appeared.
