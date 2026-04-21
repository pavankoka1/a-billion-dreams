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

    (async () => {
      try {
        const [figletMod, chromaMod] = await Promise.all([
          import("figlet"),
          import("chroma-js"),
        ]);
        const figlet = figletMod.default ?? figletMod;
        const chroma = chromaMod.default ?? chromaMod;

        const ascii = figlet.textSync("A Billion Dreams", {
          font: "Standard",
        });
        const lines = ascii.split("\n");
        const colors = chroma.scale(["#4facfe", "#667eea", "#a78bfa"]).mode("lab");

        console.log(
          "%cHey curious dev 👋",
          "font-size:16px;font-weight:700;color:#e4e4e7;background:#0a0a0f;padding:4px 8px;border-radius:6px;",
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

        if (hasContactDetails()) {
          if (CONTACT_EMAIL) {
            console.log(`%cEmail: ${CONTACT_EMAIL}`, "color:#e4e4e7;font-size:12px;");
          }
          if (CONTACT_LINKEDIN) {
            console.log(
              `%cLinkedIn: ${CONTACT_LINKEDIN}`,
              "color:#e4e4e7;font-size:12px;",
            );
          }
          if (CONTACT_GITHUB) {
            console.log(`%cGitHub: ${CONTACT_GITHUB}`, "color:#e4e4e7;font-size:12px;");
          }
          if (CONTACT_WEBSITE) {
            console.log(
              `%cWebsite: ${CONTACT_WEBSITE}`,
              "color:#e4e4e7;font-size:12px;",
            );
          }
        } else {
          console.log(
            "%cSet NEXT_PUBLIC_CONTACT_EMAIL / NEXT_PUBLIC_CONTACT_LINKEDIN / NEXT_PUBLIC_CONTACT_GITHUB to show contact details here.",
            "color:#fbbf24;font-size:11px;",
          );
        }
      } catch {
        // Fallback: if dynamic imports fail, keep console clean without breaking runtime.
      }
    })();
  }, []);

  return null;
}
