import { describe, it, expect } from "vitest";
import { mergeWeekRanges, type ScheduleWeeks } from "./merge-week-ranges.js";

function makeMap(entries: [number, ScheduleWeeks][]): Map<number, ScheduleWeeks> {
  return new Map(entries);
}

describe("mergeWeekRanges", () => {
  it("merges consecutive weeks into a single range", () => {
    const bySchedule = makeMap([
      [1, { scheduleName: "Q1", weeks: ["2025-01-06", "2025-01-13", "2025-01-20"] }],
    ]);
    const result = mergeWeekRanges(bySchedule);
    expect(result).toEqual([
      { start: "2025-01-06", end: "2025-01-20", scheduleName: "Q1", scheduleId: 1 },
    ]);
  });

  it("splits non-consecutive weeks into separate ranges", () => {
    const bySchedule = makeMap([
      [1, { scheduleName: "Q1", weeks: ["2025-01-06", "2025-01-13", "2025-02-03", "2025-02-10"] }],
    ]);
    const result = mergeWeekRanges(bySchedule);
    expect(result).toEqual([
      { start: "2025-01-06", end: "2025-01-13", scheduleName: "Q1", scheduleId: 1 },
      { start: "2025-02-03", end: "2025-02-10", scheduleName: "Q1", scheduleId: 1 },
    ]);
  });

  it("handles a single week as a range with same start/end", () => {
    const bySchedule = makeMap([
      [1, { scheduleName: "Q1", weeks: ["2025-01-06"] }],
    ]);
    const result = mergeWeekRanges(bySchedule);
    expect(result).toEqual([
      { start: "2025-01-06", end: "2025-01-06", scheduleName: "Q1", scheduleId: 1 },
    ]);
  });

  it("produces separate ranges for multiple schedules", () => {
    const bySchedule = makeMap([
      [1, { scheduleName: "Q1", weeks: ["2025-01-06", "2025-01-13"] }],
      [2, { scheduleName: "Q2", weeks: ["2025-04-07", "2025-04-14"] }],
    ]);
    const result = mergeWeekRanges(bySchedule);
    expect(result).toEqual([
      { start: "2025-01-06", end: "2025-01-13", scheduleName: "Q1", scheduleId: 1 },
      { start: "2025-04-07", end: "2025-04-14", scheduleName: "Q2", scheduleId: 2 },
    ]);
  });

  it("sorts unsorted weeks before merging", () => {
    const bySchedule = makeMap([
      [1, { scheduleName: "Q1", weeks: ["2025-01-20", "2025-01-06", "2025-01-13"] }],
    ]);
    const result = mergeWeekRanges(bySchedule);
    expect(result).toEqual([
      { start: "2025-01-06", end: "2025-01-20", scheduleName: "Q1", scheduleId: 1 },
    ]);
  });

  it("handles empty map", () => {
    const bySchedule = makeMap([]);
    const result = mergeWeekRanges(bySchedule);
    expect(result).toEqual([]);
  });

  it("handles each week non-consecutive (all separate ranges)", () => {
    const bySchedule = makeMap([
      [1, { scheduleName: "Q1", weeks: ["2025-01-06", "2025-01-27", "2025-02-17"] }],
    ]);
    const result = mergeWeekRanges(bySchedule);
    expect(result).toEqual([
      { start: "2025-01-06", end: "2025-01-06", scheduleName: "Q1", scheduleId: 1 },
      { start: "2025-01-27", end: "2025-01-27", scheduleName: "Q1", scheduleId: 1 },
      { start: "2025-02-17", end: "2025-02-17", scheduleName: "Q1", scheduleId: 1 },
    ]);
  });
});
