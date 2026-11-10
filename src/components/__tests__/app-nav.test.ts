import { activeNav, NAV_ITEMS, parseSidebarMode } from "@/components/app-nav";
import { describe, expect, it } from "vitest";

describe("app navigation", () => {
  it.each([
    ["/dashboard", "dashboard"], ["/garage", "garage"], ["/garage/", "garage"], ["/garage/add", "garage"],
    ["/diagnose/new", "new"], ["/diagnose/new?vehicle=1", "new"], ["/diagnose/newer", "history"],
    ["/diagnose", "history"], ["/diagnose/abc", "history"], ["/diagnose/abc/assistant", "history"],
    ["/", null], ["/signin", null],
  ])("marks %s as %s", (path, expected) => expect(activeNav(path)).toBe(expected));

  it("parses only the rail cookie value as rail", () => {
    expect(parseSidebarMode("rail")).toBe("rail");
    expect(parseSidebarMode(undefined)).toBe("full");
    expect(parseSidebarMode("full")).toBe("full");
    expect(parseSidebarMode("garbage")).toBe("full");
  });

  it("keeps the approved item order", () => {
    expect(NAV_ITEMS.map((item) => item.key)).toEqual(["garage", "new", "history"]);
  });
});
