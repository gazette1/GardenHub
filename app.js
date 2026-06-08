/* ============================================================================
   GardenCam — live NYC traffic-cam watch-party viewer (ABC Finals homage)
   Vanilla JS. No deps, no build, no backend, no storage APIs.
   ============================================================================ */

/* ----------------------------- CONFIG (editable) -------------------------- */

const REFRESH_MS = 2000;          // each tile reloads this often
const NUM_CAMS = 6;               // soft cap on cams shown per venue
let TEAMS = { home: "NYK", away: "SAS" }; // default score-bug teams (also editable in UI)

// Multi-venue: each venue carries its own curated, verified-working cam UUIDs.
// Curated-first: these always render. A live /api/cameras fetch only enriches
// labels/online-status for these IDs; haversine orders them (nearest = default).
// NOTE: IDs below were live-verified against /api/cameras (image endpoint
// returned a real JPEG, isOnline=true, nearest to each venue). Stale IDs
// 404 and would sit on RECONNECTING forever, so they were replaced.
const VENUES = [
  { name: "Bryant Park (watch party)", lat: 40.7536, lng: -73.9832, cams: [
    { id: "34674be5-4791-47f1-b0b2-2db0ff619732", name: "6 Ave @ 39 St" },
    { id: "83655dbc-7902-4fdb-926c-15fee4396b83", name: "Broadway @ 38 St" },
    { id: "c6d013c9-e69b-4824-8dad-b6580491d916", name: "Madison Ave @ E 43 St" },
    { id: "d8122408-7092-41ba-a9db-ef8847edeaef", name: "Broadway @ 43 St" },
    { id: "5d055599-875a-4010-991f-e7e454889052", name: "7 Ave @ 40 St" },
    { id: "879ab924-18ac-4779-a681-395d73a0f0cc", name: "Madison Ave @ E 44 St" }
  ]},
  { name: "Wollman Rink (Central Park)", lat: 40.7677, lng: -73.9740, cams: [
    { id: "332f161d-47cb-4c8a-b6b6-5ad48a55c978", name: "Ave of Americas @ Central Park South" },
    { id: "cd949f21-54b2-4d11-8aae-4ffba8654271", name: "5 Ave @ E 60 St" },
    { id: "81db80c2-13fe-4ae7-8b47-c08aa42d512f", name: "5 Ave @ 66 St" },
    { id: "a4c12003-9638-473d-bfe3-dddf509c80b8", name: "6 Ave @ 58 St" },
    { id: "b5a78bda-3ca9-4ad4-bd03-4cee70baba2d", name: "5 Ave @ 59 St" },
    { id: "6d3a21dd-0434-4d92-a0d1-3ca8b77297db", name: "5 Ave @ E 58 St" }
  ]},
  { name: "Brooklyn Bowl", lat: 40.7219, lng: -73.9574, cams: [
    { id: "6a5f91d8-042f-4678-a722-2c3c560dedf2", name: "Wythe Ave @ North 12 St" },
    { id: "40213626-3ef8-4d63-be77-e1d84ca4d19c", name: "Metropolitan Ave @ Berry St" },
    { id: "0ed1503d-23fc-4102-ada3-5d647a7b20cb", name: "Metropolitan Ave @ Marcy Ave" },
    { id: "6232350a-c27c-4964-a6e8-7bd0507b6826", name: "BQE @ Metropolitan Ave (EB)" },
    { id: "41610046-fbab-40be-b824-4afa48119bec", name: "BQE @ Manhattan Ave (WB)" },
    { id: "ba4a1b3a-6e33-4742-a471-18f204f488ef", name: "Metropolitan Ave @ Union Ave" }
  ]},
  { name: "Madison Square Garden", lat: 40.7505, lng: -73.9934, cams: [
    { id: "6a85384f-d82e-4bff-b5f1-15c22cca70e6", name: "8 Ave @ 33 St" },
    { id: "ec9ffb62-e3bf-4352-8bcf-7c9adf5fbe9c", name: "8 Ave @ 31 St" },
    { id: "f2964d50-042c-4021-8b52-992c08c6ff6f", name: "8 Ave @ 34 St" },
    { id: "1e60ade7-c760-48cf-acd9-d9d6cbfa9420", name: "7 Ave @ 32 St" },
    { id: "ee1b1d85-e8ce-485f-a539-12962933eb9f", name: "7 Ave @ 34 St" },
    { id: "b0cbb042-de0a-449f-b5d1-49f68a9bf2ae", name: "7 Ave @ 36 St" }
  ]}
];
let activeVenue = 0; // default to Bryant Park tonight

const API_BASE = "https://webcams.nyctmc.org/api/cameras";
const imageUrl = (id) => `${API_BASE}/${id}/image?cacheAvoidance=${Date.now()}`;

/* ------------------------------ APP STATE --------------------------------- */

let liveCameras = null;   // cached array from /api/cameras, or null if it failed
let cams = [];            // resolved cam list for the active venue: {id, name, ok}
let featuredIndex = 0;    // which cam is featured (resets per venue)

/* --------------------------- GEO: haversine ------------------------------- */

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371; // km
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/* --------------------- CAMERA RESOLUTION (per venue) ---------------------- */
/* Curated-first: always start from the venue's hand-picked cams. If the live
   list is available, enrich each curated cam's label + drop offline ones, then
   order by haversine distance to the venue (nearest = default featured). */

function resolveCams(venue) {
  const curated = venue.cams.map((c) => ({ id: c.id, name: c.name, ok: true }));

  if (Array.isArray(liveCameras) && liveCameras.length) {
    const byId = new Map(liveCameras.map((lc) => [String(lc.id), lc]));
    const enriched = curated
      .map((c) => {
        const live = byId.get(String(c.id));
        if (!live) return c; // not in live list — keep curated as-is
        return {
          id: c.id,
          name: live.name || c.name,                 // prefer real API label
          ok: String(live.isOnline).toLowerCase() !== "false", // isOnline is a STRING
          lat: live.latitude,
          lng: live.longitude,
        };
      })
      .filter((c) => c.ok);

    // If enrichment nuked everything (all flagged offline), fall back to curated.
    const list = enriched.length ? enriched : curated;

    // Order by distance to the venue when we have coords; nearest first.
    list.sort((a, b) => {
      if (a.lat == null || b.lat == null) return 0;
      return (
        haversine(venue.lat, venue.lng, a.lat, a.lng) -
        haversine(venue.lat, venue.lng, b.lat, b.lng)
      );
    });

    return list.slice(0, NUM_CAMS);
  }

  // No live list (CORS-blocked or pre-enrichment): pure curated.
  return curated.slice(0, NUM_CAMS);
}

/* --------------------------- LIVE FETCH (once) ---------------------------- */
/* Fire once on load. Render is NOT blocked on this — curated tiles paint
   immediately; if/when this resolves we silently re-resolve + re-render. */

function fetchLiveCameras() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000); // don't hang on a slow/dead fetch

  fetch(API_BASE, { signal: ctrl.signal })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bad status"))))
    .then((data) => {
      clearTimeout(timer);
      if (Array.isArray(data) && data.length) {
        liveCameras = data;
        // Silent enrichment: re-resolve current venue + re-render (no flash).
        selectVenue(activeVenue, /*preserveFeatured*/ true);
      }
    })
    .catch(() => {
      clearTimeout(timer);
      // Silent fallback — curated tiles are already live. Do nothing.
    });
}

/* ------------------------------ DOM refs ---------------------------------- */

const el = {
  venues: document.getElementById("venues"),
  cams: document.getElementById("cams"),
  grid: document.getElementById("grid"),
  featuredImg: document.getElementById("featuredImg"),
  featuredLabel: document.getElementById("featuredLabel"),
  featuredReconnect: document.getElementById("featuredReconnect"),
  liveBadge: document.getElementById("liveBadge"),
  tabHome: document.getElementById("tabHome"),
  tabAway: document.getElementById("tabAway"),
  abbrHome: document.getElementById("abbrHome"),
  abbrAway: document.getElementById("abbrAway"),
  scoreHome: document.getElementById("scoreHome"),
  scoreAway: document.getElementById("scoreAway"),
};

/* --------------------------- RENDER: venues ------------------------------- */

// Short pill labels; full name kept as tooltip + featured section context.
function shortVenueName(name) {
  return name.replace(/\s*\(.*\)\s*/, "").replace("Madison Square Garden", "MSG").trim();
}

function renderVenues() {
  el.venues.replaceChildren();
  VENUES.forEach((v, i) => {
    const btn = document.createElement("button");
    btn.className = "venue" + (i === activeVenue ? " venue--active" : "");
    btn.type = "button";
    btn.textContent = shortVenueName(v.name);
    btn.title = v.name;
    btn.setAttribute("aria-pressed", i === activeVenue ? "true" : "false");
    btn.addEventListener("click", () => selectVenue(i, /*preserveFeatured*/ false));
    el.venues.appendChild(btn);
  });
}

/* ---------------------------- RENDER: cam tabs ---------------------------- */

function renderCamTabs() {
  el.cams.replaceChildren();
  cams.forEach((c, i) => {
    const btn = document.createElement("button");
    btn.className = "cam" + (i === featuredIndex ? " cam--active" : "");
    btn.type = "button";
    btn.textContent = `Cam ${i + 1}`;
    btn.title = c.name;
    btn.setAttribute("aria-pressed", i === featuredIndex ? "true" : "false");
    btn.addEventListener("click", () => setFeatured(i));
    el.cams.appendChild(btn);
  });
}

/* --------------------------- RENDER: thumbnails --------------------------- */
/* Each thumbnail owns its own <img> with independent onerror -> RECONNECTING.
   One dead cam never affects siblings. The global ticker reloads all mounted
   tiles; teardown is just a DOM replace (no timers per tile). */

function makeReconnectOverlay() {
  const ov = document.createElement("div");
  ov.className = "reconnect";
  ov.hidden = true;
  ov.innerHTML =
    '<div class="reconnect__static" aria-hidden="true"></div>' +
    '<span class="reconnect__txt">RECONNECTING…</span>';
  return ov;
}

function wireTileImg(img, overlay, onState) {
  img.addEventListener("load", () => {
    overlay.hidden = true;
    img.classList.remove("is-down");
    if (onState) onState(true);
  });
  img.addEventListener("error", () => {
    overlay.hidden = false;
    img.classList.add("is-down");
    if (onState) onState(false);
    // Retry happens automatically on the next global tick.
  });
}

function renderGrid() {
  el.grid.replaceChildren();
  el.grid.style.setProperty("--cam-count", cams.length);

  cams.forEach((c, i) => {
    const tile = document.createElement("button");
    tile.className = "tile tile--thumb" + (i === featuredIndex ? " tile--active" : "");
    tile.type = "button";
    tile.title = `Feature ${c.name}`;

    const img = document.createElement("img");
    img.className = "tile__img";
    img.alt = c.name;

    const overlay = makeReconnectOverlay();

    const label = document.createElement("div");
    label.className = "tile__label";
    label.textContent = c.name;

    tile.append(img, overlay, label);
    wireTileImg(img, overlay);
    tile.addEventListener("click", () => setFeatured(i));

    // mark image with cam id so the ticker can reload it
    img.dataset.camId = c.id;
    el.grid.appendChild(tile);

    img.src = imageUrl(c.id); // initial frame
  });
}

/* ---------------------------- FEATURED control ---------------------------- */

function setFeatured(i) {
  if (i < 0 || i >= cams.length) return;
  featuredIndex = i;
  const c = cams[i];

  // honest LIVE badge — reset to a neutral state until first frame loads
  setLiveState(null);

  el.featuredLabel.textContent = c.name;
  el.featuredImg.dataset.camId = c.id;

  // cross-fade-ish: clear then load fresh
  el.featuredImg.classList.remove("is-down");
  el.featuredReconnect.hidden = true;
  el.featuredImg.src = imageUrl(c.id);

  // reflect active state on tabs + thumbs without full re-render
  [...el.cams.children].forEach((b, idx) =>
    b.classList.toggle("cam--active", idx === featuredIndex)
  );
  [...el.grid.children].forEach((t, idx) =>
    t.classList.toggle("tile--active", idx === featuredIndex)
  );
}

// LIVE badge honesty: true=live, false=reconnecting, null=neutral/loading
function setLiveState(state) {
  const badge = el.liveBadge;
  badge.classList.toggle("livebadge--down", state === false);
  badge.querySelector(".livebadge__txt").textContent =
    state === false ? "RECONNECTING" : "LIVE";
}

// wire the featured img once (persists across venue/cam swaps)
wireTileImg(el.featuredImg, el.featuredReconnect, (ok) => setLiveState(ok));

/* ----------------------------- VENUE select ------------------------------- */

function selectVenue(i, preserveFeatured) {
  activeVenue = i;
  const venue = VENUES[i];
  cams = resolveCams(venue);

  if (!preserveFeatured || featuredIndex >= cams.length) {
    featuredIndex = 0; // reset featured per venue (nearest curated cam)
  }

  renderVenues();
  renderCamTabs();
  renderGrid();
  setFeatured(featuredIndex);
}

/* ------------------------------ REFRESH loop ------------------------------ */
/* ONE global ticker. Each tick reassigns every mounted <img>.src with a fresh
   cache-buster. Loads are async + independent, so a hung/dead cam only flips
   its own tile to RECONNECTING via its own onerror; siblings keep updating.
   Venue switch = DOM replace, so there is nothing to tear down here. */

function tick() {
  // featured
  if (el.featuredImg.dataset.camId) {
    el.featuredImg.src = imageUrl(el.featuredImg.dataset.camId);
  }
  // thumbnails
  el.grid.querySelectorAll("img[data-cam-id]").forEach((img) => {
    img.src = imageUrl(img.dataset.camId);
  });
}

/* ------------------------------ SCORE BUG --------------------------------- */

function paintTeams() {
  el.abbrHome.textContent = TEAMS.home;
  el.abbrAway.textContent = TEAMS.away;
  if (el.scoreHome.textContent.trim() === "") el.scoreHome.textContent = "0";
  if (el.scoreAway.textContent.trim() === "") el.scoreAway.textContent = "0";
}

function clampScore(raw) {
  const n = parseInt(String(raw).replace(/\D/g, ""), 10);
  if (isNaN(n)) return "0";
  return String(Math.max(0, Math.min(199, n)));
}

function cleanAbbr(raw) {
  const a = String(raw).replace(/\s+/g, "").toUpperCase().slice(0, 4);
  return a || "—";
}

function wireEditable(node, { kind }) {
  let prev = node.textContent;

  node.addEventListener("focus", () => {
    prev = node.textContent;
    // select all for quick overwrite
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(node);
    sel.removeAllRanges();
    sel.addRange(range);
  });

  node.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      node.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      node.textContent = prev;
      node.blur();
    }
  });

  node.addEventListener("blur", () => {
    if (kind === "score") {
      node.textContent = clampScore(node.textContent);
    } else {
      node.textContent = cleanAbbr(node.textContent);
      if (node === el.abbrHome) TEAMS.home = node.textContent;
      if (node === el.abbrAway) TEAMS.away = node.textContent;
    }
  });
}

function initScoreBug() {
  paintTeams();
  wireEditable(el.scoreHome, { kind: "score" });
  wireEditable(el.scoreAway, { kind: "score" });
  wireEditable(el.abbrHome, { kind: "abbr" });
  wireEditable(el.abbrAway, { kind: "abbr" });
}

/* -------------------------------- INIT ------------------------------------ */

function init() {
  initScoreBug();
  selectVenue(activeVenue, /*preserveFeatured*/ false); // instant curated paint
  fetchLiveCameras(); // background enrichment, non-blocking
  setInterval(tick, REFRESH_MS); // single global ticker for the app's life
}

init();
