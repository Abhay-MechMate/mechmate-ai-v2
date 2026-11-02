import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { diagnoseWithAi, DEFAULT_BACKUP_MODEL } from "../openrouter";
import { validModelOutput, vehicle } from "./fixtures";

const input = { dtcCodes: ["P0420"], symptoms: null };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function successBody() {
  return {
    model: "test/model",
    choices: [{ finish_reason: "stop", message: { content: JSON.stringify(validModelOutput()) } }],
    usage: { prompt_tokens: 100, completion_tokens: 200, cost: 0.001 },
  };
}

async function advanceRetry<T>(promise: Promise<T>): Promise<T> {
  await vi.advanceTimersByTimeAsync(750);
  return promise;
}

describe("OpenRouter client", () => {
  beforeEach(() => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_MODEL;
    delete process.env.OPENROUTER_BACKUP_MODEL;
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns not_configured without fetching when the key is absent", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await diagnoseWithAi(input, vehicle)).toMatchObject({ ok: false, reason: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns and validates a successful response", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(successBody()));
    vi.stubGlobal("fetch", fetchMock);
    const result = await diagnoseWithAi(input, vehicle);
    expect(result).toMatchObject({ ok: true, model: "test/model" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries invalid JSON with the backup model", async () => {
    vi.useFakeTimers();
    process.env.OPENROUTER_API_KEY = "test-key";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ choices: [{ finish_reason: "stop", message: { content: "no json" } }] }))
      .mockResolvedValueOnce(jsonResponse(successBody()));
    vi.stubGlobal("fetch", fetchMock);
    const result = await advanceRetry(diagnoseWithAi(input, vehicle));
    expect(result.ok).toBe(true);
    const secondRequest = fetchMock.mock.calls[1][1] as RequestInit;
    const secondBody = JSON.parse(secondRequest.body as string) as { model: string };
    expect(secondBody.model).toBe(DEFAULT_BACKUP_MODEL);
  });

  it("maps 402 to credits_exhausted without retrying", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 402));
    vi.stubGlobal("fetch", fetchMock);
    expect(await diagnoseWithAi(input, vehicle)).toMatchObject({
      ok: false,
      reason: "credits_exhausted",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns http_error after two server failures", async () => {
    vi.useFakeTimers();
    process.env.OPENROUTER_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 500));
    vi.stubGlobal("fetch", fetchMock);
    expect(await advanceRetry(diagnoseWithAi(input, vehicle))).toMatchObject({
      ok: false,
      reason: "http_error",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("maps aborts to timeout", async () => {
    vi.useFakeTimers();
    process.env.OPENROUTER_API_KEY = "test-key";
    const timeout = Object.assign(new Error("timed out"), { name: "TimeoutError" });
    const fetchMock = vi.fn().mockRejectedValue(timeout);
    vi.stubGlobal("fetch", fetchMock);
    expect(await advanceRetry(diagnoseWithAi(input, vehicle))).toMatchObject({
      ok: false,
      reason: "timeout",
    });
  });
});
