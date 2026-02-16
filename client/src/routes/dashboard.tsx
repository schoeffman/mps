import { useQuery, gql } from "@apollo/client";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatWeekHeader } from "@/lib/schedule-utils";

const GET_DASHBOARD_DATA = gql`
  query GetDashboardData($startDate: String!, $endDate: String!, $weekStart: String!) {
    leaveAssignments(startDate: $startDate, endDate: $endDate) {
      userId
      userName
      projectName
      weekStart
    }
    onCallAssignments(startDate: $startDate, endDate: $endDate) {
      userId
      userName
      weekStart
    }
    scheduledProjects(weekStart: $weekStart) {
      projectId
      projectName
      color
      status
      assignees
      lastUpdateDate
      atlassianStatus
    }
  }
`;

function getMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function daysAgo(dateStr: string): number {
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export default function Dashboard() {
  const today = new Date();
  const monday = getMonday(today);

  const nextMonday = new Date(monday);
  nextMonday.setDate(nextMonday.getDate() + 7);
  const endDate = new Date(nextMonday);
  endDate.setDate(endDate.getDate() + 31);

  const currentWeekStr = formatDate(monday);
  const nextWeekStr = formatDate(nextMonday);

  const { loading, error, data } = useQuery(GET_DASHBOARD_DATA, {
    variables: {
      startDate: currentWeekStr,
      endDate: formatDate(endDate),
      weekStart: currentWeekStr,
    },
  });

  // Leave data
  const leaveAssignments = data?.leaveAssignments ?? [];
  const leaveThisWeek = leaveAssignments.filter(
    (a: { weekStart: string }) => a.weekStart === currentWeekStr,
  );
  const leaveUpcoming = leaveAssignments.filter(
    (a: { weekStart: string }) => a.weekStart > currentWeekStr,
  );
  const leaveByWeek = new Map<string, typeof leaveUpcoming>();
  for (const a of leaveUpcoming) {
    const list = leaveByWeek.get(a.weekStart) ?? [];
    list.push(a);
    leaveByWeek.set(a.weekStart, list);
  }
  const leaveSortedWeeks = [...leaveByWeek.keys()].sort();

  // On-call data
  const onCallAssignments = data?.onCallAssignments ?? [];
  const onCallThisWeek = onCallAssignments.filter(
    (a: { weekStart: string }) => a.weekStart === currentWeekStr,
  );
  const onCallNextWeek = onCallAssignments.filter(
    (a: { weekStart: string }) => a.weekStart === nextWeekStr,
  );

  // Scheduled projects
  const scheduledProjects = data?.scheduledProjects ?? [];

  return (
    <>
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {loading && <p className="text-muted-foreground">Loading...</p>}
      {error && <p className="text-destructive">Error: {error.message}</p>}

      {data && (
        <div className="grid gap-6 mt-4">
          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>On Call This Week</CardTitle>
              </CardHeader>
              <CardContent>
                {onCallThisWeek.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No one is on call this week.</p>
                ) : (
                  <ul className="-mx-6">
                    {onCallThisWeek.map((a: { userId: number; userName: string }, i: number) => (
                      <li key={a.userId} className={`px-6 py-1.5 text-sm font-medium ${i % 2 === 1 ? "bg-muted/50" : ""}`}>{a.userName}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>On Call Next Week</CardTitle>
              </CardHeader>
              <CardContent>
                {onCallNextWeek.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No one is on call next week.</p>
                ) : (
                  <ul className="-mx-6">
                    {onCallNextWeek.map((a: { userId: number; userName: string }, i: number) => (
                      <li key={a.userId} className={`px-6 py-1.5 text-sm font-medium ${i % 2 === 1 ? "bg-muted/50" : ""}`}>{a.userName}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>On Leave This Week</CardTitle>
              </CardHeader>
              <CardContent>
                {leaveThisWeek.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No one is on leave this week.</p>
                ) : (
                  <ul className="-mx-6">
                    {leaveThisWeek.map((a: { userId: number; userName: string; projectName: string }, i: number) => (
                      <li key={a.userId} className={`px-6 py-1.5 flex items-center justify-between text-sm ${i % 2 === 1 ? "bg-muted/50" : ""}`}>
                        <span className="font-medium">{a.userName}</span>
                        <span className="text-muted-foreground">{a.projectName}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Leave</CardTitle>
              </CardHeader>
              <CardContent>
                {leaveSortedWeeks.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No upcoming leave in the next 31 days.</p>
                ) : (
                  <div className="-mx-6">
                    {(() => {
                      let idx = 0;
                      return leaveSortedWeeks.map((week) => (
                        <div key={week}>
                          <h3 className="text-sm font-medium text-muted-foreground px-6 pt-3 pb-1 first:pt-0">
                            Week of {formatWeekHeader(week)}
                          </h3>
                          <ul>
                            {leaveByWeek.get(week)!.map((a: { userId: number; userName: string; projectName: string }) => {
                              const row = idx++;
                              return (
                                <li key={a.userId} className={`px-6 py-1.5 flex items-center justify-between text-sm ${row % 2 === 1 ? "bg-muted/50" : ""}`}>
                                  <span className="font-medium">{a.userName}</span>
                                  <span className="text-muted-foreground">{a.projectName}</span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Projects Scheduled This Week</CardTitle>
            </CardHeader>
            <CardContent>
              {scheduledProjects.length === 0 ? (
                <p className="text-muted-foreground text-sm">No projects scheduled this week.</p>
              ) : (
                <ul className="-mx-6">
                  {scheduledProjects.map((p: { projectId: number; projectName: string; color: string; status: string; assignees: string[]; lastUpdateDate: string | null; atlassianStatus: string | null }, i: number) => {
                    const updateAge = p.lastUpdateDate ? daysAgo(p.lastUpdateDate) : null;
                    return (
                      <li key={p.projectId} className={`px-6 py-2 flex items-start justify-between gap-4 text-sm ${i % 2 === 1 ? "bg-muted/50" : ""}`}>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block size-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: p.color }}
                            />
                            <Link to={`/projects/${p.projectId}`} className="font-medium hover:underline">{p.projectName}</Link>
                            <Badge variant="outline" className="text-xs">{p.status}</Badge>
                          </div>
                          <p className="text-muted-foreground mt-0.5 ml-[18px]">
                            {p.assignees.join(", ")}
                          </p>
                        </div>
                        {updateAge !== null && (
                          <div className="text-right shrink-0">
                            <span className={`text-xs whitespace-nowrap ${p.status === "Complete" ? "text-muted-foreground" : updateAge > 7 ? "text-red-500 font-medium" : updateAge > 6 ? "text-yellow-500 font-medium" : "text-muted-foreground"}`}>
                              Updated {updateAge === 0 ? "today" : updateAge === 1 ? "1 day ago" : `${updateAge} days ago`}
                            </span>
                            {p.atlassianStatus && (
                              <p className="text-xs text-muted-foreground">{p.atlassianStatus}</p>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
