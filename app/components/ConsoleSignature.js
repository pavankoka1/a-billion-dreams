"use client";

import { useEffect } from "react";

const DEV_NAME = "Pavan Koka";
const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || "pavankoka1@gmail.com";
const CONTACT_LINKEDIN =
  process.env.NEXT_PUBLIC_CONTACT_LINKEDIN ||
  "https://linkedin.com/in/pavan-koka-419680148";
const CONTACT_GITHUB =
  process.env.NEXT_PUBLIC_CONTACT_GITHUB || "https://github.com/pavankoka1";
const CONTACT_WEBSITE =
  process.env.NEXT_PUBLIC_CONTACT_WEBSITE || "https://koka-lab.vercel.app";
const EXPERIENCE = [
  {
    company: "Pragmatic Play",
    role: "Senior Software Engineer (SDE III)",
    focus: "WebGL, GLSL, real-time live casino @ 60fps",
    period: "Jul 2025 - Present",
  },
  {
    company: "CRED (Prefr / CreditVidya)",
    role: "Senior Software Engineer",
    focus: "Vue 3, high-Lighthouse UX, animation systems",
    period: "Oct 2023 - Jul 2025",
  },
  {
    company: "Byju's (Toppr & Aakash)",
    role: "Senior Software Engineer",
    focus: "Next.js, sockets, SSR/CSR at scale",
    period: "Nov 2019 - Oct 2023",
  },
];
const PROJECTS = [
  { name: "Portfolio", url: "https://koka-lab.vercel.app/" },
  { name: "A Billion Dreams", url: "https://a-billion-dreams.vercel.app/" },
  { name: "Grid Tutorials", url: "https://grid-tutorials.vercel.app" },
];
const SYMBOL_MURAL_MINIMAL = [
  "            ✦        ·        ✦        ·        ✦",
  "      ·          ⟐   LIGHT BECOMES FORM   ⟐         ·",
  "                ╱╲        ⚪        ╱╲",
  "               ╱__╲      ╱│╲      ╱__╲",
  "              ╱____╲    ╱ │ ╲    ╱____╲",
  "               ╲  ╱       │       ╲  ╱",
  "                ╲╱      · │ ·      ╲╱",
  "        ✦          •  W A I T · S T R I K E  •          ✦",
];

const SYMBOL_MURAL_CINEMATIC = [
  "                        ✦            ·            ✦",
  "          ╭────────────────────────────────────────────────────╮",
  "          │                                                    │",
  "          │   K   K    OOO    K   K      A                  │",
  "          │   K  K    O   O   K  K      A A                 │",
  "          │   KKK     O   O   KKK      AAAAA                │",
  "          │   K  K    O   O   K  K     A   A                │",
  "          │   K   K    OOO    K   K    A   A                │",
  "          │                                                    │",
  "          │      ◌  made of symbols • rendered in console  ◌   │",
  "          ╰────────────────────────────────────────────────────╯",
  "                    ·            ✦            ·",
];

function hasContactDetails() {
  return (
    Boolean(CONTACT_EMAIL) ||
    Boolean(CONTACT_LINKEDIN) ||
    Boolean(CONTACT_GITHUB) ||
    Boolean(CONTACT_WEBSITE)
  );
}

export default function ConsoleSignature() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.__abdConsoleSignatureShown) return;
    window.__abdConsoleSignatureShown = true;

    const printContactBlock = () => {
      if (CONTACT_EMAIL) {
        console.log(
          `%cEmail: ${CONTACT_EMAIL}`,
          "color:#e4e4e7;font-size:12px;",
        );
      }
      if (CONTACT_LINKEDIN) {
        console.log(
          `%cLinkedIn: ${CONTACT_LINKEDIN}`,
          "color:#e4e4e7;font-size:12px;",
        );
      }
      if (CONTACT_GITHUB) {
        console.log(
          `%cGitHub: ${CONTACT_GITHUB}`,
          "color:#e4e4e7;font-size:12px;",
        );
      }
      if (CONTACT_WEBSITE) {
        console.log(
          `%cWebsite: ${CONTACT_WEBSITE}`,
          "color:#e4e4e7;font-size:12px;",
        );
      }
      if (!hasContactDetails()) {
        console.log(
          "%cSet NEXT_PUBLIC_CONTACT_EMAIL / NEXT_PUBLIC_CONTACT_LINKEDIN / NEXT_PUBLIC_CONTACT_GITHUB to show contact details here.",
          "color:#fbbf24;font-size:11px;",
        );
      }
    };

    const printFallbackSignature = () => {
      console.log(
        "%cA Billion Dreams ✨",
        "font-size:15px;font-weight:700;color:#c7d2fe;background:#0a0a0f;padding:4px 8px;border-radius:6px;",
      );
      console.log(
        `%cBuilt with intent by ${DEV_NAME}.`,
        "margin-top:4px;color:#e4e4e7;font-size:13px;font-weight:600;",
      );
      console.log(
        "%cIf you're hiring, collaborating, or geeking out on WebGL stories, say hello:",
        "color:#a1a1aa;font-size:12px;",
      );
      printContactBlock();
    };

    const registerConsoleLab = (chroma) => {
      const cyan = "#67e8f9";
      const violet = "#a78bfa";
      const white = "#e4e4e7";
      const muted = "#a1a1aa";
      const headerStyle = `font-weight:700;color:${white};background:#0a0a0f;padding:3px 8px;border-radius:6px;`;

      const wave = (steps = 18, delayMs = 70) => {
        const gradient =
          chroma?.scale(["#4facfe", "#667eea", "#a78bfa"]).mode("lab") || null;
        let i = 0;
        const id = window.setInterval(
          () => {
            const t = steps <= 1 ? 0 : i / (steps - 1);
            const color = gradient ? gradient(t).hex() : cyan;
            const width = 8 + Math.round((Math.sin(i * 0.55) + 1) * 11);
            const bar = "█".repeat(width);
            console.log(
              `%c${bar}  render pulse ${String(i + 1).padStart(2, "0")}`,
              `color:${color};font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace;font-size:11px;`,
            );
            i += 1;
            if (i >= steps) {
              window.clearInterval(id);
              console.log(
                "%cwave complete ✓",
                `color:${white};font-size:12px;font-weight:600;`,
              );
            }
          },
          Math.max(30, delayMs),
        );
      };

      const printMural = (lines, palette, animated = true) => {
        const gradient = chroma?.scale(palette).mode("lab") || null;
        if (!animated) {
          lines.forEach((line, idx) => {
            const t = lines.length <= 1 ? 0 : idx / (lines.length - 1);
            const color = gradient ? gradient(t).hex() : violet;
            console.log(
              `%c${line}`,
              `color:${color};font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace;font-size:11px;font-weight:600;line-height:1.08;`,
            );
          });
          return;
        }

        let i = 0;
        const id = window.setInterval(() => {
          const t = lines.length <= 1 ? 0 : i / (lines.length - 1);
          const color = gradient ? gradient(t).hex() : violet;
          console.log(
            `%c${lines[i]}`,
            `color:${color};font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace;font-size:11px;font-weight:600;line-height:1.08;`,
          );
          i += 1;
          if (i >= lines.length) {
            window.clearInterval(id);
            console.log(
              `%cCinematic render complete ✓`,
              `color:${white};font-size:12px;font-weight:700;`,
            );
          }
        }, 34);
      };

      const art = (mode = "cinematic") => {
        const gradient =
          chroma?.scale(["#67e8f9", "#818cf8", "#a78bfa"]).mode("lab") || null;
        const modeLabel =
          mode === "minimal"
            ? "Symbol Mural — Minimal"
            : "Symbol Mural — Cinematic";
        console.log(`%c${modeLabel}`, headerStyle);
        if (gradient) {
          console.log(
            "%cpalette: cyan → indigo → violet",
            `color:${gradient(0.52).hex()};font-size:11px;`,
          );
        }
        if (mode === "minimal") {
          printMural(SYMBOL_MURAL_MINIMAL, ["#67e8f9", "#818cf8"], false);
        } else {
          printMural(
            SYMBOL_MURAL_CINEMATIC,
            ["#67e8f9", "#818cf8", "#a78bfa"],
            true,
          );
        }
        console.log(
          "%cTip: run kokaLab.wave() or kokaLab.art('minimal')",
          `color:${cyan};font-size:12px;font-weight:600;`,
        );
      };

      const api = {
        help: () => {
          console.log("%ckokaLab commands", headerStyle);
          console.table([
            { command: "kokaLab.whoami()", description: "Quick intro + stack" },
            { command: "kokaLab.contact()", description: "Contact details" },
            { command: "kokaLab.experience()", description: "Career timeline" },
            {
              command: "kokaLab.projects()",
              description: "Live project links",
            },
            {
              command: "kokaLab.art('cinematic')",
              description: "Animated symbol render",
            },
            {
              command: "kokaLab.art('minimal')",
              description: "Static clean mural",
            },
            {
              command: "kokaLab.wave()",
              description: "Tiny console animation",
            },
            {
              command: "kokaLab.clear()",
              description: "Clear console + header",
            },
          ]);
        },
        whoami: () => {
          console.log(`%c${DEV_NAME}`, headerStyle);
          console.log(
            `%cFrontend at speed - WebGL when it counts.`,
            `color:${violet};font-size:12px;font-weight:600;`,
          );
          console.log(
            `%c6+ years in gaming, fintech, edtech: React/Next/Vue, sockets, performance discipline.`,
            `color:${muted};font-size:12px;`,
          );
        },
        contact: () => {
          console.log("%cContact", headerStyle);
          printContactBlock();
        },
        experience: () => {
          console.log("%cExperience", headerStyle);
          console.table(EXPERIENCE);
        },
        projects: () => {
          console.log("%cProjects", headerStyle);
          console.table(PROJECTS);
        },
        art,
        wave: () => wave(),
        clear: () => {
          console.clear();
          console.log(
            "%cA Billion Dreams console reset. Type kokaLab.help()",
            `color:${white};font-size:12px;font-weight:600;`,
          );
        },
      };

      window.kokaLab = api;
      console.log(
        `%cType kokaLab.help() for interactive commands`,
        `margin-top:8px;color:${cyan};font-size:12px;font-weight:600;`,
      );
      art("cinematic");
    };

    (async () => {
      try {
        const [figletMod, chromaMod] = await Promise.all([
          import("figlet"),
          import("chroma-js"),
        ]);
        const figlet =
          figletMod.default?.default ?? figletMod.default ?? figletMod;
        const textSync = figlet.textSync ?? figletMod.textSync;
        const chroma = chromaMod.default ?? chromaMod;
        if (typeof textSync !== "function") {
          throw new Error("figlet textSync unavailable");
        }

        const ascii = textSync("KOKA", {
          font: "Standard",
        });
        const lines = ascii.split("\n");
        const colors = chroma
          .scale(["#4facfe", "#667eea", "#a78bfa"])
          .mode("lab");

        console.log(
          "%cHey curious dev 👋",
          "font-size:16px;font-weight:700;color:#e4e4e7;background:#0a0a0f;padding:4px 8px;border-radius:6px;",
        );
        console.log(
          "%cK O K A  —  frontend at speed, WebGL when it counts.",
          "margin-top:6px;color:#67e8f9;font-size:12px;font-weight:700;letter-spacing:0.08em;",
        );

        lines.forEach((line, idx) => {
          const ratio = lines.length <= 1 ? 0 : idx / (lines.length - 1);
          const color = colors(ratio).hex();
          console.log(
            `%c${line}`,
            `color:${color};font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;font-size:10px;font-weight:700;line-height:1;`,
          );
        });

        console.log(
          `%cBuilt with intent by ${DEV_NAME}.`,
          "margin-top:6px;color:#c7d2fe;font-size:13px;font-weight:600;",
        );
        console.log(
          "%cIf you're hiring, collaborating, or just geeking out on WebGL stories, say hello:",
          "color:#a1a1aa;font-size:12px;",
        );
        printContactBlock();
        registerConsoleLab(chroma);
      } catch (err) {
        printFallbackSignature();
        registerConsoleLab(null);
        if (process.env.NODE_ENV !== "production") {
          console.debug("[ConsoleSignature] Fancy banner fallback:", err);
        }
      }
    })();
  }, []);

  return null;
}
