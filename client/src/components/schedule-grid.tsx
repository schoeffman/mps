import { useMemo } from "react";
import { gql, useMutation } from "@apollo/client";
import { formatWeekHeader } from "@/lib/schedule-utils";
import { ScheduleCell } from "./schedule-cell";

const SET_SCHEDULE_ASSIGNMENT = gql`
  mutation SetScheduleAssignment($userId: Int!, $weekStart: String!, $projectId: Int) {
    setScheduleAssignment(userId: $userId, weekStart: $weekStart, projectId: $projectId) {
      id
      userId
      projectId
      weekStart
    }
  }
`;

interface Team {
  id: number;
  name: string;
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

export function ScheduleGrid({ teams, projects, assignments, weekStarts, startDate, endDate }: ScheduleGridProps) {
  const [setAssignment] = useMutation(SET_SCHEDULE_ASSIGNMENT, {
    refetchQueries: ["GetScheduleData"],
  });

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

  const handleAssign = (userId: number, weekStart: string, projectId: number | null) => {
    setAssignment({ variables: { userId, weekStart, projectId } });
  };

  return (
    <div className="overflow-auto border rounded-lg">
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
                  {team.name}
                </td>
              </tr>
              {team.members.map((member) => (
                <tr key={`member-${member.id}`} className="border-b">
                  <td className="sticky left-0 z-10 bg-background px-3 py-1.5 border-r whitespace-nowrap">
                    {member.fullName}
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
  );
}
