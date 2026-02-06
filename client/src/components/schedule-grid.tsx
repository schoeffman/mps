import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { gql, useMutation } from "@apollo/client";
import { formatWeekHeader } from "@/lib/schedule-utils";
import { Badge } from "@/components/ui/badge";
import { ScheduleCell } from "./schedule-cell";
import { RowProjectPicker } from "./row-project-picker";

const SET_SCHEDULE_ASSIGNMENT = gql`
  mutation SetScheduleAssignment($scheduleId: Int!, $userId: Int!, $weekStart: String!, $projectId: Int) {
    setScheduleAssignment(scheduleId: $scheduleId, userId: $userId, weekStart: $weekStart, projectId: $projectId) {
      id
      scheduleId
      userId
      projectId
      weekStart
    }
  }
`;

const BULK_SET_SCHEDULE_ASSIGNMENTS = gql`
  mutation BulkSetScheduleAssignments($scheduleId: Int!, $assignments: [BulkAssignmentInput!]!) {
    bulkSetScheduleAssignments(scheduleId: $scheduleId, assignments: $assignments)
  }
`;

interface Team {
  id: number;
  name: string;
  teamLead: { id: number };
  members: { id: number; fullName: string }[];
}

interface Project {
  id: number;
  name: string;
}

interface Assignment {
  id: number;
  userId: number;
  projectId: number;
  weekStart: string;
}

interface ScheduleGridProps {
  scheduleId: number;
  teams: Team[];
  projects: Project[];
  assignments: Assignment[];
  weekStarts: string[];
  startDate: string;
  endDate: string;
}

const PROJECT_COLORS = [
  "bg-blue-100 dark:bg-blue-900/40",
  "bg-green-100 dark:bg-green-900/40",
  "bg-purple-100 dark:bg-purple-900/40",
  "bg-amber-100 dark:bg-amber-900/40",
  "bg-rose-100 dark:bg-rose-900/40",
  "bg-cyan-100 dark:bg-cyan-900/40",
  "bg-orange-100 dark:bg-orange-900/40",
  "bg-teal-100 dark:bg-teal-900/40",
];

const PROJECT_CHIP_COLORS = [
  "bg-blue-200 dark:bg-blue-800 border-blue-400 dark:border-blue-600",
  "bg-green-200 dark:bg-green-800 border-green-400 dark:border-green-600",
  "bg-purple-200 dark:bg-purple-800 border-purple-400 dark:border-purple-600",
  "bg-amber-200 dark:bg-amber-800 border-amber-400 dark:border-amber-600",
  "bg-rose-200 dark:bg-rose-800 border-rose-400 dark:border-rose-600",
  "bg-cyan-200 dark:bg-cyan-800 border-cyan-400 dark:border-cyan-600",
  "bg-orange-200 dark:bg-orange-800 border-orange-400 dark:border-orange-600",
  "bg-teal-200 dark:bg-teal-800 border-teal-400 dark:border-teal-600",
];

export function ScheduleGrid({ scheduleId, teams, projects, assignments, weekStarts, startDate, endDate }: ScheduleGridProps) {
  const [setAssignment] = useMutation(SET_SCHEDULE_ASSIGNMENT, {
    refetchQueries: ["GetScheduleDetail"],
  });
  const [bulkSetAssignments] = useMutation(BULK_SET_SCHEDULE_ASSIGNMENTS, {
    refetchQueries: ["GetScheduleDetail"],
  });

  // Paint mode state
  const [activeProjectId, setActiveProjectId] = useState<number | null | "eraser">(null);
  const [isPainting, setIsPainting] = useState(false);
  const paintedCellsRef = useRef<Set<string>>(new Set());

  const isPaintMode = activeProjectId !== null;

  // O(1) lookup: "userId-weekStart" → projectId
  const assignmentMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assignments) {
      map.set(`${a.userId}-${a.weekStart}`, a.projectId);
    }
    return map;
  }, [assignments]);

  // Stable color per project
  const projectColorMap = useMemo(() => {
    const map = new Map<number, string>();
    projects.forEach((p, i) => {
      map.set(p.id, PROJECT_COLORS[i % PROJECT_COLORS.length]);
    });
    return map;
  }, [projects]);

  // Chip color per project
  const projectChipColorMap = useMemo(() => {
    const map = new Map<number, string>();
    projects.forEach((p, i) => {
      map.set(p.id, PROJECT_CHIP_COLORS[i % PROJECT_CHIP_COLORS.length]);
    });
    return map;
  }, [projects]);

  const handleAssign = (userId: number, weekStart: string, projectId: number | null) => {
    setAssignment({ variables: { scheduleId, userId, weekStart, projectId } });
  };

  const handleRowAssign = (userId: number, projectId: number | null) => {
    const assignmentInputs = weekStarts.map((ws) => ({
      userId,
      weekStart: ws,
      projectId,
    }));
    bulkSetAssignments({ variables: { scheduleId, assignments: assignmentInputs } });
  };

  const handleTeamAssign = (team: Team, projectId: number | null) => {
    const assignmentInputs = team.members.flatMap((member) =>
      weekStarts.map((ws) => ({
        userId: member.id,
        weekStart: ws,
        projectId,
      }))
    );
    bulkSetAssignments({ variables: { scheduleId, assignments: assignmentInputs } });
  };

  const applyPaint = useCallback((userId: number, weekStart: string) => {
    const key = `${userId}-${weekStart}`;
    paintedCellsRef.current.add(key);
  }, []);

  const handlePaintStart = useCallback((userId: number, weekStart: string) => {
    setIsPainting(true);
    paintedCellsRef.current = new Set();
    applyPaint(userId, weekStart);
  }, [applyPaint]);

  const handlePaintEnter = useCallback((userId: number, weekStart: string) => {
    if (!isPainting) return;
    applyPaint(userId, weekStart);
  }, [isPainting, applyPaint]);

  const handlePaintEnd = useCallback(() => {
    if (!isPainting) return;
    setIsPainting(false);

    const cells = paintedCellsRef.current;
    if (cells.size === 0) return;

    const projectIdValue = activeProjectId === "eraser" ? null : activeProjectId;
    const assignmentInputs = Array.from(cells).map((key) => {
      const [userIdStr, ...weekParts] = key.split("-");
      const weekStart = weekParts.join("-"); // rejoin since dates have dashes
      return { userId: parseInt(userIdStr, 10), weekStart, projectId: projectIdValue };
    });

    bulkSetAssignments({ variables: { scheduleId, assignments: assignmentInputs } });
    paintedCellsRef.current = new Set();
  }, [isPainting, activeProjectId, scheduleId, bulkSetAssignments]);

  // Global mouseup listener to end painting
  useEffect(() => {
    const onMouseUp = () => {
      if (isPainting) handlePaintEnd();
    };
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, [isPainting, handlePaintEnd]);

  // Escape key exits paint mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveProjectId(null);
        setIsPainting(false);
        paintedCellsRef.current = new Set();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleChipClick = (id: number | "eraser") => {
    if (activeProjectId === id) {
      setActiveProjectId(null);
    } else {
      setActiveProjectId(id);
    }
  };

  return (
    <div className="space-y-3">
      {/* Paint mode toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground mr-1">Paint mode:</span>
        {projects.map((p) => {
          const chipColor = projectChipColorMap.get(p.id) ?? "";
          const isActive = activeProjectId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => handleChipClick(p.id)}
              className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer ${chipColor} ${
                isActive ? "ring-2 ring-primary ring-offset-1 scale-105" : "opacity-70 hover:opacity-100"
              }`}
            >
              {p.name}
            </button>
          );
        })}
        <button
          onClick={() => handleChipClick("eraser")}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 transition-all cursor-pointer ${
            activeProjectId === "eraser" ? "ring-2 ring-primary ring-offset-1 scale-105" : "opacity-70 hover:opacity-100"
          }`}
        >
          Eraser
        </button>
        {isPaintMode && (
          <span className="text-xs text-muted-foreground ml-2">(Press Escape to exit)</span>
        )}
      </div>

      <div className="overflow-auto border rounded-lg relative isolate">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-muted px-3 py-2 text-left font-medium min-w-[180px] border-b border-r">
                Team / Member
              </th>
              {weekStarts.map((ws) => (
                <th key={ws} className="sticky top-0 z-10 bg-muted px-2 py-2 text-center font-medium min-w-[130px] border-b border-r">
                  {formatWeekHeader(ws)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <>
                <tr key={`team-${team.id}`}>
                  <td
                    colSpan={weekStarts.length + 1}
                    className="bg-muted/50 px-3 py-1.5 font-semibold text-muted-foreground border-b"
                  >
                    <RowProjectPicker
                      memberName={team.name}
                      projects={projects}
                      projectChipColorMap={projectChipColorMap}
                      onSelectProject={(projectId) => handleTeamAssign(team, projectId)}
                    />
                  </td>
                </tr>
                {team.members.map((member) => (
                  <tr key={`member-${member.id}`} className="border-b">
                    <td className="sticky left-0 z-10 bg-background px-3 py-1.5 border-r whitespace-nowrap">
                      {member.id === team.teamLead.id && (
                        <Badge variant="outline" className="mr-1.5 text-[10px] px-1 py-0">TL</Badge>
                      )}
                      <RowProjectPicker
                        memberName={member.fullName}
                        projects={projects}
                        projectChipColorMap={projectChipColorMap}
                        onSelectProject={(projectId) => handleRowAssign(member.id, projectId)}
                      />
                    </td>
                    {weekStarts.map((ws) => {
                      const projectId = assignmentMap.get(`${member.id}-${ws}`) ?? null;
                      const bgColor = projectId ? projectColorMap.get(projectId) ?? "" : "";
                      return (
                        <ScheduleCell
                          key={ws}
                          userId={member.id}
                          weekStart={ws}
                          projectId={projectId}
                          projects={projects}
                          bgColor={bgColor}
                          onAssign={handleAssign}
                          isPaintMode={isPaintMode}
                          activeProjectId={activeProjectId}
                          onPaintStart={handlePaintStart}
                          onPaintEnter={handlePaintEnter}
                        />
                      );
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
