export interface JiraIssue {
  key: string;
  summary: string;
  status: string;
  statusColor: string;
  assignee: string | null;
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

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

function nextBusinessDay(d: Date): Date {
  let result = new Date(d);
  while (isWeekend(result)) {
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
  if (!advanceCursorToRange(worker)) return null;

  const start = new Date(worker.cursor);
  let businessDaysUsed = 0;
  let current = new Date(start);

  while (businessDaysUsed < TASK_DAYS) {
    if (worker.rangeIndex >= worker.ranges.length) return null;
    const range = worker.ranges[worker.rangeIndex];

    if (current > range.end) {
      worker.rangeIndex++;
      if (worker.rangeIndex < worker.ranges.length) {
        current = new Date(worker.ranges[worker.rangeIndex].start);
        current = nextBusinessDay(current);
      }
      continue;
    }

    if (!isWeekend(current)) {
      businessDaysUsed++;
      if (businessDaysUsed === TASK_DAYS) {
        const end = new Date(current);
        worker.cursor = addDays(current, 1);
        return { start, end };
      }
    }
    current = addDays(current, 1);
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
    let bestWorker: WorkerState | null = null;
    let bestTime = Infinity;

    for (const worker of workers) {
      const saved = {
        rangeIndex: worker.rangeIndex,
        cursor: new Date(worker.cursor),
      };
      if (advanceCursorToRange(worker)) {
        const t = worker.cursor.getTime();
        if (t < bestTime) {
          bestTime = t;
          bestWorker = worker;
        }
      }
      worker.rangeIndex = saved.rangeIndex;
      worker.cursor = new Date(saved.cursor);
    }

    if (!bestWorker) {
      unscheduled.push(issue);
      continue;
    }

    const slot = scheduleTaskForWorker(bestWorker);
    if (!slot) {
      unscheduled.push(issue);
      continue;
    }

    const truncatedSummary =
      issue.summary.length > 40
        ? issue.summary.slice(0, 37) + "..."
        : issue.summary;

    scheduled.push({
      id: issue.key,
      text: `${issue.key}: ${truncatedSummary}`,
      start: formatDate(slot.start),
      end: formatDate(slot.end),
      assignee: bestWorker.name,
      progress: 0,
      type: assigneeTypeMap.get(bestWorker.name) ?? ASSIGNEE_TYPES[0],
    });
  }

  return { scheduled, unscheduled };
}
