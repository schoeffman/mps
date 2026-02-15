import { useMemo, useState, useEffect, useCallback } from "react";
import { gql, useMutation } from "@apollo/client";
import { formatWeekHeader, getHolidaysInWeek, isCurrentWeek } from "@/lib/schedule-utils";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Flag } from "lucide-react";
import { getProjectColor } from "@/lib/project-colors";
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
  color: string;
  status: string;
}

interface Assignment {
  id: number;
  userId: number;
  projectId: number;
  weekStart: string;
}

interface UnassignedUser {
  id: number;
  fullName: string;
}

interface ScheduleGridProps {
  scheduleId: number;
  teams: Team[];
  projects: Project[];
  assignments: Assignment[];
  weekStarts: string[];
  startDate: string;
  endDate: string;
  unassignedUsers: UnassignedUser[];
}


export function ScheduleGrid({ scheduleId, teams, projects, assignments, weekStarts, startDate, endDate, unassignedUsers }: ScheduleGridProps) {
  const [setAssignment] = useMutation(SET_SCHEDULE_ASSIGNMENT, {
    refetchQueries: ["GetScheduleDetail"],
  });
  const [bulkSetAssignments] = useMutation(BULK_SET_SCHEDULE_ASSIGNMENTS, {
    refetchQueries: ["GetScheduleDetail"],
  });

  const assignableProjects = useMemo(() => projects.filter((p) => p.status !== "Complete" && p.status !== "Cancelled"), [projects]);

  // Paint mode state
  const [activeProjectId, setActiveProjectId] = useState<number | null | "eraser">(null);
  const [isPainting, setIsPainting] = useState(false);
  const [paintedCells, setPaintedCells] = useState<Set<string>>(new Set());

  const isPaintMode = activeProjectId !== null;

  // Preview color for cells being painted
  const paintPreviewBg = useMemo(() => {
    if (activeProjectId === null || activeProjectId === "eraser") return "";
    const project = projects.find((p) => p.id === activeProjectId);
    return project ? getProjectColor(project.color).cellBg : "";
  }, [activeProjectId, projects]);

  // O(1) lookup: "userId-weekStart" → projectId
  const assignmentMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assignments) {
      map.set(`${a.userId}-${a.weekStart}`, a.projectId);
    }
    return map;
  }, [assignments]);

  // Color maps derived from project.color
  const projectColorMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of projects) {
      map.set(p.id, getProjectColor(p.color).cellBg);
    }
    return map;
  }, [projects]);

  const projectChipColorMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of projects) {
      map.set(p.id, getProjectColor(p.color).chipBg);
    }
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

  const handlePaintStart = useCallback((userId: number, weekStart: string) => {
    setIsPainting(true);
    setPaintedCells((prev) => {
      const next = new Set(prev);
      next.add(`${userId}-${weekStart}`);
      return next;
    });
  }, []);

  const handlePaintEnter = useCallback((userId: number, weekStart: string) => {
    if (!isPainting) return;
    setPaintedCells((prev) => {
      const next = new Set(prev);
      next.add(`${userId}-${weekStart}`);
      return next;
    });
  }, [isPainting]);

  // Mouseup just stops the drag — does NOT commit
  const handlePaintEnd = useCallback(() => {
    if (!isPainting) return;
    setIsPainting(false);
  }, [isPainting]);

  // Save: commit all painted cells via mutation, then exit paint mode
  const handleSave = useCallback(() => {
    if (paintedCells.size > 0) {
      const projectIdValue = activeProjectId === "eraser" ? null : activeProjectId;
      const assignmentInputs = Array.from(paintedCells).map((key) => {
        const [userIdStr, ...weekParts] = key.split("-");
        const weekStart = weekParts.join("-");
        return { userId: parseInt(userIdStr, 10), weekStart, projectId: projectIdValue };
      });
      bulkSetAssignments({ variables: { scheduleId, assignments: assignmentInputs } });
    }
    setPaintedCells(new Set());
    setActiveProjectId(null);
  }, [paintedCells, activeProjectId, scheduleId, bulkSetAssignments]);

  // Global mouseup listener to end drag
  useEffect(() => {
    const onMouseUp = () => {
      if (isPainting) handlePaintEnd();
    };
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, [isPainting, handlePaintEnd]);

  // Escape key cancels paint mode without saving
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveProjectId(null);
        setIsPainting(false);
        setPaintedCells(new Set());
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Find the week column that contains today's date
  const currentWeekStart = useMemo(() => {
    return weekStarts.find((ws) => isCurrentWeek(ws)) ?? null;
  }, [weekStarts]);

  const handleChipClick = (id: number | "eraser") => {
    if (activeProjectId === id) {
      handleSave();
    } else {
      setPaintedCells(new Set());
      setActiveProjectId(id);
    }
  };

  return (
    <div className="space-y-3">
      {/* Paint mode toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground mr-1">Paint mode:</span>
        {assignableProjects.map((p) => {
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
              {isActive ? "Save" : p.name}
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
          <span className="text-xs text-muted-foreground ml-2">(Press Escape to cancel)</span>
        )}
      </div>

      <div className="overflow-auto border rounded-lg relative isolate">
        <table className="w-full border-collapse text-sm">
          <thead>
            <TooltipProvider>
              <tr>
                <th className="sticky left-0 z-20 bg-muted px-3 py-2 text-left font-medium min-w-[180px] border-b border-r">
                  Team / Member
                </th>
                {weekStarts.map((ws) => {
                  const holidays = getHolidaysInWeek(ws);
                  const isCurrent = ws === currentWeekStart;
                  return (
                    <th key={ws} className={`sticky top-0 z-10 px-2 py-2 text-center font-medium min-w-[130px] border-b border-r ${isCurrent ? "bg-blue-100 dark:bg-blue-950/40 border-x-2 border-x-blue-400 dark:border-x-blue-500" : "bg-muted"}`}>
                      {formatWeekHeader(ws)}
                      {holidays.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Flag className="inline-block ml-1 h-3 w-3 text-yellow-500 align-text-top" />
                          </TooltipTrigger>
                          <TooltipContent>
                            {holidays.join(", ")}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </th>
                  );
                })}
              </tr>
            </TooltipProvider>
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
                      projects={assignableProjects}
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
                      const cellKey = `${member.id}-${ws}`;
                      const isPainted = paintedCells.has(cellKey);
                      const projectId = assignmentMap.get(cellKey) ?? null;
                      const bgColor = projectId ? projectColorMap.get(projectId) ?? "" : "";
                      return (
                        <ScheduleCell
                          key={ws}
                          userId={member.id}
                          weekStart={ws}
                          projectId={projectId}
                          projects={assignableProjects}
                          allProjects={projects}
                          bgColor={bgColor}
                          onAssign={handleAssign}
                          isPaintMode={isPaintMode}
                          activeProjectId={activeProjectId}
                          onPaintStart={handlePaintStart}
                          onPaintEnter={handlePaintEnter}
                          isPainted={isPainted}
                          paintPreviewBg={paintPreviewBg}
                          isCurrentWeek={ws === currentWeekStart}
                        />
                      );
                    })}
                  </tr>
                ))}
              </>
            ))}
            {unassignedUsers.length > 0 && (
              <>
                <tr key="team-unassigned">
                  <td
                    colSpan={weekStarts.length + 1}
                    className="bg-muted/50 px-3 py-1.5 font-semibold text-muted-foreground border-b"
                  >
                    Unassigned
                  </td>
                </tr>
                {unassignedUsers.map((member) => (
                  <tr key={`member-${member.id}`} className="border-b">
                    <td className="sticky left-0 z-10 bg-background px-3 py-1.5 border-r whitespace-nowrap">
                      <RowProjectPicker
                        memberName={member.fullName}
                        projects={projects}
                        projectChipColorMap={projectChipColorMap}
                        onSelectProject={(projectId) => handleRowAssign(member.id, projectId)}
                      />
                    </td>
                    {weekStarts.map((ws) => {
                      const cellKey = `${member.id}-${ws}`;
                      const isPainted = paintedCells.has(cellKey);
                      const projectId = assignmentMap.get(cellKey) ?? null;
                      const bgColor = projectId ? projectColorMap.get(projectId) ?? "" : "";
                      return (
                        <ScheduleCell
                          key={ws}
                          userId={member.id}
                          weekStart={ws}
                          projectId={projectId}
                          projects={assignableProjects}
                          allProjects={projects}
                          bgColor={bgColor}
                          onAssign={handleAssign}
                          isPaintMode={isPaintMode}
                          activeProjectId={activeProjectId}
                          onPaintStart={handlePaintStart}
                          onPaintEnter={handlePaintEnter}
                          isPainted={isPainted}
                          paintPreviewBg={paintPreviewBg}
                          isCurrentWeek={ws === currentWeekStart}
                        />
                      );
                    })}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
