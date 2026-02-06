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
 * Format a week start date for column headers, e.g. "Jan 5"
 */
export function formatWeekHeader(weekStart: string): string {
  const date = new Date(weekStart + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
