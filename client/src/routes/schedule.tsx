import { useQuery, gql } from "@apollo/client";
import { useMemo } from "react";
import { getQuarterRange, getWeekStarts } from "@/lib/schedule-utils";
import { ScheduleGrid } from "@/components/schedule-grid";

const GET_SCHEDULE_DATA = gql`
  query GetScheduleData($startDate: String!, $endDate: String!) {
    teams {
      id
      name
      members {
        id
        fullName
      }
    }
    projects {
      id
      name
    }
    scheduleAssignments(startDate: $startDate, endDate: $endDate) {
      id
      userId
      projectId
      weekStart
    }
  }
`;

export default function Schedule() {
  const now = useMemo(() => new Date(), []);
  const { startDate, endDate } = useMemo(() => getQuarterRange(now), [now]);
  const weekStarts = useMemo(() => getWeekStarts(startDate, endDate), [startDate, endDate]);

  const quarterLabel = useMemo(() => {
    const q = Math.floor(now.getMonth() / 3) + 1;
    return `Q${q} ${now.getFullYear()}`;
  }, [now]);

  const { data, loading, error } = useQuery(GET_SCHEDULE_DATA, {
    variables: { startDate, endDate },
  });

  if (loading) return <div className="p-6">Loading schedule...</div>;
  if (error) return <div className="p-6 text-destructive">Error: {error.message}</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Schedule — {quarterLabel}</h1>
      <ScheduleGrid
        teams={data.teams}
        projects={data.projects}
        assignments={data.scheduleAssignments}
        weekStarts={weekStarts}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  );
}
