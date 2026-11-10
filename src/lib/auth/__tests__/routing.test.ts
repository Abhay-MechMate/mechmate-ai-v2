import { routeDecision, safeNextPath } from "@/lib/auth/routing";
import { describe, expect, it } from "vitest";

describe("auth routing", () => {
  it.each(["/", "/signin", "/signup"])("sends signed-in %s to dashboard", (path) => expect(routeDecision(path, "", true)).toBe("/dashboard"));
  it.each(["/dashboard", "/garage/add", "/diagnose/abc/assistant"])("allows signed-in app path %s", (path) => expect(routeDecision(path, "", true)).toBeNull());
  it("preserves a signed-out app URL", () => expect(routeDecision("/diagnose/abc/assistant", "?x=1", false)).toBe("/signin?next=%2Fdiagnose%2Fabc%2Fassistant%3Fx%3D1"));
  it.each(["/", "/signin", "/auth/callback"])("allows signed-out public path %s", (path) => expect(routeDecision(path, "", false)).toBeNull());
  it("allows signed-in signout", () => expect(routeDecision("/auth/signout", "", true)).toBeNull());

  it.each(["/dashboard", "/garage/add", "/diagnose/abc/assistant#round-2"])("keeps safe path %s", (path) => expect(safeNextPath(path)).toBe(path));
  it.each(["https://x.com", "//x.com", "/\\x.com", "/signin", "/", "", null, 42])("rejects unsafe path %s", (path) => expect(safeNextPath(path)).toBe("/dashboard"));
});
