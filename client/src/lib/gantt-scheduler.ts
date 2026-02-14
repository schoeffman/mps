import { getUSHolidays } from "./schedule-utils";

export interface JiraIssue {
  key: string;
  summary: string;
  status: string;
  statusColor: string;
  assignee: string | null;
  storyPoints: number | null;
}

export interface Assignment {
  user: { id: number; fullName: string };
  dateRanges: { start: string; end: string }[];
}

export interface ScheduledTask {
  id: string;
  text: string;
  start: string;
  end: string;
  assignee: string;
  progress: number;
  type: string;
}

export interface ScheduleResult {
  scheduled: ScheduledTask[];
  unscheduled: JiraIssue[];
}

const TASK_DAYS = 3;

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildHolidaySet(ranges: { start: Date; end: Date }[]): Set<string> {
  const years = new Set<number>();
  for (const r of ranges) {
    for (let y = r.start.getFullYear(); y <= r.end.getFullYear(); y++) {
      years.add(y);
    }
  }
  const set = new Set<string>();
  for (const y of years) {
    for (const h of getUSHolidays(y)) {
      set.add(formatDate(h.date));
    }
  }
  return set;
}

let holidaySet: Set<string> = new Set();

function isNonWorkDay(d: Date): boolean {
  const day = d.getDay();
  if (day === 0 || day === 6) return true;
  return holidaySet.has(formatDate(d));
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

function nextBusinessDay(d: Date): Date {
  let result = new Date(d);
  while (isNonWorkDay(result)) {
    result = addDays(result, 1);
  }
  return result;
}

interface WorkerState {
  name: string;
  ranges: { start: Date; end: Date }[];
  rangeIndex: number;
  cursor: Date;
}

function advanceCursorToRange(worker: WorkerState): boolean {
  while (worker.rangeIndex < worker.ranges.length) {
    const range = worker.ranges[worker.rangeIndex];
    if (worker.cursor > range.end) {
      worker.rangeIndex++;
      if (worker.rangeIndex < worker.ranges.length) {
        worker.cursor = new Date(worker.ranges[worker.rangeIndex].start);
      }
      continue;
    }
    if (worker.cursor < range.start) {
      worker.cursor = new Date(range.start);
    }
    worker.cursor = nextBusinessDay(worker.cursor);
    if (worker.cursor > range.end) {
      worker.rangeIndex++;
      if (worker.rangeIndex < worker.ranges.length) {
        worker.cursor = new Date(worker.ranges[worker.rangeIndex].start);
      }
      continue;
    }
    return true;
  }
  return false;
}

function scheduleTaskForWorker(worker: WorkerState): { start: Date; end: Date } | null {
  while (advanceCursorToRange(worker)) {
    const start = new Date(worker.cursor);
    const range = worker.ranges[worker.rangeIndex];
    let businessDaysUsed = 0;
    let current = new Date(start);

    while (current <= range.end) {
      if (!isNonWorkDay(current)) {
        businessDaysUsed++;
        if (businessDaysUsed === TASK_DAYS) {
          const end = new Date(current);
          worker.cursor = addDays(current, 1);
          return { start, end };
        }
      }
      current = addDays(current, 1);
    }

    // Not enough business days in this range — skip to next
    worker.rangeIndex++;
    if (worker.rangeIndex < worker.ranges.length) {
      worker.cursor = new Date(worker.ranges[worker.rangeIndex].start);
    }
  }

  return null;
}

const ASSIGNEE_TYPES = [
  "assignee-0",
  "assignee-1",
  "assignee-2",
  "assignee-3",
  "assignee-4",
  "assignee-5",
  "assignee-6",
  "assignee-7",
];

export function scheduleIssues(
  issues: JiraIssue[],
  assignments: Assignment[],
  startFrom?: Date
): ScheduleResult {
  const nonDoneIssues = issues.filter((i) => i.statusColor !== "green");

  if (assignments.length === 0) {
    return { scheduled: [], unscheduled: nonDoneIssues };
  }

  // Build holiday set from all assignment ranges
  const allRanges = assignments.flatMap((a) =>
    a.dateRanges.map((r) => ({ start: parseDate(r.start), end: parseDate(r.end) }))
  );
  holidaySet = buildHolidaySet(allRanges);

  const workers: WorkerState[] = assignments
    .filter((a) => a.dateRanges.length > 0)
    .map((a) => {
      let ranges = a.dateRanges
        .map((r) => ({ start: parseDate(r.start), end: parseDate(r.end) }))
        .sort((a, b) => a.start.getTime() - b.start.getTime());
      if (startFrom) {
        ranges = ranges
          .filter((r) => r.end >= startFrom)
          .map((r) => ({
            start: r.start < startFrom ? startFrom : r.start,
            end: r.end,
          }));
      }
      if (ranges.length === 0) return null;
      return {
        name: a.user.fullName,
        ranges,
        rangeIndex: 0,
        cursor: new Date(ranges[0].start),
      };
    })
    .filter((w): w is WorkerState => w !== null);

  if (workers.length === 0) {
    return { scheduled: [], unscheduled: nonDoneIssues };
  }

  const assigneeTypeMap = new Map<string, string>();
  workers.forEach((w, i) => {
    assigneeTypeMap.set(w.name, ASSIGNEE_TYPES[i % ASSIGNEE_TYPES.length]);
  });

  const scheduled: ScheduledTask[] = [];
  const unscheduled: JiraIssue[] = [];

  for (const issue of nonDoneIssues) {
    // Save all worker states, try scheduling on each, pick earliest finish
    const snapshots = workers.map((w) => ({
      rangeIndex: w.rangeIndex,
      cursor: new Date(w.cursor),
    }));

    let bestIdx = -1;
    let bestEnd = Infinity;
    let bestSlot: { start: Date; end: Date } | null = null;
    const results: ({ start: Date; end: Date } | null)[] = [];

    for (let i = 0; i < workers.length; i++) {
      const slot = scheduleTaskForWorker(workers[i]);
      results.push(slot);
      if (slot && slot.end.getTime() < bestEnd) {
        bestEnd = slot.end.getTime();
        bestIdx = i;
        bestSlot = slot;
      }
    }

    // Restore all workers, then re-apply only the winner's advancement
    for (let i = 0; i < workers.length; i++) {
      workers[i].rangeIndex = snapshots[i].rangeIndex;
      workers[i].cursor = new Date(snapshots[i].cursor);
    }

    if (bestIdx === -1 || !bestSlot) {
      unscheduled.push(issue);
      continue;
    }

    // Re-run the winner to advance its state
    scheduleTaskForWorker(workers[bestIdx]);
    const slot = bestSlot;

    const truncatedSummary =
      issue.summary.length > 40
        ? issue.summary.slice(0, 37) + "..."
        : issue.summary;

    scheduled.push({
      id: issue.key,
      text: `${issue.key}: ${truncatedSummary}`,
      start: formatDate(slot.start),
      end: formatDate(slot.end),
      assignee: workers[bestIdx].name,
      progress: 0,
      type: assigneeTypeMap.get(workers[bestIdx].name) ?? ASSIGNEE_TYPES[0],
    });
  }

  return { scheduled, unscheduled };
}
