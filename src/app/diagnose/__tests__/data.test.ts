import { listSessions } from "@/app/diagnose/data";
import { describe, expect, it, vi } from "vitest";

function mockQuery(result: unknown) {
  const query = { select: vi.fn(), order: vi.fn(), limit: vi.fn() };
  query.select.mockReturnValue(query); query.order.mockReturnValue(query); query.limit.mockResolvedValue(result);
  return query;
}

describe("diagnosis list data", () => {
  it("selects dashboard state, maps it, and applies the limit", async () => {
    const row = { id: "s1", vehicle_id: null, vehicle_snapshot: { nickname: null, modelYear: 2014, make: "Honda", model: "Civic", trimName: null, engine: null, mileage: null }, dtc_codes: ["P0300"], symptoms: null, result_source: "ai", created_at: "2026-01-01T00:00:00Z", drivability: "ok_to_drive", top_cause: "Coil", refined_round: "2", assistant_status: "active" };
    const query = mockQuery({ data: [row], error: null });
    const result = await listSessions({ from: vi.fn().mockReturnValue(query) } as never, 5);
    expect(query.select.mock.calls[0][0]).toContain("vehicle_id");
    expect(query.select.mock.calls[0][0]).toContain("assistant_status");
    expect(query.limit).toHaveBeenCalledWith(5);
    expect(result?.[0]).toMatchObject({ vehicleId: null, assistantStatus: "active", refinedRound: 2 });
  });

  it("returns null on error", async () => {
    const query = mockQuery({ data: null, error: { message: "nope" } });
    await expect(listSessions({ from: vi.fn().mockReturnValue(query) } as never)).resolves.toBeNull();
  });
});
