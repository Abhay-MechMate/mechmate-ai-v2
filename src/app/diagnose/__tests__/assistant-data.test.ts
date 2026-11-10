import { describe, expect, it, vi } from "vitest";
import { applyRediagnosisTurn, countRecentAssistantTurns, listOpenConversations } from "../assistant-data";
import { validResult, vehicle } from "@/lib/diagnosis/__tests__/fixtures";

describe("assistant persistence", () => {
  it("records an honest failed rediagnosis with no replacement result", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { turnId: "turn-1", revision: 2 }, error: null });
    const supabase = { rpc } as never;
    const result = await applyRediagnosisTurn(supabase, {
      sessionId: "session-1",
      expectedRevision: 1,
      round: 1,
      payload: {
        answers: [], note: "saved answer", extraCodes: [], changes: null,
        noteReply: null, assistantState: null, floor: null, diff: null,
      },
      result: null,
      model: null,
      fallbackReason: "invalid_output",
      usage: null,
      latencyMs: 20,
      finish: false,
    });
    expect(result).toEqual({ ok: true, value: { turnId: "turn-1", revision: 2 } });
    expect(rpc).toHaveBeenCalledWith("apply_rediagnosis_turn", expect.objectContaining({
      p_result: null,
      p_fallback_reason: "invalid_output",
    }));
  });

  it("counts only successful AI turns toward the daily cap", async () => {
    const filters: [string, unknown][] = [];
    const query = {
      select: vi.fn(), eq: vi.fn(), gte: vi.fn(), order: vi.fn(), limit: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockImplementation((key: string, value: unknown) => { filters.push([key, value]); return query; });
    query.gte.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.limit.mockResolvedValue({ data: [{ created_at: "2026-11-03T00:00:00Z" }], count: 7, error: null });
    const supabase = { from: vi.fn().mockReturnValue(query) } as never;
    const result = await countRecentAssistantTurns(supabase, "user-1");
    expect(result.count).toBe(7);
    expect(filters).toContainEqual(["source", "ai"]);
    expect(filters).not.toContainEqual(["source", "none"]);
  });
});

describe("open conversation data", () => {
  it("filters active sessions, orders, over-fetches, and loads turns once per row", async () => {
    const sessionQuery = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn() };
    sessionQuery.select.mockReturnValue(sessionQuery);
    sessionQuery.eq.mockReturnValue(sessionQuery);
    sessionQuery.order.mockReturnValue(sessionQuery);
    sessionQuery.limit.mockResolvedValue({ data: [
      { id: "s1", vehicle_id: "v1", vehicle_snapshot: vehicle, symptoms: null, dtc_codes: ["P0420"], initial_result: validResult(), assistant_status: "active", updated_at: "2026-01-01T00:00:00Z", top_cause: "Converter" },
      { id: "s2", vehicle_id: "v2", vehicle_snapshot: vehicle, symptoms: null, dtc_codes: [], initial_result: validResult(), assistant_status: "active", updated_at: "2026-01-02T00:00:00Z", top_cause: null },
    ], error: null });
    const turnQueries: Record<string, ReturnType<typeof turnQuery>> = {};
    function turnQuery() {
      const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn() };
      query.select.mockReturnValue(query);
      query.eq.mockImplementation((_key: string, value: string) => { turnQueries[value] = query; return query; });
      query.order.mockResolvedValue({ data: [], error: null });
      return query;
    }
    const from = vi.fn((table: string) => table === "diagnostic_sessions" ? sessionQuery : turnQuery());
    await expect(listOpenConversations({ from } as never, 3)).resolves.toEqual([]);
    expect(sessionQuery.eq).toHaveBeenCalledWith("assistant_status", "active");
    expect(sessionQuery.order).toHaveBeenCalledWith("updated_at", { ascending: false });
    expect(sessionQuery.limit).toHaveBeenCalledWith(6);
    expect(Object.keys(turnQueries).sort()).toEqual(["s1", "s2"]);
  });

  it("returns null when the session query fails", async () => {
    const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn() };
    query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.order.mockReturnValue(query);
    query.limit.mockResolvedValue({ data: null, error: { message: "nope" } });
    await expect(listOpenConversations({ from: vi.fn().mockReturnValue(query) } as never)).resolves.toBeNull();
  });
});
