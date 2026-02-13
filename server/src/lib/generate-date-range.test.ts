import { describe, it, expect } from "vitest";
import { generateDateRange } from "./generate-date-range.js";

describe("generateDateRange", () => {
  it("returns a single date when start equals end", () => {
    expect(generateDateRange("2025-01-15", "2025-01-15")).toEqual(["2025-01-15"]);
  });

  it("returns all dates inclusive for a multi-day range", () => {
    const result = generateDateRange("2025-01-06", "2025-01-10");
    expect(result).toEqual([
      "2025-01-06",
      "2025-01-07",
      "2025-01-08",
      "2025-01-09",
      "2025-01-10",
    ]);
  });

  it("handles month boundary crossing", () => {
    const result = generateDateRange("2025-01-30", "2025-02-02");
    expect(result).toEqual([
      "2025-01-30",
      "2025-01-31",
      "2025-02-01",
      "2025-02-02",
    ]);
  });

  it("handles year boundary crossing", () => {
    const result = generateDateRange("2024-12-30", "2025-01-02");
    expect(result).toEqual([
      "2024-12-30",
      "2024-12-31",
      "2025-01-01",
      "2025-01-02",
    ]);
  });

  it("handles February in a leap year", () => {
    const result = generateDateRange("2024-02-28", "2024-03-01");
    expect(result).toEqual([
      "2024-02-28",
      "2024-02-29",
      "2024-03-01",
    ]);
  });

  it("handles February in a non-leap year", () => {
    const result = generateDateRange("2025-02-27", "2025-03-01");
    expect(result).toEqual([
      "2025-02-27",
      "2025-02-28",
      "2025-03-01",
    ]);
  });

  it("returns empty array when start is after end", () => {
    expect(generateDateRange("2025-01-10", "2025-01-05")).toEqual([]);
  });
});
