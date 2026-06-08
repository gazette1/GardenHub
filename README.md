# GardenCam 🏀📹

A live **traffic-cam watch-party viewer**, dressed as an ABC NBA Finals broadcast. Watch the real NYC street scene outside tonight's watch-party venues using NYC DOT's public traffic-camera snapshots, refreshed on a timer to fake a live feed — with an editable broadcast-style score bug.

> Single-page static site. No framework, no build step, no backend, no API keys.

## Features

- **Multi-venue switcher** — Bryant Park, Wollman Rink, Brooklyn Bowl, and Madison Square Garden, each with its own ring of nearby cameras.
- **Featured tile + thumbnail grid** — every camera auto-refreshes ~every 2s with a cache-buster to simulate a live feed. Click a tab or thumbnail to promote any camera.
- **Editable score bug** — TV-broadcast chyron pinned lower-left. Tap a number or team abbreviation, type, Enter. In-memory only; the score follows you across venues.
- **Buggy-cam handling** — a dropped camera flips *only its own tile* to `RECONNECTING…` and retries on the next tick; siblings keep updating.
- **ABC-Finals aesthetic** — dark broadcast surface, golden accent, condensed type, glass chyron with team-color end tabs. See [`design.md`](design.md).

## Run it

It's static — just open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Deployable as-is to GitHub Pages or a Netlify drop.

## How the "live" feed works

NYC DOT publishes public traffic cameras (no auth, no key):

- Camera image: `https://webcams.nyctmc.org/api/cameras/{id}/image`
- Each `<img>` is reloaded every `REFRESH_MS` with a `?cacheAvoidance=` cache-buster so the browser fetches a fresh frame.

The `/api/cameras` JSON list is CORS-blocked from the browser, so the app ships with hand-verified camera IDs per venue (see `VENUES` in [`app.js`](app.js)) and falls back to them silently. Camera UUIDs go stale over time; if a venue looks dead, refresh the IDs from the live list.

## Config

All tunables live at the top of [`app.js`](app.js): `REFRESH_MS`, `NUM_CAMS`, the default `TEAMS`, and the `VENUES` array (re-targetable to any spot by editing `lat`/`lng` + `cams`).

## Credits

Camera feeds: [NYC DOT Traffic Management Center](https://webcams.nyctmc.org/map). Not affiliated with the NBA, ABC, or any team — broadcast styling is homage only.
