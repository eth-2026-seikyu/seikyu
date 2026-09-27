# Slides — ETHGlobal Tokyo 2026

Four decks. Open the `.html` file in any browser; nothing is loaded from the
network, so they work with no wifi. Each deck has a matching speaker script.

| Deck | Use it for | Length | Script |
|---|---|---|---|
| [`main.html`](main.html) | Top 10 live judging | 13 slides · 3:30 | [`script-main.md`](script-main.md) · [ไทย](script-main-th.md) |
| [`world.html`](world.html) | World booth | 10 slides · ~2 min | [`script-world.md`](script-world.md) |
| [`ens.html`](ens.html) | ENS booth | 10 slides · ~2 min | [`script-ens.md`](script-ens.md) |
| [`curvegrid.html`](curvegrid.html) | Curvegrid booth (RWA) | 9 slides · ~2 min | [`script-curvegrid.md`](script-curvegrid.md) |

Every deck opens the same way — one line saying what Seikyu is, then the
problem, the fix, and one diagram of the whole deal — so nobody has to already
understand invoice factoring. Each
script says which of those slides to drop when you are short on time.

## Presenting

| Key | Does |
|---|---|
| `→` `space` `Enter` | next slide |
| `←` `Backspace` | previous slide |
| `Home` / `End` | first / last slide |
| `f` | fullscreen |

Clicking also advances; clicking the left quarter of the screen goes back.
The URL carries the slide number (`main.html#7`), so you can jump straight to
a slide and the browser's back button works.

Slides are a fixed 1280×720 box scaled to fit whatever screen you plug into,
so the layout on the projector is exactly what you see on the laptop.

## PDF backup

Every deck is also committed as a PDF next to it (`main.pdf` and so on) — take
those to the venue in case a browser or a display refuses to cooperate.

To regenerate after editing a deck:

```sh
node docs/slides/export-pdf.mjs
```

It needs the Playwright install used by the screenshot harness
(`docs/manual/capture/.pw` — see `docs/manual/capture/README.md`).

## The flow diagram

The "How it works" slide in every deck draws the same sequence diagram, defined
once in `deck.js`. A deck asks for it with an empty figure:

```html
<figure class="seq" data-hi="worldid,buy" data-sub-investor="one verified human"></figure>
```

- `data-hi` — comma-separated step or lane keys to pick out in the accent
  colour (`issue`, `ack`, `worldid`, `buy`, `transfer`, `settle`, `retire`, or a
  lane: `supplier`, `invoice`, `investor`, `debtor`)
- `data-sub-<lane>` — rewrite a lane's subtitle for that audience
- `data-t-<step>` — rewrite a step's label for that audience

Highlighting only recolours; it never dims the rest, because a dimmed diagram
is unreadable from the back of a booth.

## Screenshots

`img/` holds the slide images. They are frames taken from the recorded demo
against the live site, so every screen in the decks is the real app with real
Sepolia data — not a mockup. They were extracted from the clips in the demo
recording and cropped to their content, which is why they have odd sizes.
