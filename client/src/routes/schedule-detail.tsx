import { useMemo, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, gql } from "@apollo/client";
import { ArrowLeft, Trash2, Download, TriangleAlert } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { GET_SCHEDULES } from "@/routes/schedules";
import { EditScheduleDialog } from "@/components/edit-schedule-dialog";
import { getQuarterRange, getWeekStarts } from "@/lib/schedule-utils";
import { ScheduleGrid } from "@/components/schedule-grid";
import { ScheduleCapacityChart } from "@/components/schedule-capacity-chart";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const GET_SCHEDULE = gql`
  query GetSchedule($id: Int!) {
    schedule(id: $id) {
      id
      name
      year
      quarter
      createdAt
    }
  }
`;

const GET_SCHEDULE_DETAIL = gql`
  query GetScheduleDetail($scheduleId: Int!, $startDate: String!, $endDate: String!) {
    users {
      id
      fullName
    }
    teams {
      id
      name
      teamLead {
        id
      }
      members {
        id
        fullName
      }
    }
    projects {
      id
      name
      targetDate
      dri {
        id
        fullName
      }
      status
      color
      projectType
      isSystem
      members {
        id
        fullName
      }
    }
    scheduleAssignments(scheduleId: $scheduleId, startDate: $startDate, endDate: $endDate) {
      id
      scheduleId
      userId
      projectId
      weekStart
    }
  }
`;

const DELETE_SCHEDULE = gql`
  mutation DeleteSchedule($id: Int!) {
    deleteSchedule(id: $id)
  }
`;

export default function ScheduleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const scheduleId = Number(id);

  const { data: scheduleData, loading: scheduleLoading, error: scheduleError } = useQuery(GET_SCHEDULE, {
    variables: { id: scheduleId },
  });

  const schedule = scheduleData?.schedule;

  const { startDate, endDate } = useMemo(() => {
    if (!schedule) return { startDate: "", endDate: "" };
    return getQuarterRange(schedule.year, schedule.quarter);
  }, [schedule]);

  const weekStarts = useMemo(() => {
    if (!startDate || !endDate) return [];
    return getWeekStarts(startDate, endDate);
  }, [startDate, endDate]);

  const { data: detailData, loading: detailLoading, error: detailError } = useQuery(GET_SCHEDULE_DETAIL, {
    variables: { scheduleId, startDate, endDate },
    skip: !startDate || !endDate,
  });

  const unassignedUsers = useMemo(() => {
    if (!detailData) return [];
    const teamMemberIds = new Set<number>();
    for (const team of detailData.teams) {
      for (const member of team.members) {
        teamMemberIds.add(member.id);
      }
    }
    return detailData.users.filter((u: { id: number }) => !teamMemberIds.has(u.id));
  }, [detailData]);

  const totalSlots = useMemo(() => {
    if (!detailData || weekStarts.length === 0) return 0;
    const totalMembers = detailData.teams.reduce(
      (sum: number, t: { members: unknown[] }) => sum + t.members.length,
      0,
    ) + unassignedUsers.length;
    return totalMembers * weekStarts.length;
  }, [detailData, weekStarts, unassignedUsers]);

  const availableCapacity = useMemo(() => {
    if (totalSlots === 0 || !detailData) return null;
    const assigned = detailData.scheduleAssignments.length;
    return Math.round(((totalSlots - assigned) / totalSlots) * 100);
  }, [detailData, totalSlots]);

  const onCallGaps = useMemo(() => {
    if (!detailData || weekStarts.length === 0) return [];
    const onCallProject = detailData.projects.find(
      (p: { name: string; isSystem: boolean }) => p.name === "On Call" && p.isSystem
    );
    if (!onCallProject) return [];
    const onCallWeeks = new Set(
      detailData.scheduleAssignments
        .filter((a: { projectId: number }) => a.projectId === onCallProject.id)
        .map((a: { weekStart: string }) => a.weekStart)
    );
    return weekStarts.filter((w) => !onCallWeeks.has(w));
  }, [detailData, weekStarts]);

  const [deleteSchedule] = useMutation(DELETE_SCHEDULE, {
    refetchQueries: [{ query: GET_SCHEDULES }],
  });

  const handleExportCsv = useCallback(() => {
    if (!detailData || !schedule || weekStarts.length === 0) return;

    const projectMap = new Map<number, string>();
    for (const p of detailData.projects) {
      projectMap.set(p.id, p.name);
    }

    const assignmentMap = new Map<string, string>();
    for (const a of detailData.scheduleAssignments) {
      assignmentMap.set(`${a.userId}-${a.weekStart}`, projectMap.get(a.projectId) ?? "");
    }

    // Build a map from userId to team name
    const userTeamMap = new Map<number, string>();
    for (const team of detailData.teams) {
      for (const member of team.members) {
        userTeamMap.set(member.id, team.name);
      }
    }

    // Collect all users in team order with team header rows, then unassigned
    const rows: { name: string; team: string; id: number; isTeamHeader: boolean }[] = [];
    for (const team of detailData.teams) {
      rows.push({ name: team.name, team: "", id: -1, isTeamHeader: true });
      for (const member of team.members) {
        rows.push({ name: member.fullName, team: userTeamMap.get(member.id) ?? "", id: member.id, isTeamHeader: false });
      }
    }
    if (unassignedUsers.length > 0) {
      rows.push({ name: "Unassigned", team: "", id: -1, isTeamHeader: true });
      for (const u of unassignedUsers) {
        rows.push({ name: u.fullName, team: "", id: u.id, isTeamHeader: false });
      }
    }

    const escapeCsv = (val: string) => {
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const header = ["Name", "Team", ...weekStarts].map(escapeCsv).join(",");
    const lines = rows.map((row) => {
      if (row.isTeamHeader) {
        const cells = [row.name, row.team, ...weekStarts.map(() => "")];
        return cells.map(escapeCsv).join(",");
      }
      const cells = [row.name, row.team, ...weekStarts.map((w) => assignmentMap.get(`${row.id}-${w}`) ?? "")];
      return cells.map(escapeCsv).join(",");
    });

    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${schedule.name.replace(/\s+/g, "-")}-Q${schedule.quarter}-${schedule.year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [detailData, schedule, weekStarts, unassignedUsers]);

  if (scheduleLoading) return <div className="p-6">Loading schedule...</div>;
  if (scheduleError) return <div className="p-6 text-destructive">Error: {scheduleError.message}</div>;
  if (!schedule) return <div className="p-6">Schedule not found.</div>;

  async function handleDelete() {
    await deleteSchedule({ variables: { id: scheduleId } });
    navigate("/schedules");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link to="/schedules">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">{schedule.name}</h1>
        <div className="flex gap-1 ml-2">
          <EditScheduleDialog schedule={schedule} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon-xs">
                <Trash2 />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete schedule</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {schedule.name}? All assignments in this
                  schedule will also be deleted. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button variant="destructive" onClick={handleDelete}>
                    Delete
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        {detailData && (
          <Button variant="outline" size="sm" className="ml-auto" onClick={handleExportCsv}>
            <Download className="size-4 mr-1.5" />
            Export CSV
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Q{schedule.quarter} {schedule.year}
      </p>

      {availableCapacity !== null && (
        <p className="text-sm text-muted-foreground">
          Available capacity: <span className="font-medium text-foreground">{availableCapacity}%</span>
        </p>
      )}

      {onCallGaps.length > 0 && (
        <Alert className="bg-amber-50 dark:bg-amber-950">
          <TriangleAlert className="text-yellow-600" />
          <AlertTitle>On Call coverage gap</AlertTitle>
          <AlertDescription>
            {onCallGaps.length} {onCallGaps.length === 1 ? "week has" : "weeks have"} no one assigned to On Call
          </AlertDescription>
        </Alert>
      )}

      {detailLoading && <p>Loading grid...</p>}
      {detailError && <p className="text-destructive">Error: {detailError.message}</p>}
      {detailData && (
        <>
          <ScheduleGrid
            scheduleId={scheduleId}
            teams={detailData.teams}
            projects={detailData.projects}
            assignments={detailData.scheduleAssignments}
            weekStarts={weekStarts}
            unassignedUsers={unassignedUsers}
          />
          {totalSlots > 0 && (
            <ScheduleCapacityChart
              projects={detailData.projects}
              assignments={detailData.scheduleAssignments}
              totalSlots={totalSlots}
            />
          )}
        </>
      )}
    </div>
  );
}
