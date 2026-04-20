/**
 * Scroll narrative — Sachin → Virat particle portrait.
 * `CHAPTER_TARGET_BEATS` maps chapter index → `public/particle-targets.json` v2 `beats`.
 */
export const STORY_CONFIG = {
  /** First chapter with portrait-style canvas driving (0 = particles + ambient from the opening). */
  firstImageChapter: 0,
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

/** Right-rail artwork (`public/story-beats/`) — keyed like `CHAPTER_TARGET_BEATS` beat ids. */
export const STORY_CHAPTER_VISUAL_SRC = {
  sachin_struggle: "/story-beats/sachin-young.png",
  sachin_drive: "/story-beats/sachin-cover-drive.png",
  sachin_pak_standoff: "/story-beats/sachin-pak-standoff.png",
  kohli_fire: "/story-beats/kohli-angry.png",
  kohli_carry: "/story-beats/kohli-shot-of-century.png",
};

/** Crisp center-stage lines; scroll progress maps to chapter index in `CricketParticleStory` via document scroll range. */
export const storyChapters = [
  {
    id: "opening",
    kicker: "A Billion Dreams",
    title: "",
    lines: [
      "A nation dreams in the dark between bat and ball.",
      "Light drifts, then gathers—shapes of courage taking form.",
      "Scroll. Let memory remember itself.",
    ],
    hint: "Scroll",
  },
  {
    id: "wait",
    kicker: "Before the roar",
    title: "Time",
    lines: [
      "The crowd always forgets.",
      "The crease never does.",
      "Greatness waits in the long quiet, where pressure turns into pulse.",
    ],
  },
  {
    id: "lion",
    kicker: "Where it began",
    title: "Boy and blade",
    lines: [
      "A small boy walks into a loud world, nose bleeding, eyes steady.",
      "He lifts the bat like a promise no one else can keep.",
      "From scattered light, a silhouette refuses to break.",
    ],
  },
  {
    id: "nation",
    kicker: "The signature",
    title: "Cover drive",
    lines: [
      "Not flash. Geometry.",
      "Still feet, straight heart—the one shot a billion people learned to trust.",
      "In the noise, he drew a line that stayed perfect.",
    ],
  },
  {
    id: "pak_stand",
    kicker: "Alone in the arc",
    title: "Eleven against one",
    lines: [
      "Green shirts at his shoulder. Noise stacked like walls.",
      "No chorus, no cover—just the blade, the crease, and the refusal to fold.",
      "He answered for everyone who could not breathe.",
    ],
  },
  {
    id: "heir",
    kicker: "The next fire",
    title: "Storm named",
    lines: [
      "A new storm arrives wearing different skin, same iron will.",
      "Short ball at the throat—met with silence, then thunder.",
      "The fire did not die. It simply changed hands.",
    ],
  },
  {
    id: "branch",
    kicker: "Carry",
    title: "Shot of the Century!",
    lines: [
      "Trophies turn to dust. Scorecards fade.",
      "What remains is the hand that reaches back and the swing that carries forward.",
      "Legacy is not passed. It is lived, breath by breath, in the same crease.",
    ],
  },
  {
    id: "both",
    kicker: "Finale",
    title: "",
    lines: [
      "TWO LIFETIMES",
      "ONE PORTRAIT",
      "WAIT · STRIKE · ROAR · CARRY",
      "NOT REPLACEMENT — ONLY LIGHT CONTINUING",
    ],
    hint: "",
    finale: true,
  },
];
