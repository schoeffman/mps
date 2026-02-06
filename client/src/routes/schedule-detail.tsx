import { useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, gql } from "@apollo/client";
import { ArrowLeft, Trash2 } from "lucide-react";
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

  const totalSlots = useMemo(() => {
    if (!detailData || weekStarts.length === 0) return 0;
    const totalMembers = detailData.teams.reduce(
      (sum: number, t: { members: unknown[] }) => sum + t.members.length,
      0,
    );
    return totalMembers * weekStarts.length;
  }, [detailData, weekStarts]);

  const availableCapacity = useMemo(() => {
    if (totalSlots === 0 || !detailData) return null;
    const assigned = detailData.scheduleAssignments.length;
    return Math.round(((totalSlots - assigned) / totalSlots) * 100);
  }, [detailData, totalSlots]);

  const [deleteSchedule] = useMutation(DELETE_SCHEDULE, {
    refetchQueries: [{ query: GET_SCHEDULES }],
  });

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
      </div>

      <p className="text-sm text-muted-foreground">
        Q{schedule.quarter} {schedule.year}
      </p>

      {availableCapacity !== null && (
        <p className="text-sm text-muted-foreground">
          Available capacity: <span className="font-medium text-foreground">{availableCapacity}%</span>
        </p>
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
            startDate={startDate}
            endDate={endDate}
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
