import { Gantt, Willow } from "@svar-ui/react-gantt";
import { format, startOfWeek, addDays } from "date-fns";
import { getUSHolidays } from "@/lib/schedule-utils";
import "@svar-ui/react-gantt/all.css";

export interface GanttTask {
  id: string;
  text: string;
  start: string;
  end: string;
  progress: number;
  type?: string;
  assignee?: string;
}

interface GanttChartProps {
  tasks: GanttTask[];
  onTaskClick?: (taskId: string) => void;
}

const taskTypes = Array.from({ length: 8 }, (_, i) => ({
  id: `assignee-${i}`,
  label: `Assignee ${i}`,
}));

const scales = [
  { unit: "month", step: 1, format: (date: Date) => format(date, "MMMM yyyy") },
  { unit: "day", step: 1, format: (date: Date) => format(date, "d") },
];

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildHolidaySet(start: Date, end: Date): Set<string> {
  const years = new Set<number>();
  for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
    years.add(y);
  }
  const set = new Set<string>();
  for (const y of years) {
    for (const h of getUSHolidays(y)) {
      set.add(toDateKey(h.date));
    }
  }
  return set;
}

export function GanttChart({ tasks, onTaskClick }: GanttChartProps) {
  const svarTasks = tasks.map((t) => ({
    id: t.id,
    text: t.text,
    start: new Date(t.start + "T00:00:00"),
    end: addDays(new Date(t.end + "T00:00:00"), 1),
    progress: t.progress,
    type: t.type ?? "task",
  }));

  const thisWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  const earliestStart = svarTasks.reduce(
    (min, t) => (t.start < min ? t.start : min),
    thisWeek,
  );
  const latestEnd = svarTasks.reduce(
    (max, t) => (t.end > max ? t.end : max),
    thisWeek,
  );
  const chartStart = earliestStart < thisWeek ? earliestStart : thisWeek;
  const chartEnd = addDays(latestEnd, 7);

  const holidays = buildHolidaySet(chartStart, chartEnd);

  const highlightTime = (date: Date, unit: "day" | "hour") => {
    if (unit !== "day") return "";
    const day = date.getDay();
    if (day === 0 || day === 6) return "gantt-weekend";
    if (holidays.has(toDateKey(date))) return "gantt-holiday";
    return "";
  };

  return (
    <div className="gantt-chart-wrapper overflow-x-auto border rounded-lg">
      <style>{`
        .gantt-chart-wrapper .wx-bar.assignee-0 { background-color: #2684ff; }
        .gantt-chart-wrapper .wx-bar.assignee-1 { background-color: #36b37e; }
        .gantt-chart-wrapper .wx-bar.assignee-2 { background-color: #ffab00; }
        .gantt-chart-wrapper .wx-bar.assignee-3 { background-color: #ff5630; }
        .gantt-chart-wrapper .wx-bar.assignee-4 { background-color: #6554c0; }
        .gantt-chart-wrapper .wx-bar.assignee-5 { background-color: #00b8d9; }
        .gantt-chart-wrapper .wx-bar.assignee-6 { background-color: #ff8b00; }
        .gantt-chart-wrapper .wx-bar.assignee-7 { background-color: #6b778c; }
        .gantt-chart-wrapper .gantt-weekend { background-color: #f0f0f0; }
        .gantt-chart-wrapper .gantt-holiday { background-color: #f0f0f0; }
      `}</style>
      <Willow>
        <Gantt
          tasks={svarTasks}
          scales={scales}
          taskTypes={taskTypes}
          columns={false}
          readonly={true}
          autoScale={false}
          start={chartStart}
          end={chartEnd}
          highlightTime={highlightTime}
          onSelectTask={(ev: { id: string }) => onTaskClick?.(ev.id)}
        />
      </Willow>
    </div>
  );
}
