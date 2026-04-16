"use client";

import { getAllStoryBeatIds } from "@/lib/cricketParticleStory";
import { samplePointsFromSvgRoot } from "@/lib/particleSvgSample";
import { idbGet, idbSet } from "@/lib/particleTargetsIdb";

const LS_PREFIX = "particle-portrait:v1:";

async function sha256Hex(text) {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function cacheKey(fingerprint, particleCount) {
  return `${fingerprint}__${particleCount}`;
}

function unpackRecord(rec) {
  const { coords, svgW, svgH } = rec;
  if (!coords?.length) return null;
  const nxny = [];
  for (let i = 0; i < coords.length; i += 2) {
    nxny.push({ nx: coords[i], ny: coords[i + 1] });
  }
  return { nxny, svgW, svgH };
}

function cloneNxny(nxny) {
  return nxny.map((p) => ({ nx: p.nx, ny: p.ny }));
}

/**
 * Multi-beat story targets (v2 JSON) or v1 duplicated per story beat id.
 * @returns {Promise<{ beats: Record<string, { nx: number; ny: number }[]>; meta: Record<string, { svgW: number; svgH: number }>; defaultBeat: string }>}
 */
export async function loadParticleStoryTargets(particleCount) {
  try {
    const res = await fetch("/particle-targets.json", { cache: "default" });
    if (res.ok) {
      const j = await res.json();
      if (
        j.v === 2 &&
        j.beats &&
        typeof j.beats === "object" &&
        j.particleCount === particleCount
      ) {
        const beats = {};
        const meta = {};
        const fallbackW = j.svgW ?? 1168;
        const fallbackH = j.svgH ?? 880;
        for (const [key, b] of Object.entries(j.beats)) {
          const coords = b.coords;
          if (!Array.isArray(coords) || coords.length !== particleCount * 2) {
            continue;
          }
          const unpacked = unpackRecord({
            coords,
            svgW: b.svgW ?? fallbackW,
            svgH: b.svgH ?? fallbackH,
          });
          if (unpacked) {
            beats[key] = unpacked.nxny;
            meta[key] = { svgW: unpacked.svgW, svgH: unpacked.svgH };
          }
        }
        const keys = Object.keys(beats);
        if (keys.length > 0) {
          return {
            beats,
            meta,
            defaultBeat: j.defaultBeat && beats[j.defaultBeat] ? j.defaultBeat : keys[0],
          };
        }
      }
    }
  } catch {
    /* fall through */
  }

  const single = await loadParticleTargets(particleCount);
  if (!single.nxny.length) {
    throw new Error("No particle targets");
  }
  const ids = getAllStoryBeatIds();
  const beats = {};
  const meta = {};
  for (const id of ids) {
    beats[id] = cloneNxny(single.nxny);
    meta[id] = { svgW: single.svgW, svgH: single.svgH };
  }
  return {
    beats,
    meta,
    defaultBeat: "duo_finale",
  };
}

function tryLocalStorage(key) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return null;
    const rec = JSON.parse(raw);
    return unpackRecord(rec);
  } catch {
    return null;
  }
}

function setLocalStorage(key, rec) {
  try {
    const s = JSON.stringify(rec);
    if (s.length > 4_500_000) {
      return;
    }
    localStorage.setItem(LS_PREFIX + key, s);
  } catch {
    /* quota or disabled */
  }
}

/**
 * Resolve particle targets: prebuilt JSON → IndexedDB → localStorage → live SVG sample (slow).
 * @param {number} particleCount — must match config
 * @returns {Promise<{ nxny: { nx: number; ny: number }[]; svgW: number; svgH: number }>}
 */
export async function loadParticleTargets(particleCount) {
  const svgText = await fetch("/target.svg").then((r) => {
    if (!r.ok) throw new Error("target.svg missing");
    return r.text();
  });
  const fingerprint = await sha256Hex(svgText);
  const key = cacheKey(fingerprint, particleCount);

  try {
    const res = await fetch("/particle-targets.json", { cache: "default" });
    if (res.ok) {
      const j = await res.json();
      if (j.v === 2 && j.beats && typeof j.beats === "object") {
        const def = j.defaultBeat || Object.keys(j.beats)[0];
        const bundle = j.beats[def];
        if (
          j.particleCount === particleCount &&
          bundle?.coords?.length === particleCount * 2
        ) {
          const unpacked = unpackRecord({
            coords: bundle.coords,
            svgW: bundle.svgW ?? j.svgW ?? 1168,
            svgH: bundle.svgH ?? j.svgH ?? 880,
          });
          if (unpacked) {
            return unpacked;
          }
        }
      }
      if (
        j.v === 1 &&
        j.svgFingerprint === fingerprint &&
        j.particleCount === particleCount &&
        Array.isArray(j.coords) &&
        j.coords.length === particleCount * 2
      ) {
        const unpacked = unpackRecord(j);
        if (unpacked) {
          try {
            await idbSet(key, {
              coords: j.coords,
              svgW: j.svgW,
              svgH: j.svgH,
            });
          } catch {
            /* idb unavailable */
          }
          setLocalStorage(key, {
            coords: j.coords,
            svgW: j.svgW,
            svgH: j.svgH,
          });
          return unpacked;
        }
      }
    }
  } catch {
    /* no static file */
  }

  try {
    const hit = await idbGet(key);
    if (hit?.coords?.length === particleCount * 2) {
      const u = unpackRecord(hit);
      if (u) return u;
    }
  } catch {
    /* private mode, etc. */
  }

  const lsHit = tryLocalStorage(key);
  if (lsHit?.nxny?.length === particleCount) {
    return lsHit;
  }

  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const svg = doc.documentElement;
  if (!svg || svg.nodeName.toLowerCase() !== "svg") {
    throw new Error("Invalid SVG");
  }

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText =
    "position:fixed;left:-12000px;top:0;width:1168px;height:880px;overflow:visible;visibility:hidden;pointer-events:none;z-index:-1";
  document.body.appendChild(host);
  const clone = svg.cloneNode(true);
  host.appendChild(clone);

  let result;
  try {
    const svgNode = host.querySelector("svg");
    if (!svgNode) throw new Error("No svg in host");
    result = samplePointsFromSvgRoot(svgNode, particleCount);
  } finally {
    host.remove();
  }

  if (!result.nxny.length) {
    throw new Error("No sample points");
  }

  const coords = new Array(particleCount * 2);
  for (let i = 0; i < particleCount; i++) {
    coords[i * 2] = result.nxny[i].nx;
    coords[i * 2 + 1] = result.nxny[i].ny;
  }

  const record = {
    coords,
    svgW: result.svgW,
    svgH: result.svgH,
  };

  try {
    await idbSet(key, record);
  } catch {
    /* ignore */
  }
  setLocalStorage(key, record);

  return result;
}
