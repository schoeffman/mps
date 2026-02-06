import { useMemo } from "react";
import { getProjectColor } from "@/lib/project-colors";
import { EditProjectDialog } from "./edit-project-dialog";

interface Project {
  id: number;
  name: string;
  targetDate: string;
  dri: { id: number; fullName: string };
  status: string;
  color: string;
  members: { id: number; fullName: string }[];
}

interface Assignment {
  id: number;
  userId: number;
  projectId: number;
  weekStart: string;
}

interface ScheduleCapacityChartProps {
  projects: Project[];
  assignments: Assignment[];
  totalSlots: number;
}

const REMAINING_COLOR = "#e5e7eb"; // gray-200

interface Slice {
  label: string;
  value: number;
  percentage: number;
  color: string;
  projectId: number | null;
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  // Full circle special case
  if (endAngle - startAngle >= 2 * Math.PI - 0.001) {
    return [
      `M ${cx + r} ${cy}`,
      `A ${r} ${r} 0 1 1 ${cx - r} ${cy}`,
      `A ${r} ${r} 0 1 1 ${cx + r} ${cy}`,
      "Z",
    ].join(" ");
  }

  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  return [
    `M ${cx} ${cy}`,
    `L ${x1} ${y1}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
    "Z",
  ].join(" ");
}

export function ScheduleCapacityChart({ projects, assignments, totalSlots }: ScheduleCapacityChartProps) {
  const projectMap = useMemo(() => {
    const map = new Map<number, Project>();
    for (const p of projects) {
      map.set(p.id, p);
    }
    return map;
  }, [projects]);

  const slices = useMemo(() => {
    if (totalSlots === 0) return [];

    // Count assignments per project
    const counts = new Map<number, number>();
    for (const a of assignments) {
      counts.set(a.projectId, (counts.get(a.projectId) || 0) + 1);
    }

    const result: Slice[] = [];
    for (const p of projects) {
      const count = counts.get(p.id) || 0;
      if (count > 0) {
        result.push({
          label: p.name,
          value: count,
          percentage: Math.round((count / totalSlots) * 100),
          color: getProjectColor(p.color).hex,
          projectId: p.id,
        });
      }
    }

    const assigned = assignments.length;
    const remaining = totalSlots - assigned;
    if (remaining > 0) {
      result.push({
        label: "Remaining capacity",
        value: remaining,
        percentage: Math.round((remaining / totalSlots) * 100),
        color: REMAINING_COLOR,
        projectId: null,
      });
    }

    return result;
  }, [projects, assignments, totalSlots]);

  if (slices.length === 0) return null;

  const cx = 80;
  const cy = 80;
  const r = 70;
  let currentAngle = -Math.PI / 2; // start at top

  const paths = slices.map((slice) => {
    const angle = (slice.value / totalSlots) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;
    return { ...slice, d: describeArc(cx, cy, r, startAngle, endAngle) };
  });

  return (
    <div className="flex items-start gap-6 flex-wrap">
      <svg width={160} height={160} viewBox="0 0 160 160" className="shrink-0">
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill={p.color} stroke="white" strokeWidth={1.5} />
        ))}
      </svg>
      <div className="flex flex-col gap-1.5 py-1">
        {slices.map((s, i) => {
          const project = s.projectId != null ? projectMap.get(s.projectId) : null;

          return (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span
                className="inline-block w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <span>
                {project ? (
                  <EditProjectDialog
                    project={project}
                    trigger={
                      <button className="hover:underline cursor-pointer text-left">
                        {s.label}
                      </button>
                    }
                  />
                ) : (
                  s.label
                )}{" "}
                ({s.value} {s.value === 1 ? "week" : "weeks"}): <span className="font-medium">{s.percentage}%</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
