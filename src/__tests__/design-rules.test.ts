import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const PENDING_MIGRATION = new Set<string>();

const RAW_PALETTE = /\b(bg|text|border|ring|from|to|via|placeholder|outline|divide|fill|stroke)-(zinc|neutral|gray|slate|stone|emerald|green|red|amber|orange|white|black)\b(?:-\d+)?(?:\/\d+)?/;
const BANNED = [/\bshadow-(?!none)/, /\bfont-(thin|extralight|light)\b/, /\bbackdrop-blur\b/, /\btitle\s*=/];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe("frontend design rules", () => {
  it("has no pending migration allowlist", () => {
    expect([...PENDING_MIGRATION]).toEqual([]);
  });

  it("keeps migrated files on semantic tokens and popup-free styling", () => {
    const root = process.cwd();
    const violations: string[] = [];
    for (const file of [...sourceFiles(resolve(root, "src/app")), ...sourceFiles(resolve(root, "src/components"))]) {
      const name = relative(root, file).replaceAll("\\", "/");
      if (PENDING_MIGRATION.has(name)) continue;
      readFileSync(file, "utf8").split(/\r?\n/).forEach((line, index) => {
        const bannedOpacity = /\b(?:disabled:)?opacity-\d+/.test(line) && /\btext-/.test(line);
        if (RAW_PALETTE.test(line) || BANNED.some((pattern) => pattern.test(line)) || bannedOpacity) {
          violations.push(`${name}:${index + 1}: ${line.trim()}`);
        }
      });
    }
    expect(violations).toEqual([]);
  });
});
