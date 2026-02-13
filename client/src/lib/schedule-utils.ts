/**
 * Get the date range for a given year/quarter, extended to
 * Monday/Sunday week boundaries.
 */
export function getQuarterRange(year: number, quarter: number): { startDate: string; endDate: string } {
  const quarterStartMonth = (quarter - 1) * 3;

  // First day of the quarter
  const qStart = new Date(year, quarterStartMonth, 1);
  // First day of next quarter
  const qEnd = new Date(year, quarterStartMonth + 3, 1);
  // Last day of the quarter
  qEnd.setDate(qEnd.getDate() - 1);

  // Extend qStart back to Monday
  const startDay = qStart.getDay(); // 0=Sun
  const mondayOffset = startDay === 0 ? -6 : 1 - startDay;
  qStart.setDate(qStart.getDate() + mondayOffset);

  // Extend qEnd forward to Sunday
  const endDay = qEnd.getDay();
  if (endDay !== 0) {
    qEnd.setDate(qEnd.getDate() + (7 - endDay));
  }

  return {
    startDate: formatDate(qStart),
    endDate: formatDate(qEnd),
  };
}

/**
 * Return an array of Monday ISO date strings between startDate and endDate.
 */
export function getWeekStarts(startDate: string, endDate: string): string[] {
  const weeks: string[] = [];
  const current = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  // Ensure we start on a Monday
  const day = current.getDay();
  if (day !== 1) {
    const offset = day === 0 ? 1 : 8 - day;
    current.setDate(current.getDate() + offset);
  }

  while (current <= end) {
    weeks.push(formatDate(current));
    current.setDate(current.getDate() + 7);
  }
  return weeks;
}

/**
 * Check if today's date falls within the Mon–Sun week starting at weekStart.
 */
export function isCurrentWeek(weekStart: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(weekStart + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return today >= start && today <= end;
}

/**
 * Format a week start date for column headers, e.g. "Jan 5"
 */
export function formatWeekHeader(weekStart: string): string {
  const date = new Date(weekStart + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Return holiday names (observed) that fall within the Mon–Sun week starting at weekStart.
 */
export function getHolidaysInWeek(weekStart: string): string[] {
  const start = new Date(weekStart + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6); // Sunday

  // We need holidays for potentially two years if week spans Dec/Jan
  const years = new Set([start.getFullYear(), end.getFullYear()]);
  const holidays: { date: Date; name: string }[] = [];
  for (const y of years) {
    holidays.push(...getUSHolidays(y));
  }

  const result: string[] = [];
  for (const h of holidays) {
    if (h.date >= start && h.date <= end) {
      result.push(h.name);
    }
  }
  return result;
}

/** Nth weekday of a month (e.g. 3rd Monday of January) */
function nthWeekday(year: number, month: number, weekday: number, n: number): Date {
  const first = new Date(year, month, 1);
  const firstDay = first.getDay();
  let day = 1 + ((weekday - firstDay + 7) % 7) + (n - 1) * 7;
  return new Date(year, month, day);
}

/** Last weekday of a month (e.g. last Monday of May) */
function lastWeekday(year: number, month: number, weekday: number): Date {
  const last = new Date(year, month + 1, 0); // last day of month
  const lastDay = last.getDay();
  const diff = (lastDay - weekday + 7) % 7;
  return new Date(year, month, last.getDate() - diff);
}

/** Apply observed-date rule: Sat→Fri, Sun→Mon */
function observed(d: Date): Date {
  const day = d.getDay();
  if (day === 6) return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  if (day === 0) return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return d;
}

function getUSHolidays(year: number): { date: Date; name: string }[] {
  return [
    { date: observed(new Date(year, 0, 1)), name: "New Year's Day" },
    { date: nthWeekday(year, 0, 1, 3), name: "MLK Day" },
    { date: nthWeekday(year, 1, 1, 3), name: "Presidents' Day" },
    { date: lastWeekday(year, 4, 1), name: "Memorial Day" },
    { date: observed(new Date(year, 5, 19)), name: "Juneteenth" },
    { date: observed(new Date(year, 6, 4)), name: "Independence Day" },
    { date: nthWeekday(year, 8, 1, 1), name: "Labor Day" },
    { date: nthWeekday(year, 9, 1, 2), name: "Columbus Day" },
    { date: observed(new Date(year, 10, 11)), name: "Veterans Day" },
    { date: nthWeekday(year, 10, 4, 4), name: "Thanksgiving" },
    { date: observed(new Date(year, 11, 25)), name: "Christmas Day" },
  ];
}

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
