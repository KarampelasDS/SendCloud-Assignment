import { describe, test, expect, vi, afterEach } from "vitest";
import { createShipment } from "./shipments";
import type { NewScheduledShipment } from "../types";

const payload = {} as NewScheduledShipment; // mocked type data doesnt matter

afterEach(() => vi.unstubAllGlobals());

function mockFetch(response: { ok: boolean; json: () => Promise<unknown> }) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
}

describe("createShipment", () => {
  test("returns the response body", async () => {
    mockFetch({ ok: true, json: async () => ({ id: "abc", time_left: 30 }) });
    await expect(createShipment(payload)).resolves.toEqual({
      id: "abc",
      time_left: 30,
    });
  });

  test("throws error message on error 400", async () => {
    mockFetch({ ok: false, json: async () => ({ error: "Invalid input" }) });
    await expect(createShipment(payload)).rejects.toThrow("Invalid input");
  });

  test("throws a default message when the error body isn't JSON", async () => {
    mockFetch({
      ok: false,
      json: async () => {
        throw new Error("not json");
      },
    });
    await expect(createShipment(payload)).rejects.toThrow(
      "Something went wrong",
    );
  });
});
