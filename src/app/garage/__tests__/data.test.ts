import { listVehicles } from "@/app/garage/data";
import { describe, expect, it, vi } from "vitest";

function mockQuery(result: unknown) {
  const query = { select: vi.fn(), order: vi.fn() };
  query.select.mockReturnValue(query);
  query.order.mockResolvedValue(result);
  return query;
}

describe("garage data", () => {
  it("orders newest first and maps snake case", async () => {
    const query = mockQuery({ data: [{ id: "v1", nickname: null, vin: null, model_year: 2014, make: "Honda", model: "Civic", trim_name: "EX", engine: "1.8L", mileage: 80000 }], error: null });
    const supabase = { from: vi.fn().mockReturnValue(query) } as never;
    await expect(listVehicles(supabase)).resolves.toEqual([{ id: "v1", nickname: null, vin: null, modelYear: 2014, make: "Honda", model: "Civic", trimName: "EX", engine: "1.8L", mileage: 80000 }]);
    expect(query.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("returns null on error", async () => {
    const query = mockQuery({ data: null, error: { message: "nope" } });
    await expect(listVehicles({ from: vi.fn().mockReturnValue(query) } as never)).resolves.toBeNull();
  });
});
