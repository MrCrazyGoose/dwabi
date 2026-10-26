# MocoBin

MocoBin is a web app that cuts recycling contamination in **Montgomery County, Maryland (Congressional District 8)**.
Young people scan an item with their phone camera or a photo, and MocoBin:

1. **identifies the item** and **checks it for contamination** (grease on cardboard and pizza boxes, food left in
   containers, banned items such as plastic bags) with an AI vision model,
2. **tells them where it goes** under Montgomery County DEP rules: blue bin, mixed-paper cart, trash, store drop-off,
   or the **Shady Grove Processing Facility and Transfer Station**.

**Bin night** is the weekly habit: the night before pickup, players photograph their open recycling bin and get a
list of everything that has to come out, with what to do with each thing. A clean bin earns points, and checking
every week builds a streak.

Players earn points on a seasonal individual leaderboard.

## Features

| Feature | Where |
| --- | --- |
| Item scanning and contamination check with Claude vision | `server/vision.js`, `src/pages/Scan.jsx` |
| Bin night: pickup day, holiday slides, calendar reminders, bin photo check, streaks | `shared/pickup.js`, `server/ics.js`, `src/pages/BinNight.jsx` |
| Offline fallback: MobileNet in the browser plus a pixel-based grease and residue check | `src/lib/vision.js`, `shared/vision/` |
| Plastic-bag alert: *“Montgomery County does not accept plastic bags in curbside recycling!…”* | `shared/rules.js` |
| Montgomery County rules engine (~45 items, 11 disposal streams, Shady Grove routing) | `shared/rules.js` |
| Searchable sorting guide | `src/pages/Guide.jsx` |
| Accounts with a display name only (no email, school or age) | `src/pages/Auth.jsx` |
| Points for scans, contamination catches, weekly quizzes and bin night, plus levels, badges and streaks | `shared/points.js`, `server/app.js` |
| Individual leaderboard with prizes and a competition window | `src/pages/Leaderboard.jsx`, `server/competition.js` |

## Tech stack

- **Frontend:** React 18, React Router, Tailwind CSS 3, Vite
- **Vision:** Claude (`claude-opus-5-5` via `@anthropic-ai/sdk`) with JSON-schema structured output, called from the server.
  Without an API key, the browser falls back to TensorFlow.js MobileNet and a pixel-based contamination check.
- **Backend:** Node.js and Express. Passwords are hashed with scrypt and logins use HMAC-signed tokens (no extra crypto dependencies).
- **Database:** PostgreSQL when `DATABASE_URL` is set. Otherwise a JSON file store is used, so there is zero setup for local development.

MocoBin is an independent youth project and is not run by Montgomery County Government.

## Design

Built for middle and high school students: one column, big buttons, and a bottom tab bar on phones
(Scan, Quiz, Bin night, Ranks, Me).

- **Brand:** `public/logo.png` (wide logo, header and home page) and `public/favicon.png` (tab and home-screen icon).
  Greens come from the logo; the darker `brand-700` green is used for text and buttons so it stays readable.
  Headings use Fredoka and body text uses Nunito. Colors live in `tailwind.config.js`, shared styles in `src/index.css`.
- **Bin colors** (blue bin, kraft paper, black trash, red Shady Grove) are kept only where they tell you which bin.
- **Progress** (`shared/progress.js`): six levels from Rookie Sorter to Bin Boss, a daily scan streak, and ten badges
  such as Bag Buster and Grease Detective, all computed from logged points.

The app name lives in `shared/brand.js`.

## Getting started

```bash
npm install
npm run dev        # API on :3001, web app on http://localhost:5173
```

Production:

```bash
npm run build
SESSION_SECRET=$(openssl rand -hex 32) DATABASE_URL=postgres://… npm start   # serves the API and the built site on :3001
```

The database schema is created automatically on startup. See `.env.example` for all settings, including the competition window.

The webcam needs a secure context, which means `https://` or `localhost`. The MobileNet weights (about 14 MB) download
once from TensorFlow Hub and are cached by the browser. If they cannot load, people can still pick the item by name,
and the contamination check still runs on their photo.

## Free hosting (Render + Neon)

`render.yaml` sets up one free Render web service that runs the API and serves the site. Render's free disk is
wiped on every restart, so data goes in a free [Neon](https://neon.tech) PostgreSQL database.

1. **Neon:** sign up with GitHub, create a project (pick a US East region), then copy the connection string
   (`postgresql://…?sslmode=require`).
2. **Render:** sign up with GitHub, then **New → Blueprint**, and pick this repository. When it asks for
   `DATABASE_URL`, paste the Neon string. Then click **Apply**.
3. When the deploy finishes, the site is live at `https://ecosort-XXXX.onrender.com`. Tables are created automatically.
4. **Photo checks:** create an API key at [console.anthropic.com](https://console.anthropic.com), then in Render open
   the service, go to **Environment** and set `ANTHROPIC_API_KEY`. Without it, scanning uses the on-device model
   and bin checks are off.

Free Render services sleep after about 15 minutes without visitors. The first visit after that takes roughly a minute to wake up.

## Tests

```bash
npm test                                             # rules engine, vision heuristics, full API (JSON store)
TEST_DATABASE_URL=postgres://… npm test              # also runs the API suite against PostgreSQL
```

## How photo checks work

With `ANTHROPIC_API_KEY` set, the browser shrinks each photo to 1024px and sends it to the server, which asks Claude
to fill in a fixed JSON schema (`server/vision.js`):

- **Item check:** which of the app's rule items it is (one of a fixed list of ids), how confident it is, and whether it
  is clean, lightly contaminated (split the pizza box) or heavily contaminated, with what it saw and where.
- **Bin check:** whether the bin is ready, and a list of problems (plastic bags, bagged recyclables, food, greasy paper,
  tanglers, batteries and so on), each with where it is and what to do.

The system prompt carries the county rules, and text inside photos is treated as part of the picture, never as
instructions. Photos are not stored by the app.

**Cost:** each check is one request, roughly 2 to 3 cents with the default model and `low` effort (an estimate, not
measured). Checks are capped per day: 40 per signed-in player and 8 per guest IP. `VISION_MODEL` and
`VISION_EFFORT` change the model and effort.

**Bin night points:** a check only counts from noon the day before pickup until 10 a.m. pickup day (Eastern), with
the county's holiday slide rule applied. A clean bin earns 20 points once per pickup, 10 more if an earlier check that
night found problems that were fixed, and 5 more per week of streak (up to 25).

### Offline fallback

Without an API key, MobileNet tells us **what** the item is. `shared/vision/contamination.js` then decides **how clean** it is:

- **Grease (cardboard and paper):** the photo is split into a 6×6 grid. Oil makes paper fibers translucent, so a grease stain is
  *darker and more saturated* than clean cardboard. A shadow is darker but not more saturated, so shadows are not counted.
  Bright red and orange sauce is flagged too. Flagged sections are drawn in red. A few red sections means “split it”:
  greasy parts go to the trash and the clean cardboard goes to the paper cart. A mostly red box goes to the trash.
- **Residue (bottles, tubs, cans, jars, cartons):** warm, saturated patches near the center of the frame are flagged as
  possible food or liquid residue. The app always shows the county's *empty, rinsed, clean* rule.

Both checks are heuristics. People can correct the item or its condition in one tap.

## Anti-farming and youth safety

- Daily caps: 60 scan points per rolling 24 hours. One quiz attempt per week. Requests are serialized
  per user so parallel requests cannot get around the caps.
- Quiz answers stay on the server and are scored there.
- No email, phone number or full name is collected. Players choose a display name, and the app suggests a first name
  and last initial.

## Disclaimer

Sorting guidance follows Montgomery County DEP's published recycling rules, but rules change. Always confirm edge cases
at [montgomerycountymd.gov/sws](https://www.montgomerycountymd.gov/sws/). Prize descriptions are placeholders for organizers to finalize.
