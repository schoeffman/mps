import { Link } from "react-router-dom";
import { useQuery, gql } from "@apollo/client";
import { GET_USERS } from "@/routes/users";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const JOB_LEVEL_LIMITS = gql`
  query JobLevelLimitsPerf {
    jobLevelLimits {
      jobLevel
      limitMonths
    }
  }
`;

function monthsSince(dateStr: string): number {
  const start = new Date(dateStr);
  const now = new Date();
  return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
}

export default function Performance() {
  const { data: usersData, loading: usersLoading } = useQuery(GET_USERS);
  const { data: limitsData, loading: limitsLoading } = useQuery(JOB_LEVEL_LIMITS);

  if (usersLoading || limitsLoading) return <p>Loading...</p>;

  const limits: { jobLevel: string; limitMonths: number }[] = limitsData?.jobLevelLimits ?? [];
  const limitMap = new Map(limits.filter((l) => l.limitMonths > 0).map((l) => [l.jobLevel, l.limitMonths]));

  const users: { id: number; fullName: string; jobLevel: string; levelStartDate: string | null }[] =
    usersData?.users ?? [];

  const tracked = users.filter((u) => limitMap.has(u.jobLevel));

  return (
    <>
      <h1 className="text-2xl font-semibold mb-6">Performance</h1>

      {limitMap.size === 0 ? (
        <p className="text-sm text-muted-foreground">
          No time in level limits are configured. Set limits in{" "}
          <Link to="/space-settings" className="underline">Space Settings</Link>.
        </p>
      ) : tracked.length === 0 ? (
        <p className="text-sm text-muted-foreground">No users at job levels with a configured limit.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Job Level</TableHead>
              <TableHead>Level Since</TableHead>
              <TableHead>Time at Level</TableHead>
              <TableHead>Limit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tracked.map((user) => {
              const limit = limitMap.get(user.jobLevel)!;
              const months = user.levelStartDate ? monthsSince(user.levelStartDate) : null;
              const overLimit = months !== null && months > limit;
              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <Link to={`/users/${user.id}`} className="hover:underline">
                      {user.fullName}
                    </Link>
                  </TableCell>
                  <TableCell>{user.jobLevel}</TableCell>
                  <TableCell>
                    {user.levelStartDate
                      ? new Date(user.levelStartDate).toLocaleDateString()
                      : <span className="text-muted-foreground">Not set</span>}
                  </TableCell>
                  <TableCell className={overLimit ? "text-destructive font-medium" : ""}>
                    {months !== null ? `${months} month${months === 1 ? "" : "s"}` : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>{limit} month{limit === 1 ? "" : "s"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </>
  );
}
