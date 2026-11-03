import { describe, expect, it, vi } from "vitest";
import { applyRediagnosisTurn, countRecentAssistantTurns } from "../assistant-data";

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
