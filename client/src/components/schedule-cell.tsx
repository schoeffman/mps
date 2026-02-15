import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONE_VALUE = "__none__";

interface Project {
  id: number;
  name: string;
  status?: string;
}

interface ScheduleCellProps {
  userId: number;
  weekStart: string;
  projectId: number | null;
  projects: Project[];
  allProjects?: Project[];
  bgColor: string;
  onAssign: (userId: number, weekStart: string, projectId: number | null) => void;
  isPaintMode: boolean;
  activeProjectId: number | null | "eraser";
  onPaintStart?: (userId: number, weekStart: string) => void;
  onPaintEnter?: (userId: number, weekStart: string) => void;
  isPainted?: boolean;
  paintPreviewBg?: string;
  isCurrentWeek?: boolean;
}

export function ScheduleCell({
  userId,
  weekStart,
  projectId,
  projects,
  allProjects,
  bgColor,
  onAssign,
  isPaintMode,
  activeProjectId,
  onPaintStart,
  onPaintEnter,
  isPainted,
  paintPreviewBg,
  isCurrentWeek,
}: ScheduleCellProps) {
  const lookupProjects = allProjects ?? projects;
  const handleChange = (value: string) => {
    if (value === NONE_VALUE) {
      onAssign(userId, weekStart, null);
    } else {
      onAssign(userId, weekStart, parseInt(value, 10));
    }
  };

  if (isPaintMode) {
    const isErasing = isPainted && activeProjectId === "eraser";
    const previewProjectId = isPainted
      ? (activeProjectId === "eraser" ? null : activeProjectId)
      : projectId;
    const displayBg = isPainted ? (paintPreviewBg ?? "") : bgColor;
    const projectName = previewProjectId
      ? lookupProjects.find((p) => p.id === previewProjectId)?.name ?? "—"
      : "—";

    return (
      <td
        className={`border-r p-0.5 cursor-pointer select-none hover:ring-2 hover:ring-inset hover:ring-primary/50 ${displayBg} ${isPainted && !isErasing ? "ring-2 ring-inset ring-primary/40" : ""} ${isCurrentWeek ? "border-x-2 border-x-blue-400 dark:border-x-blue-500" : ""}`}
        onMouseDown={(e) => {
          e.preventDefault();
          onPaintStart?.(userId, weekStart);
        }}
        onMouseEnter={() => {
          onPaintEnter?.(userId, weekStart);
        }}
      >
        <div className="w-full h-7 flex items-center justify-center text-xs truncate px-1">
          {projectName}
        </div>
      </td>
    );
  }

  return (
    <td className={`border-r p-0.5 ${bgColor} ${isCurrentWeek ? "border-x-2 border-x-blue-400 dark:border-x-blue-500" : ""}`}>
      <Select value={projectId ? String(projectId) : NONE_VALUE} onValueChange={handleChange}>
        <SelectTrigger size="sm" className="border-0 shadow-none bg-transparent w-full h-7 text-xs">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent position="popper" align="start">
          <SelectItem value={NONE_VALUE}>
            <span className="text-muted-foreground">— None —</span>
          </SelectItem>
          {projectId && !projects.some((p) => p.id === projectId) && (() => {
            const completed = lookupProjects.find((p) => p.id === projectId);
            return completed ? (
              <SelectItem key={completed.id} value={String(completed.id)}>
                <span className="text-muted-foreground">{completed.name} ({completed.status ?? "Complete"})</span>
              </SelectItem>
            ) : null;
          })()}
          {projects.map((p) => (
            <SelectItem key={p.id} value={String(p.id)}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </td>
  );
}
