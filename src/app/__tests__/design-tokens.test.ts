import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
const tokens = Object.fromEntries([...css.matchAll(/--mm-([\w-]+):\s*(#[0-9a-f]{6});/gi)].map((match) => [match[1], match[2]]));

function luminance(hex: string): number {
  const channels = hex.slice(1).match(/../g)!.map((value) => {
    const channel = Number.parseInt(value, 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("MechMate design tokens", () => {
  it("keeps all text pairs at WCAG AA contrast", () => {
    for (const foreground of ["fg", "fg-secondary", "fg-muted", "accent", "accent-hover"]) {
      for (const background of ["canvas", "surface", "surface-raised"]) {
        expect(contrast(tokens[foreground], tokens[background]), `${foreground} on ${background}`).toBeGreaterThanOrEqual(4.5);
      }
    }
    for (const background of ["accent", "accent-hover"]) expect(contrast(tokens["on-accent"], tokens[background])).toBeGreaterThanOrEqual(4.5);
    for (const tone of ["ok", "caution", "warn", "danger"]) {
      expect(contrast(tokens[`${tone}-fg`], tokens[`${tone}-bg`]), tone).toBeGreaterThanOrEqual(4.5);
      expect(contrast(tokens["fg-muted"], tokens[`${tone}-bg`]), `muted on ${tone}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps control edges and focus outlines perceptible", () => {
    for (const background of ["canvas", "surface", "surface-raised"]) {
      expect(contrast(tokens["line-strong"], tokens[background]), `line-strong on ${background}`).toBeGreaterThanOrEqual(3);
      expect(contrast(tokens.accent, tokens[background]), `accent on ${background}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("maps every Tailwind color token to an existing custom property", () => {
    const theme = css.match(/@theme inline\s*{([\s\S]*?)\n}/)?.[1] ?? "";
    const mappings = [...theme.matchAll(/--color-[\w-]+:\s*var\(--mm-([\w-]+)\)/g)];
    expect(mappings.length).toBeGreaterThan(0);
    for (const mapping of mappings) expect(tokens, mapping[0]).toHaveProperty(mapping[1]);
  });
});
