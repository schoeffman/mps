export interface DateRange {
  start: string;
  end: string;
  scheduleName: string;
}

export interface ScheduleWeeks {
  scheduleName: string;
  weeks: string[];
}

/**
 * Merge consecutive weeks (7-day gaps) into date ranges, grouped by schedule.
 * Weeks within each schedule are sorted before merging.
 */
export function mergeWeekRanges(bySchedule: Map<number, ScheduleWeeks>): DateRange[] {
  const dateRanges: DateRange[] = [];
  for (const [, { scheduleName, weeks }] of bySchedule) {
    weeks.sort();
    let rangeStart = weeks[0];
    let rangeEnd = weeks[0];
    for (let i = 1; i < weeks.length; i++) {
      const prev = new Date(rangeEnd);
      const curr = new Date(weeks[i]);
      const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays === 7) {
        rangeEnd = weeks[i];
      } else {
        dateRanges.push({ start: rangeStart, end: rangeEnd, scheduleName });
        rangeStart = weeks[i];
        rangeEnd = weeks[i];
      }
    }
    dateRanges.push({ start: rangeStart, end: rangeEnd, scheduleName });
  }
  return dateRanges;
}
