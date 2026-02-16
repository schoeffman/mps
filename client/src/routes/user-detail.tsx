import { useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, gql } from "@apollo/client";
import { GET_USERS } from "@/routes/users";
import { ArrowLeft, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditUserDialog } from "@/components/edit-user-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const GET_USER = gql`
  query GetUser($id: Int!) {
    user(id: $id) {
      id
      fullName
      craftAbility
      jobLevel
      craftFocus
      createdAt
    }
  }
`;

const GET_USER_SCHEDULE = gql`
  query GetUserSchedule($userId: Int!) {
    userSchedule(userId: $userId) {
      project {
        id
        name
        color
      }
      dateRanges {
        start
        end
        scheduleName
        scheduleId
      }
    }
  }
`;

const GET_USER_WORK_HISTORY = gql`
  query GetUserWorkHistory($userId: Int!, $limit: Int) {
    userWorkHistory(userId: $userId, limit: $limit) {
      id
      date
      project {
        id
        name
        color
      }
      scheduleName
    }
  }
`;

const DELETE_USER = gql`
  mutation DeleteUser($id: Int!) {
    deleteUser(id: $id)
  }
`;

const enumLabels: Record<string, string> = {
  ProductManagement: "Product Management",
  DataScience: "Data Science",
  NotApplicable: "Not Applicable",
};

function formatEnum(value: string) {
  return enumLabels[value] ?? value;
}

function formatDateRange(start: string, end: string) {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (start === end) {
    return s.toLocaleDateString(undefined, { ...opts, year: "numeric" });
  }
  if (s.getFullYear() === e.getFullYear()) {
    return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, { ...opts, year: "numeric" })}`;
  }
  return `${s.toLocaleDateString(undefined, { ...opts, year: "numeric" })} – ${e.toLocaleDateString(undefined, { ...opts, year: "numeric" })}`;
}

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loading, error, data } = useQuery(GET_USER, {
    variables: { id: Number(id) },
  });
  const { data: scheduleData } = useQuery(GET_USER_SCHEDULE, {
    variables: { userId: Number(id) },
  });
  const { data: workHistoryData } = useQuery(GET_USER_WORK_HISTORY, {
    variables: { userId: Number(id), limit: 10 },
  });
  const [deleteUser] = useMutation(DELETE_USER, {
    refetchQueries: [{ query: GET_USERS }],
  });

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  if (!data?.user) return <p>User not found.</p>;

  const { user } = data;

  async function handleDelete() {
    try {
      await deleteUser({ variables: { id: Number(id) } });
      navigate("/users");
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link to="/users">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">{user.fullName}</h1>
        <div className="flex gap-1 ml-2">
          <EditUserDialog user={user} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon-xs">
                <Trash2 />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete user</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {user.fullName}? This action cannot be undone.
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

      <div className="text-sm text-muted-foreground space-y-1">
        <p>Craft Ability: {formatEnum(user.craftAbility)}</p>
        <p>Job Level: {user.jobLevel}</p>
        <p>Craft Focus: {formatEnum(user.craftFocus)}</p>
      </div>

      <UpcomingAlerts entries={scheduleData?.userSchedule ?? []} />

      <section className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Upcoming Schedule</h2>
        {scheduleData?.userSchedule?.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Dates</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scheduleData.userSchedule.flatMap(
                (entry: { project: { id: number; name: string; color: string }; dateRanges: { start: string; end: string; scheduleName: string; scheduleId: number }[] }) =>
                  entry.dateRanges.map((range: { start: string; end: string; scheduleName: string; scheduleId: number }, i: number) => (
                    <TableRow key={`${entry.project.id}-${i}`}>
                      {i === 0 ? (
                        <TableCell rowSpan={entry.dateRanges.length} className="font-medium align-top">
                          <Link to={`/projects/${entry.project.id}`} className="hover:underline">
                            {entry.project.name}
                          </Link>
                        </TableCell>
                      ) : null}
                      <TableCell>
                        <Link to={`/schedules/${range.scheduleId}`} className="hover:underline">
                          {range.scheduleName}
                        </Link>
                      </TableCell>
                      <TableCell>{formatDateRange(range.start, range.end)}</TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No upcoming schedule assignments.</p>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Recent Work History</h2>
        {workHistoryData?.userWorkHistory?.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workHistoryData.userWorkHistory.map((entry: { id: number; date: string; project: { id: number; name: string }; scheduleName: string }) => (
                <TableRow key={entry.id}>
                  <TableCell>{new Date(entry.date + "T00:00:00").toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">
                    <Link to={`/projects/${entry.project.id}`} className="hover:underline">
                      {entry.project.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{entry.scheduleName}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No work history recorded.</p>
        )}
      </section>
    </>
  );
}

const HIGHLIGHT_PROJECTS = new Set(["On Call", "Leave (Standard)", "Leave (Extended)"]);

interface ScheduleEntry {
  project: { id: number; name: string; color: string };
  dateRanges: { start: string; end: string; scheduleName: string; scheduleId: number }[];
}

function UpcomingAlerts({ entries }: { entries: ScheduleEntry[] }) {
  const alerts = useMemo(() => {
    if (entries.length === 0) return [];
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() + 31);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    const todayStr = now.toISOString().split("T")[0];

    const results: { projectName: string; start: string; end: string }[] = [];
    for (const entry of entries) {
      if (!HIGHLIGHT_PROJECTS.has(entry.project.name)) continue;
      for (const range of entry.dateRanges) {
        // Range overlaps the next 31 days if it starts before cutoff and ends on or after today
        if (range.start <= cutoffStr && range.end >= todayStr) {
          results.push({ projectName: entry.project.name, start: range.start, end: range.end });
        }
      }
    }
    return results;
  }, [entries]);

  if (alerts.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      {alerts.map((alert, i) => (
        <div key={i} className="flex items-center gap-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-4 py-2.5 text-sm">
          <AlertTriangle className="size-4 text-amber-500 shrink-0" />
          <span>
            <span className="font-medium">{alert.projectName}</span>
            {" "}— {formatDateRange(alert.start, alert.end)}
          </span>
        </div>
      ))}
    </div>
  );
}
