# EcoSort ♻️ — Montgomery County, MD

EcoSort is a web app that cuts recycling contamination in **Montgomery County, Maryland (Congressional District 8)**.
Students scan an item with their webcam or a photo, and EcoSort:

1. **identifies the item** with TensorFlow.js (MobileNet) running entirely in the browser,
2. **checks it for contamination**: grease stains on cardboard and pizza boxes, food residue on containers, and
   items the county bans from the blue bin, such as plastic bags,
3. **tells them where it goes** under Montgomery County DEP rules: blue bin, mixed-paper cart, trash, store drop-off,
   or the **Shady Grove Processing Facility and Transfer Station**.

Students also earn points for their school or neighborhood cluster on a seasonal leaderboard.

## Features

| Feature | Where |
| --- | --- |
| Webcam / photo scanning with on-device AI (images never leave the device) | `src/pages/Scan.jsx`, `src/lib/vision.js` |
| Grease detection with a per-section overlay (“tear off the red squares”) | `shared/vision/contamination.js` |
| Residue check plus the “empty, rinsed, clean” blue-bin reminder | `shared/vision/contamination.js`, `shared/rules.js` |
| Plastic-bag alert: *“Montgomery County does not accept plastic bags in curbside recycling!…”* | `shared/rules.js` |
| Montgomery County rules engine (~45 items, 11 disposal streams, Shady Grove routing) | `shared/rules.js` |
| Searchable sorting guide | `src/pages/Guide.jsx` |
| Accounts tied to an MCPS school or neighborhood cluster | `shared/schools.js`, `src/pages/Auth.jsx` |
| Points for scans, contamination catches, weekly quizzes and household batch logs | `shared/points.js`, `server/app.js` |
| Student, school (points per active student) and cluster leaderboards, with prizes and a competition window | `src/pages/Leaderboard.jsx`, `server/competition.js` |

## Tech stack

- **Frontend:** React 18, React Router, Tailwind CSS 3, Vite
- **Vision:** TensorFlow.js and `@tensorflow-models/mobilenet` (lazy-loaded), plus a custom HSV pixel analyzer for contamination
- **Backend:** Node.js and Express. Passwords are hashed with scrypt and logins use HMAC-signed tokens (no extra crypto dependencies).
- **Database:** PostgreSQL when `DATABASE_URL` is set. Otherwise a JSON file store is used, so there is zero setup for local development.

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
once from TensorFlow Hub and are cached by the browser. If they cannot load, students can still pick the item by name,
and the contamination check still runs on their photo.

## Free hosting (Render + Neon)

`render.yaml` sets up one free Render web service that runs the API and serves the site. Render's free disk is
wiped on every restart, so data goes in a free [Neon](https://neon.tech) PostgreSQL database.

1. **Neon:** sign up with GitHub, create a project (pick a US East region), then copy the connection string
   (`postgresql://…?sslmode=require`).
2. **Render:** sign up with GitHub, then **New → Blueprint**, and pick this repository. When it asks for
   `DATABASE_URL`, paste the Neon string. Then click **Apply**.
3. When the deploy finishes, the site is live at `https://ecosort-XXXX.onrender.com`. Tables are created automatically.

Free Render services sleep after about 15 minutes without visitors. The first visit after that takes roughly a minute to wake up.

## Tests

```bash
npm test                                             # rules engine, vision heuristics, full API (JSON store)
TEST_DATABASE_URL=postgres://… npm test              # also runs the API suite against PostgreSQL
```

## How contamination detection works

MobileNet tells us **what** the item is. `shared/vision/contamination.js` then decides **how clean** it is:

- **Grease (cardboard and paper):** the photo is split into a 6×6 grid. Oil makes paper fibers translucent, so a grease stain is
  *darker and more saturated* than clean cardboard. A shadow is darker but not more saturated, so shadows are not counted.
  Bright red and orange sauce is flagged too. Flagged sections are drawn in red. A few red sections means “split it”:
  greasy parts go to the trash and the clean cardboard goes to the paper cart. A mostly red box goes to the trash.
- **Residue (bottles, tubs, cans, jars, cartons):** warm, saturated patches near the center of the frame are flagged as
  possible food or liquid residue. The app always shows the county's *empty, rinsed, clean* rule.

Both checks are heuristics. Students can correct the item or its condition in one tap.

## Anti-farming and youth safety

- Daily caps: 60 scan points and 2 batch logs per rolling 24 hours. One quiz attempt per week. Requests are serialized
  per user so parallel requests cannot get around the caps.
- Quiz answers stay on the server and are scored there.
- No email, phone number or full name is collected. Students choose a display name, and the app suggests a first name
  and last initial.

## Disclaimer

Sorting guidance follows Montgomery County DEP's published recycling rules, but rules change. Always confirm edge cases
at [montgomerycountymd.gov/sws](https://www.montgomerycountymd.gov/sws/). Prize descriptions are placeholders for organizers to finalize.
