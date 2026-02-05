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
}

interface ScheduleCellProps {
  userId: number;
  weekStart: string;
  projectId: number | null;
  projects: Project[];
  bgColor: string;
  onAssign: (userId: number, weekStart: string, projectId: number | null) => void;
}

export function ScheduleCell({ userId, weekStart, projectId, projects, bgColor, onAssign }: ScheduleCellProps) {
  const handleChange = (value: string) => {
    if (value === NONE_VALUE) {
      onAssign(userId, weekStart, null);
    } else {
      onAssign(userId, weekStart, parseInt(value, 10));
    }
  };

  return (
    <td className={`border-r p-0.5 ${bgColor}`}>
      <Select value={projectId ? String(projectId) : NONE_VALUE} onValueChange={handleChange}>
        <SelectTrigger size="sm" className="border-0 shadow-none bg-transparent w-full h-7 text-xs">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent position="popper" align="start">
          <SelectItem value={NONE_VALUE}>
            <span className="text-muted-foreground">— None —</span>
          </SelectItem>
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
