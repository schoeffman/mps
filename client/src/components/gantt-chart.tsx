import { Gantt, Willow } from "@svar-ui/react-gantt";
import { format, startOfWeek, addDays } from "date-fns";
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

export function GanttChart({ tasks, onTaskClick }: GanttChartProps) {
  const svarTasks = tasks.map((t) => ({
    id: t.id,
    text: t.text,
    start: new Date(t.start + "T00:00:00"),
    end: new Date(t.end + "T00:00:00"),
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
          onSelectTask={(ev: { id: string }) => onTaskClick?.(ev.id)}
        />
      </Willow>
    </div>
  );
}
