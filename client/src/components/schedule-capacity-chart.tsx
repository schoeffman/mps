import { useMemo } from "react";
import { Link } from "react-router-dom";
import { getProjectColor } from "@/lib/project-colors";

interface Project {
  id: number;
  name: string;
  color: string;
  projectType: string;
  isSystem: boolean;
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

const PROJECT_TYPE_COLORS: Record<string, string> = {
  FeatureDevelopment: "#3b82f6", // blue-500
  Maintenance: "#f59e0b", // amber-500
  Other: "#9ca3af", // gray-400
};

const PROJECT_TYPE_LABELS: Record<string, string> = {
  FeatureDevelopment: "Feature Development",
  Maintenance: "Maintenance",
  Other: "Other",
};

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

  const typeSlices = useMemo(() => {
    if (totalSlots === 0) return [];

    const typeCounts = new Map<string, number>();
    for (const a of assignments) {
      const project = projectMap.get(a.projectId);
      if (!project) continue;
      const type = project.projectType;
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    }

    const result: Slice[] = [];
    for (const [type, count] of typeCounts) {
      result.push({
        label: PROJECT_TYPE_LABELS[type] ?? type,
        value: count,
        percentage: Math.round((count / totalSlots) * 100),
        color: PROJECT_TYPE_COLORS[type] ?? "#9ca3af",
        projectId: null,
      });
    }

    const remaining = totalSlots - assignments.length;
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
  }, [assignments, projectMap, totalSlots]);

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

  let typeAngle = -Math.PI / 2;
  const typePaths = typeSlices.map((slice) => {
    const angle = (slice.value / totalSlots) * 2 * Math.PI;
    const startAngle = typeAngle;
    const endAngle = typeAngle + angle;
    typeAngle = endAngle;
    return { ...slice, d: describeArc(cx, cy, r, startAngle, endAngle) };
  });

  return (
    <div className="flex items-start gap-10 flex-wrap">
      {/* Per-project breakdown */}
      <div className="flex items-start gap-4">
        <svg width={160} height={160} viewBox="0 0 160 160" className="shrink-0">
          {paths.map((p, i) => (
            <path key={i} d={p.d} fill={p.color} stroke="white" strokeWidth={1.5} />
          ))}
        </svg>
        <div className="flex flex-col gap-1.5 py-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">By Project</span>
          {slices.map((s, i) => {
            const project = s.projectId != null ? projectMap.get(s.projectId) : null;
            return (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span
                  className="inline-block w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                {project && !project.isSystem ? (
                  <Link to={`/projects/${project.id}`} className="hover:underline">{s.label}</Link>
                ) : (
                  <span>{s.label}</span>
                )}
                <span className="text-sm">
                  {" "}({s.value} {s.value === 1 ? "week" : "weeks"}): <span className="font-medium">{s.percentage}%</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Project Type breakdown */}
      {typeSlices.length > 0 && (
        <div className="flex items-start gap-4">
          <svg width={160} height={160} viewBox="0 0 160 160" className="shrink-0">
            {typePaths.map((p, i) => (
              <path key={i} d={p.d} fill={p.color} stroke="white" strokeWidth={1.5} />
            ))}
          </svg>
          <div className="flex flex-col gap-1.5 py-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">By Type</span>
            {typeSlices.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span
                  className="inline-block w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span>
                  {s.label} ({s.value} {s.value === 1 ? "week" : "weeks"}): <span className="font-medium">{s.percentage}%</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
