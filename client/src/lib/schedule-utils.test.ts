import { describe, it, expect } from "vitest";
import {
  getQuarterRange,
  getWeekStarts,
  formatWeekHeader,
  getHolidaysInWeek,
  isCurrentWeek,
} from "./schedule-utils";

describe("getQuarterRange", () => {
  it("returns correct range for Q1 2025 extended to week boundaries", () => {
    const { startDate, endDate } = getQuarterRange(2025, 1);
    // Q1 = Jan 1 – Mar 31, 2025
    // Jan 1 2025 is a Wednesday → extend back to Mon Dec 30 2024
    expect(startDate).toBe("2024-12-30");
    // Mar 31 2025 is a Monday → extend forward to Sun Apr 6 2025
    expect(endDate).toBe("2025-04-06");
  });

  it("returns correct range for Q2 2025", () => {
    const { startDate, endDate } = getQuarterRange(2025, 2);
    // Q2 = Apr 1 – Jun 30, 2025
    // Apr 1 2025 is a Tuesday → extend back to Mon Mar 31
    expect(startDate).toBe("2025-03-31");
    // Jun 30 2025 is a Monday → extend forward to Sun Jul 6
    expect(endDate).toBe("2025-07-06");
  });

  it("returns correct range for Q3 2025", () => {
    const { startDate, endDate } = getQuarterRange(2025, 3);
    // Q3 = Jul 1 – Sep 30, 2025
    // Jul 1 2025 is a Tuesday → extend back to Mon Jun 30
    expect(startDate).toBe("2025-06-30");
    // Sep 30 2025 is a Tuesday → extend forward to Sun Oct 5
    expect(endDate).toBe("2025-10-05");
  });

  it("returns correct range for Q4 2025", () => {
    const { startDate, endDate } = getQuarterRange(2025, 4);
    // Q4 = Oct 1 – Dec 31, 2025
    // Oct 1 2025 is a Wednesday → extend back to Mon Sep 29
    expect(startDate).toBe("2025-09-29");
    // Dec 31 2025 is a Wednesday → extend forward to Sun Jan 4 2026
    expect(endDate).toBe("2026-01-04");
  });

  it("handles quarter starting on a Monday", () => {
    // Q2 2026: Apr 1 2026 is a Wednesday... let's find a quarter starting on Monday
    // Q3 2024: Jul 1 2024 is a Monday
    const { startDate } = getQuarterRange(2024, 3);
    expect(startDate).toBe("2024-07-01");
  });

  it("handles quarter ending on a Sunday", () => {
    // Q1 2023: Mar 31 is a Friday → extend to Sun Apr 2
    // Q3 2024: Sep 30 2024 is a Monday → extend to Sun Oct 6
    const { endDate } = getQuarterRange(2024, 3);
    expect(endDate).toBe("2024-10-06");
  });
});

describe("getWeekStarts", () => {
  it("returns Monday dates between start and end", () => {
    const weeks = getWeekStarts("2025-01-06", "2025-01-26");
    expect(weeks).toEqual(["2025-01-06", "2025-01-13", "2025-01-20"]);
  });

  it("returns correct count of weeks for a full quarter", () => {
    const { startDate, endDate } = getQuarterRange(2025, 1);
    const weeks = getWeekStarts(startDate, endDate);
    // ~14 weeks in a quarter
    expect(weeks.length).toBeGreaterThanOrEqual(13);
    expect(weeks.length).toBeLessThanOrEqual(15);
  });

  it("all returned dates are Mondays", () => {
    const weeks = getWeekStarts("2025-01-01", "2025-03-31");
    for (const w of weeks) {
      const day = new Date(w + "T00:00:00").getDay();
      expect(day).toBe(1); // Monday
    }
  });

  it("returns empty array when range has no Monday", () => {
    // Tue to Thu — no Monday in between
    const weeks = getWeekStarts("2025-01-07", "2025-01-09");
    expect(weeks).toEqual([]);
  });

  it("includes Monday that equals start date", () => {
    // Jan 6 2025 is a Monday
    const weeks = getWeekStarts("2025-01-06", "2025-01-06");
    expect(weeks).toEqual(["2025-01-06"]);
  });
});

describe("formatWeekHeader", () => {
  it("formats as short month + day", () => {
    expect(formatWeekHeader("2025-01-06")).toBe("Jan 6");
  });

  it("handles double-digit days", () => {
    expect(formatWeekHeader("2025-01-13")).toBe("Jan 13");
  });

  it("handles different months", () => {
    expect(formatWeekHeader("2025-06-02")).toBe("Jun 2");
    expect(formatWeekHeader("2025-12-01")).toBe("Dec 1");
  });
});

describe("getHolidaysInWeek", () => {
  it("finds Thanksgiving in correct week of 2025", () => {
    // Thanksgiving 2025 = Nov 27 (4th Thursday of November)
    // Week starting Mon Nov 24
    const holidays = getHolidaysInWeek("2025-11-24");
    expect(holidays).toContain("Thanksgiving");
  });

  it("finds Christmas in correct week of 2025", () => {
    // Dec 25 2025 is a Thursday
    // Week starting Mon Dec 22
    const holidays = getHolidaysInWeek("2025-12-22");
    expect(holidays).toContain("Christmas Day");
  });

  it("finds Independence Day (observed) in 2025", () => {
    // Jul 4 2025 is a Friday
    // Week starting Mon Jun 30
    const holidays = getHolidaysInWeek("2025-06-30");
    expect(holidays).toContain("Independence Day");
  });

  it("returns empty array for a week with no holidays", () => {
    // Mid-February random week (no holiday)
    const holidays = getHolidaysInWeek("2025-02-10");
    expect(holidays).toEqual([]);
  });

  it("finds New Year's Day", () => {
    // Jan 1 2025 is a Wednesday
    // Week starting Mon Dec 30 2024
    const holidays = getHolidaysInWeek("2024-12-30");
    expect(holidays).toContain("New Year's Day");
  });

  it("finds MLK Day in 2025", () => {
    // MLK Day 2025 = 3rd Monday of January = Jan 20
    const holidays = getHolidaysInWeek("2025-01-20");
    expect(holidays).toContain("MLK Day");
  });

  it("finds Labor Day in 2025", () => {
    // Labor Day 2025 = 1st Monday of September = Sep 1
    const holidays = getHolidaysInWeek("2025-09-01");
    expect(holidays).toContain("Labor Day");
  });
});

describe("isCurrentWeek", () => {
  it("returns false for a week far in the past", () => {
    expect(isCurrentWeek("2020-01-06")).toBe(false);
  });

  it("returns false for a week far in the future", () => {
    expect(isCurrentWeek("2030-01-07")).toBe(false);
  });
});
