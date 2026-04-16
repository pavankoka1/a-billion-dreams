# A Billion Dreams — Story experience design notes

This document describes **what the experience is trying to achieve** (intent, metaphor, narrative), then how it is **implemented** (scroll model, particles, copy). It ends with **strategic options** for the finale. Use it as a single reference for vision, pages, content, data, animation, and open questions.

---

## 1. What the website is trying to do (in depth)

### 1.1 One-sentence purpose

**A Billion Dreams** is a **scroll-driven, cinematic essay** that uses **text + a living particle portrait** to argue one idea: Indian cricket’s story is not “Sachin *or* Virat,” but **one continuous line**—two lifetimes that belong in the **same picture**.

The site is **not** a stats dashboard, a video highlight reel, or a traditional article. It is a **slow, intentional experience** where **reading speed and scroll** are the interface, and **dots resolving into faces** are the emotional proof of the thesis.

### 1.2 The core thesis (what we want the user to *feel*)

- **Continuity over replacement.** The copy explicitly rejects “replacement” framing. Virat is not “the next Sachin” in a zero-sum sense; he is **continuity**—someone who picks up the thread when the stadium goes quiet.
- **One country, one hunger.** The emotional register is **patriotic but intimate**: not jingoism, but shared memory—crowds, crease, pressure, refusal to fold.
- **Time made visible.** Cricket is remembered as **eras** (Sachin’s) and **moments** (Virat’s), but the site tries to show them as **one portrait** at the end—literally **one image formed from the same field of light** (particles).

If a visitor closes the tab remembering **only one thing**, the design hopes it is: **these two stories are drawn as a single living portrait**, not two unrelated heroes.

### 1.3 Who it is for

- **Cricket-literate Indians (and diaspora)** who already carry **emotional reference** for Sachin and Virat—so the poetry can stay **short** and **evocative** instead of explanatory.
- People who respond to **visual metaphor** and **pace**—the piece rewards **patience**; it is not optimized for skimming.
- Anyone open to **sports as myth and memory**, not only as numbers.

It is **not** trying to be a neutral encyclopedia; it is **opinionated** and **tonal**.

### 1.4 Why a single page and why scroll

- **Unbroken attention.** One URL, one vertical journey, **no navigation breaks**—the story reads as **one breath** from hook to final image.
- **Scroll = time.** How far you scroll is how far you’ve **committed** to the argument. Word-by-word lighting makes **reading** feel **synchronized** with **movement**—you are not clicking “next”; you are **pulling** the story forward.
- **Theatre in the browser.** Fixed text stage + full-viewport visuals mimic **cinema** or **museum installation**: the “camera” doesn’t cut; **content cross-fades** in place.

### 1.5 The particle metaphor (why dots at all)

Particles are not arbitrary decoration. They stand for things the thesis cares about:

- **Many small things becoming one shape** — like **memory**, **crowd noise**, or **moments** cohering into **identity**.
- **The same matter, rearranged** — each chapter **re-forms** the same dot field into a **new silhouette** (Sachin poses, Virat poses, then **both**). That **re-use** is the visual argument for **continuity**.
- **Constellation → face** — scattered light that **resolves** mirrors the idea that heroes only “look like” heroes when you **stand back** and let the pattern appear.

The **first chapters hide dots** so the visitor meets **words first**; when portraits begin, the metaphor has been **earned**.

### 1.6 The narrative arc (content shape)

| Movement | Meaning |
|----------|--------|
| **Opening** | Names the promise: two eras, **one living portrait**; teaches that **scroll** unlocks the story. |
| **Wait** | Establishes **mood**—quiet before drama; still **text-only** so the world feels **literary** before it becomes **visual**. |
| **Sachin chapters** | Boy and blade → signature shot → isolation under pressure: **myth** and **cost** of being **the one**. |
| **Virat chapters** | Different fire, same refusal; **handoff** in tone, not in hype. |
| **One swing** | Abstracts to **continuity**—what lasts when titles fade. |
| **Finale text** | Says the thesis out loud (taglines: **two lifetimes · one portrait**, **not replacement — continuity**). |
| **Finale image** | **No text**—only the **duo silhouette**, full canvas. The argument **lands in the image**, not in another paragraph. |

There is **nothing after** the duo portrait by design: the experience **ends on the picture**.

### 1.7 How text, motion, and technology cooperate

- **Text** carries **meaning** (argument, tone, specificity).
- **Scroll** carries **pacing** (when you’re allowed to see the next line, when the chapter hands off).
- **Particles** carry **feeling** (awe, recognition, resolution)—especially when a **familiar cloud** becomes a **recognizable face**.
- **WebGL** is chosen so the **same** dot field can **morph** smoothly; it is the closest thing to “one substance, many forms” in code.

Reduced-motion and readability paths exist so **meaning** never **depends** on a gimmick.

### 1.8 What “success” looks like (non-technical)

- The user **slows down** to read.
- They **notice** when the same dots become **different** people, then **both**.
- The **last beat** (duo) lands as **closure**—not as “another effect,” ideally as **the point the whole scroll was building to**.

### 1.9 Design tension (honest trade-off)

Using particles **throughout** builds **skill and rhythm**, but can make the **finale** feel like “the same trick again.” That is a **product risk**, not a failure of craft. Section **10** discusses ways to **reserve** a different kind of awe for the end (stills, sequence, silence, hybrid).

### 1.10 Executive summary (technical)

- **What it is**: A **single-page**, scroll-driven narrative. Text sits in a fixed “stage”; a **WebGL2 point-sprite canvas** fills the viewport behind it. The same particle system morphs between **scatter** and **SVG-derived silhouettes** (“beats”) as the user scrolls.
- **Story arc**: Opening → pre-portrait chapters → **Sachin** beats → **Kohli** beats → **Finale** copy → **duo portrait** (`duo_finale`). **No content after** the final portrait phase by design.
- **Main tension**: Particles are the **dominant visual language** for most of the journey; the finale may need **extra contrast** (see **§10**) so it still feels **terminal** and **special**.

---

## 2. Product surface (“pages”)

There is **one route** (`/`). There are no separate URLs per chapter.

| Surface | Role |
|--------|------|
| **Full-viewport canvas** | WebGL particles; fixed `z-index` behind UI. |
| **Fixed story stage** | Center (or split) copy; opacity and word lighting tied to scroll. |
| **Header** | “A Billion Dreams” site title (decorative). |
| **Loading overlay** | Shown until particle targets + WebGL are ready. |
| **Watcher progress** | Top-right eye motif; scroll progress ring (decorative / orientation). |
| **Scroll spacer** | Tall invisible `div` so the document has enough height to **scrub** the full story. |

**“Pages” in a narrative sense** = **scroll chapters** (8 blocks of copy), not Next.js pages.

---

## 3. Content model (data)

### 3.1 Chapters (`storyChapters`)

Defined in `app/lib/cricketParticleStory.js`. Each chapter has:

- `id`, optional `kicker`, `title`, `lines[]`, optional `hint`, optional `finale: true`.

There are **8 chapters** (indices `0` … `7`).

| Index | id | Role (short) |
|------|-----|----------------|
| 0 | `opening` | Hook + scroll hint |
| 1 | `wait` | Pre-portrait mood |
| 2 | `lion` | Young Sachin — **first portrait chapter** |
| 3 | `nation` | Cover drive |
| 4 | `pak_stand` | Isolation / pressure |
| 5 | `heir` | Virat enters |
| 6 | `branch` | “One swing” / continuity |
| 7 | `both` | Finale + taglines → **duo** |

### 3.2 Portrait beats (`CHAPTER_TARGET_BEATS`)

Maps **chapter index** → key in `public/particle-targets.json` (v2 `beats`):

| Index | Beat id |
|------|---------|
| 0–1 | `null` (no silhouette chapter) |
| 2 | `sachin_struggle` |
| 3 | `sachin_drive` |
| 4 | `sachin_pak_standoff` |
| 5 | `kohli_fire` |
| 6 | `kohli_carry` |
| 7 | `duo_finale` |

`STORY_CONFIG.firstImageChapter` is **2** (first chapter that uses portrait mode for particles).

### 3.3 Particle targets (assets)

- Generated / loaded from **`public/particle-targets.json`** (and related tooling: `npm run generate:particles`).
- Each **beat** is a set of normalized `(nx, ny)` samples + SVG metadata used by `layoutTarget()` to place dots on screen.

---

## 4. Scroll mathematics (how “where you are” is computed)

### 4.1 Virtual index `k`

- `docMax = scrollHeight - innerHeight` (maximum scroll).
- `k = (scrollY / docMax) * n` where **`n` = number of chapters (8)**.
- So **`k` ranges from 0 toward 8** as the user scrolls from top to bottom.

### 4.2 Visible chapter

Derived from `k` (with special handling so the **finale** doesn’t show too early — see implementation: `storyChapterIndex` can stay on chapter 6 until `k ≥ n−1`).

### 4.3 Per-chapter local progress `u`

For a chapter band roughly **`[j−0.5, j+0.5]`** in `k`-space, a local **`u ∈ [0,1]`** drives:

- **Copy opacity** (phased: fade-in → words → fade-out for most sections).
- **Word “head”** (how many words are lit / emphasized).
- **Portrait hold**: first **`PORTRAIT_SCATTER_PREFIX` (~27.5%)** of `u` in portrait chapters = scatter / prefill phase before full morph.

Constants (see `CricketParticleStory.js`):

- `SCROLL_FADE_IN`, `SCROLL_WORDS`, `SCROLL_FADE_OUT` — phased text.
- `PORTRAIT_SCATTER_PREFIX` — early band of each **portrait** chapter (not finale image phase).
- `OPENING_LANDING_K` — tiny initial band for opening at full opacity + entrance animation.
- `FINALE_U_TITLE_END`, `FINALE_U_BODY_END`, `FINALE_U_FADE_END` — finale sub-phases in `uF = k − (n−1)` once `k ≥ n−1`.

### 4.4 Spacer height

Roughly **`n * 200vh + STORY_SPACER_EXTRA_VH`** so there is enough physical scroll to feel each segment and to land the **final image** phase comfortably.

---

## 5. Text animation (copy)

### 5.1 Word lighting

- Words are split into `<span>`s; color shifts from dim → muted → primary based on a **`head`** value (float) vs word index.
- **`prefers-reduced-motion`**: words render at full emphasis for readability.

### 5.2 Opening

- Full opacity on a short **landing** band; avoids duplicating a fade-in that would **flicker** when scroll starts.
- CSS **entrance** on load (after assets ready): blur/translate settle — class toggled when safe to animate.

### 5.3 Finale copy (unified block)

- Single DOM structure: **kicker “Finale” + taglines**; **`head`** runs continuously through title + body word count so **“Finale” doesn’t duplicate** when phases advance.
- Sub-phases (title emphasis → body → fade) are driven by **scroll `uF`**, not by swapping unrelated layouts.

---

## 6. Particle / WebGL animation (`ParticlePortrait`)

### 6.1 Phases (internal state machine)

- **`scatter`** — dots idle or move per rules below.
- **`toImage`** — ease from current positions toward silhouette targets.
- **`image`** — locked on silhouette.
- **`toScatter`** — ease toward new scatter targets.

### 6.2 Layout modes (`particleLayout`)

| Layout | Meaning |
|--------|---------|
| `full` | Portrait centered; used for starfield opening and **finale duo image**. |
| `splitRight` | Text left (UI); particles biased to **right pane** (portrait chapters 2–6). |
| `splitGutters` | Left/right **gutter nuclei**; center kept clearer for **finale text** phases. |

### 6.3 Story-specific behavior

- **Chapters 0–1**: particle **visibility scaled to 0** (no dots) so the opening stays text-first.
- **Portrait hold band**: `scatterOnly` + **`scatterPrefillT`** (0→1): beat data is **loaded** so dots can **ease toward** the upcoming silhouette without finishing the morph until hold ends.
- **Scroll-linked motion** (splitRight / splitGutters): jitter applies when **scroll delta** is non-trivial; **no idle drift** when scroll stops.
- **Nucleus scatter**: positions are **irregular clouds**, not a uniform rectangle and not a visible ring — reads as a **clump** near the pane center(s).
- **Beat application**: morph is triggered when leaving hold / appropriate finale phase; guards avoid **stuck** states when scrubbing scroll (same beat + already `image` skips redundant morph).

### 6.4 Config (`particlePortrait.config.js`)

- `particleCount`, dot radii (scatter vs portrait), theme / background RGB.
- Large `particleCount` affects CPU/GPU cost per frame.

---

## 7. Section-by-section experience (narrative + systems)

| Section | Copy theme | Particles (high level) |
|--------|------------|-------------------------|
| **Opening** | Promise of the story + scroll hint | **Hidden** (alpha 0) |
| **Wait** | Quiet before cricket | Hidden |
| **Lion** onward | Sachin arc begins | **Visible**; split right; hold → prefill → morph to `sachin_struggle` |
| **Nation, Pak stand** | Signature / isolation | Same pattern per beat |
| **Heir, One swing** | Virat / continuity | Same pattern; `kohli_fire`, `kohli_carry` |
| **Finale text** | “Finale” + taglines | Gutters + text center; **no duo image** until image phase |
| **Finale image** | *(no text)* | **Full canvas** `duo_finale` morph; nothing after |

---

## 8. Mobile layout (CSS)

Below ~900px width:

- Canvas is constrained to the **lower 50%** of the viewport so **text occupies the upper half** conceptually.
- Split stage becomes a **column**: copy upper region, reserved lower region aligns with where particles appear.
- Finale block gets scroll-friendly max heights.

---

## 9. Loader & readiness

- Overlay until WebGL + targets are ready (`StoryLoadingOverlay`).
- `data-page-ready` on root drives opening animation gating.

---

## 10. Strategic note: “awe” at the finale

### 10.1 The problem

The **particle metaphor** is repeated for **every portrait chapter**. That builds **skill** and **continuity**, but can reduce the sense that the **finale is categorically different**—users may feel “I’ve seen this transition before.”

### 10.2 Directions (not mutually exclusive)

| Direction | What it changes | Trade-off |
|-----------|------------------|-----------|
| **Still hero image(s)** | Finale uses **photography/illustration** on the right or full-bleed | Needs assets; must match tone |
| **Short sequence (2–6 frames)** | **Era → handover → duo** without full video | More assets; keep it short |
| **Hybrid** | Particles resolve → **crossfade to one still** | Best of both; needs one strong key art |
| **Silence / emptiness** | Brief **no motion** before finale reveal | Cheap; needs timing polish |
| **Interaction ritual** | One **tap/hold** to “develop” final image | Changes passive scroll habit |
| **Audio sting** | One **non-repeating** sound at finale | Needs audio design + consent |
| **Density inversion** | **Fewer** particles early, **full** only at end | Engineering tuning |

### 10.3 Recommendation snapshot

- Treat the finale as a **different medium** or **different resolution** (still or very short sequence) if the goal is **maximum emotional punch**.
- If staying pure particles, add **contrast** (silence, full-bleed, slower motion, or one choreographed zoom on a still layer).

---

## 11. Open decisions (for you)

1. **Finale visual system**: Particles only vs **still/sequence** vs **hybrid**?
2. **Asset pipeline**: Who supplies **aspect ratios**, **color grading**, and **rights** for any photos?
3. **Tone**: Epic / quiet / documentary — drives sound and motion choices.
4. **Performance budget**: Target devices; whether to reduce `particleCount` on mobile.

---

## 12. File map (implementation)

| Area | Primary files |
|------|----------------|
| Story copy + beats | `app/lib/cricketParticleStory.js` |
| Scroll, text, finale | `app/components/CricketParticleStory.js` |
| WebGL particles | `app/components/ParticlePortrait.js`, `app/lib/particleWebglRenderer.js` |
| Targets load | `app/lib/particleTargetsLoader.js` |
| Layout math | `app/lib/particleSvgSample.js` |
| Visual polish | `app/globals.css` |
| Dots/count/colors | `app/config/particlePortrait.config.js` |

---

*Last updated to reflect the implementation and design discussion as of the conversation that produced this doc.*
