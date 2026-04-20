# A Billion Dreams — story brief (for rewrite)

Single-page editorial overview: **what the site is**, **what visitors see**, **current on-screen text**, and **how chapters map to visuals**. Use this when rewriting copy or reordering the timeline.

---

## One-line pitch

**A Billion Dreams** is a scroll-driven piece that pairs **short poetic copy** with a **full-screen WebGL particle field**. The dots flow like mist, then **assemble into silhouettes** (Sachin poses → Virat poses → **both together**) to argue that Indian cricket here is **continuity**, not **replacement**.

**Site metadata** (`app/layout.js`): title *A Billion Dreams*; description *A scroll-driven story and WebGL particles that assemble into a portrait—continuity, memory, and light.*

---

## Core thesis (gist)

| Idea | Notes |
|------|--------|
| **Continuity over replacement** | Virat is not framed as “the next Sachin” in a zero-sum way—he **carries the thread** when noise fades. |
| **Same country, same hunger** | Emotional register: intimate patriotism, crease / crowd / pressure—not a stats sheet. |
| **One portrait at the end** | Finale lands as **one duo image** formed from the **same particle field** that earlier showed single heroes. Words step back; the image closes the argument. |

The experience **ends on the duo portrait**—there is intentionally **no section after** that beat.

---

## What the visitor sees (layers)

| Layer | Role |
|--------|------|
| **Full-viewport canvas** | Dark background; hundreds of thousands of **point sprites** (flow / scatter / morph). |
| **Center “stage”** | Serif story type: kicker, title, lines. Opacity and **word-by-word emphasis** follow scroll. |
| **Right rail** (desktop split, from chapter **2** onward) | Chapter **reference image** (PNG/SVG). Reveal is **opacity + clip + light motion** on scroll—not a gallery. |
| **Header** | Small title: *A Billion Dreams*. |
| **Watcher** (top-right) | Decorative scroll progress / eye motif. |
| **Loading overlay** | Until particle data + WebGL are ready. |

There are **no other routes**—everything is one vertical scroll with a tall spacer so the full arc is “scrubbable.”

---

## Timeline: chapter index → copy → particle beat → rail image

Source of truth for text: `app/lib/cricketParticleStory.js` → `storyChapters`.

`CHAPTER_TARGET_BEATS[i]` maps chapter **i** to a key in `public/particle-targets.json` (particle silhouette). `STORY_CHAPTER_VISUAL_SRC` maps beat id → **rail** file under `/public/story-beats/`.

| Index | Chapter `id` | Kicker · Title | Particle beat (`CHAPTER_TARGET_BEATS`) | Rail artwork (file) |
|------|----------------|----------------|----------------------------------------|----------------------|
| **0** | `opening` | **A Billion Dreams** · *(no title)* | `null` | — |
| **1** | `wait` | *Before the roar* · **Time** | `null` | — |
| **2** | `lion` | *Where it began* · **Boy and blade** | `sachin_struggle` | `sachin-young.png` |
| **3** | `nation` | *The signature* · **Cover drive** | `sachin_drive` | `sachin-cover-drive.png` |
| **4** | `pak_stand` | *Alone in the arc* · **Eleven against one** | `sachin_pak_standoff` | `sachin-pak-standoff.svg` |
| **5** | `heir` | *The next fire* · **Storm named** | `kohli_fire` | `kohli-angry.png` |
| **6** | `branch` | *Carry* · **One swing** | `kohli_carry` | `kohli-shot-of-century.svg` |
| **7** | `both` | *Finale* · *(see lines)* | `duo_finale` | *(no rail—finale uses full canvas only)* |

On wider layouts the **right rail** (chapter artwork) appears from roughly chapter **2** onward when the stage uses the split grid—see `CricketParticleStory.js`.

---

## Full current copy (verbatim)

### 0 — Opening
- **Kicker:** A Billion Dreams  
- **Lines:**
  - A nation dreams in the dark between bat and ball.
  - Light drifts, then gathers—shapes of courage taking form.
  - Scroll. Let memory remember itself.
- **Hint:** Scroll  

### 1 — Wait
- **Kicker:** Before the roar · **Title:** Time  
- **Lines:**
  - The crowd always forgets.
  - The crease never does.
  - Greatness waits in the long quiet, where pressure turns into pulse.

### 2 — Lion (young Sachin)
- **Kicker:** Where it began · **Title:** Boy and blade  
- **Lines:**
  - A small boy walks into a loud world, nose bleeding, eyes steady.
  - He lifts the bat like a promise no one else can keep.
  - From scattered light, a silhouette refuses to break.

### 3 — Nation (cover drive)
- **Kicker:** The signature · **Title:** Cover drive  
- **Lines:**
  - Not flash. Geometry.
  - Still feet, straight heart—the one shot a billion people learned to trust.
  - In the noise, he drew a line that stayed perfect.

### 4 — Pak standoff
- **Kicker:** Alone in the arc · **Title:** Eleven against one  
- **Lines:**
  - Green shirts at his shoulder. Noise stacked like walls.
  - No chorus, no cover—just the blade, the crease, and the refusal to fold.
  - He answered for everyone who could not breathe.

### 5 — Heir (Virat enters)
- **Kicker:** The next fire · **Title:** Storm named  
- **Lines:**
  - A new storm arrives wearing different skin, same iron will.
  - Short ball at the throat—met with silence, then thunder.
  - The fire did not die. It simply changed hands.

### 6 — Branch (continuity)
- **Kicker:** Carry · **Title:** One swing  
- **Lines:**
  - Trophies turn to dust. Scorecards fade.
  - What remains is the hand that reaches back and the swing that carries forward.
  - Legacy is not passed. It is lived, breath by breath, in the same crease.

### 7 — Finale (`finale: true`)
- **Kicker:** Finale · **Title:** *(empty)*  
- **Lines:**
  - TWO LIFETIMES
  - ONE PORTRAIT
  - WAIT · STRIKE · ROAR · CARRY
  - NOT REPLACEMENT — ONLY LIGHT CONTINUING  

Then scroll moves into **finale image phase**: copy fades out; particles fill the screen, then **morph to the duo silhouette** (`duo_finale`).

---

## Particle behaviour (high level)

- **Opening / early:** ambient scatter; intensity ramps with story config.  
- **Portrait chapters:** dots can morph toward the **beat silhouette** for that chapter (timing uses scroll bands—early segment may hold scatter before morph).  
- **Mid-story:** configured so **silhouettes are reserved** largely for the **finale duo** (`particlesFormImageOnlyInFinale`-style behaviour—see `particlePortrait.config.js`).  
- **Finale:** dedicated morph timing / easing so the **duo** lands as the climax.

Technical detail lives in `docs/STORY_EXPERIENCE_DESIGN.md` and code (`CricketParticleStory.js`, `ParticlePortrait.js`, `particlePortrait.config.js`).

---

## Assets to know about (rail + particles)

Rail files live in `public/story-beats/`; particle coordinates are baked in `public/particle-targets.json` (run `npm run generate:particles` after swapping art).

Current mapping is reflected in `STORY_CHAPTER_VISUAL_SRC` and `story-beats.manifest.json`—PNG beats use transparency (often black keyed out in tooling).

---

## References

- **Deeper design intent & implementation:** `docs/STORY_EXPERIENCE_DESIGN.md`  
- **Editable story list:** `app/lib/cricketParticleStory.js` (`storyChapters`, `CHAPTER_TARGET_BEATS`, `STORY_CHAPTER_VISUAL_SRC`)

---

*Generated as an editorial companion document; adjust dates or filenames if you version this alongside rewrites.*
