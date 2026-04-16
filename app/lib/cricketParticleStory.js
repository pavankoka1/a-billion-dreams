/**
 * Scroll narrative — Sachin → Virat particle portrait.
 * `CHAPTER_TARGET_BEATS` maps chapter index → `public/particle-targets.json` v2 `beats`.
 */
export const STORY_CONFIG = {
  firstImageChapter: 2,
};

export const CHAPTER_TARGET_BEATS = [
  null,
  null,
  "sachin_struggle",
  "sachin_drive",
  "sachin_pak_standoff",
  "kohli_fire",
  "kohli_carry",
  "duo_finale",
];

export function getAllStoryBeatIds() {
  return [...new Set(CHAPTER_TARGET_BEATS.filter(Boolean))];
}

/** Crisp center-stage lines; scroll progress maps to chapter index in `CricketParticleStory` via document scroll range. */
export const storyChapters = [
  {
    id: "opening",
    kicker: "A Billion Dreams",
    title: "",
    lines: [
      "Sachin’s era, then Virat’s — same country, same hunger, told as one living portrait.",
      "Scroll: the words follow you, line by line.",
    ],
    hint: "Scroll",
  },
  {
    id: "wait",
    kicker: "Before the roar",
    title: "Time",
    lines: [
      "Crowds forget; the crease remembers.",
      "Great innings are built in the long quiet before the first boundary.",
    ],
  },
  {
    id: "lion",
    kicker: "Where it began",
    title: "Boy and blade",
    lines: [
      "A small kid against a loud world — nose bloodied, nerve intact.",
      "He stepped in anyway. The dots became a silhouette that never broke.",
    ],
  },
  {
    id: "nation",
    kicker: "The signature",
    title: "Cover drive",
    lines: [
      "Not flair for flair — geometry when everything else is noise.",
      "Still feet, straight intent: the shot India learned to trust.",
    ],
  },
  {
    id: "pak_stand",
    kicker: "Alone in the arc",
    title: "Eleven against one",
    lines: [
      "Green shirts at his shoulder, noise stacked like a wall — pressure dressed as crowd.",
      "Evils and odds leaned in from every angle; he was still the one who had to answer.",
      "No chorus behind him in that glare — just a blade, a crease, and the refusal to fold.",
    ],
  },
  {
    id: "heir",
    kicker: "The next fire",
    title: "Storm named",
    lines: [
      "Different temper, same refusal to fold.",
      "Short ball at the throat — answered with silence and runs, not theatre.",
    ],
  },
  {
    id: "branch",
    kicker: "Carry",
    title: "One swing",
    lines: [
      "Titles come and go; the scorecard fades.",
      "What lasts is who picks up the thread when the stadium goes quiet.",
    ],
  },
  {
    id: "both",
    kicker: "Finale",
    title: "",
    lines: [
      "TWO LIFETIMES · ONE PORTRAIT",
      "WAIT · LINE · ROAR · CARRY",
      "NOT REPLACEMENT — CONTINUITY",
    ],
    hint: "",
    finale: true,
  },
];
