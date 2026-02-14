import { useRef, useEffect } from "react";
import { Gantt, Willow, WillowDark } from "@svar-ui/react-gantt";
import { format, startOfWeek, addDays } from "date-fns";
import { getUSHolidays } from "@/lib/schedule-utils";
import { useTheme } from "@/hooks/use-theme";
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

const FLAG = "\u2691";

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildHolidayMap(start: Date, end: Date): Map<string, string> {
  const years = new Set<number>();
  for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
    years.add(y);
  }
  const map = new Map<string, string>();
  for (const y of years) {
    for (const h of getUSHolidays(y)) {
      map.set(toDateKey(h.date), h.name);
    }
  }
  return map;
}

export function GanttChart({ tasks, onTaskClick }: GanttChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const ThemeWrapper = isDark ? WillowDark : Willow;
  const wrapperRef = useRef<HTMLDivElement>(null);

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

  const holidayMap = buildHolidayMap(chartStart, chartEnd);

  const scales = [
    { unit: "month", step: 1, format: (date: Date) => format(date, "MMMM yyyy") },
    {
      unit: "day",
      step: 1,
      format: (date: Date) => {
        const name = holidayMap.get(toDateKey(date));
        return name ? `${format(date, "d")} ${FLAG}` : format(date, "d");
      },
    },
  ];

  const highlightTime = (date: Date, unit: "day" | "hour") => {
    if (unit !== "day") return "";
    const day = date.getDay();
    if (day === 0 || day === 6) return "gantt-weekend";
    if (holidayMap.has(toDateKey(date))) return "gantt-holiday";
    return "";
  };

  // Once bars render, scroll the chart so the first task bar is visible
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    function scrollToFirstBar() {
      const chartArea = el!.querySelector<HTMLElement>(".wx-chart, [class*='wx-mR7v2Xag']");
      const firstBar = el!.querySelector<HTMLElement>(".wx-bar");
      if (chartArea && firstBar) {
        chartArea.scrollLeft = Math.max(0, firstBar.offsetLeft - 40);
        return true;
      }
      return false;
    }

    // Bars may already exist
    if (scrollToFirstBar()) return;

    // Otherwise wait for the library to render them
    const observer = new MutationObserver(() => {
      if (scrollToFirstBar()) observer.disconnect();
    });
    observer.observe(el, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Add native title tooltips to scale cells that contain the flag
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const cells = el.querySelectorAll<HTMLElement>(".wx-scale .wx-cell, [class*='wx-ZkvhDKir']");
    cells.forEach((cell) => {
      if (cell.textContent?.includes(FLAG)) {
        // Walk dates from chartStart to find which holiday this cell represents
        const dayNum = parseInt(cell.textContent, 10);
        if (isNaN(dayNum)) return;
        // Find matching holiday by day-of-month
        for (const [key, name] of holidayMap) {
          const d = new Date(key + "T00:00:00");
          if (d.getDate() === dayNum) {
            cell.title = name;
            break;
          }
        }
      }
    });
  });

  return (
    <div ref={wrapperRef} className="gantt-chart-wrapper overflow-x-auto border rounded-lg">
      <style>{`
        .gantt-chart-wrapper .wx-bar.assignee-0 { background-color: #2684ff; }
        .gantt-chart-wrapper .wx-bar.assignee-1 { background-color: #36b37e; }
        .gantt-chart-wrapper .wx-bar.assignee-2 { background-color: #ffab00; }
        .gantt-chart-wrapper .wx-bar.assignee-3 { background-color: #ff5630; }
        .gantt-chart-wrapper .wx-bar.assignee-4 { background-color: #6554c0; }
        .gantt-chart-wrapper .wx-bar.assignee-5 { background-color: #00b8d9; }
        .gantt-chart-wrapper .wx-bar.assignee-6 { background-color: #ff8b00; }
        .gantt-chart-wrapper .wx-bar.assignee-7 { background-color: #6b778c; }
        .gantt-chart-wrapper .gantt-weekend { background-color: ${isDark ? "#1a1f25" : "#f0f0f0"}; }
        .gantt-chart-wrapper .gantt-holiday { background-color: ${isDark ? "#1a1f25" : "#f0f0f0"}; }
        .gantt-chart-wrapper .wx-scale .gantt-holiday { color: ${isDark ? "#eab308" : "#ca8a04"}; }
      `}</style>
      <ThemeWrapper>
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
      </ThemeWrapper>
    </div>
  );
}
