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

function monthsRemaining(dateStr: string, limitMonths: number): number {
  const start = new Date(dateStr);
  const now = new Date();
  const elapsed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  return limitMonths - elapsed;
}

export default function Performance() {
  const { data: usersData, loading: usersLoading } = useQuery(GET_USERS);
  const { data: limitsData, loading: limitsLoading } = useQuery(JOB_LEVEL_LIMITS);

  if (usersLoading || limitsLoading) return <p>Loading...</p>;

  const limits: { jobLevel: string; limitMonths: number }[] = limitsData?.jobLevelLimits ?? [];
  const limitMap = new Map(limits.filter((l) => l.limitMonths > 0).map((l) => [l.jobLevel, l.limitMonths]));

  const users: { id: number; fullName: string; jobLevel: string; levelStartDate: string | null }[] =
    usersData?.users ?? [];

  const levelOrder = ["Junior", "Mid", "Senior", "Staff", "Principal"];
  const tracked = users.filter((u) => limitMap.has(u.jobLevel));
  const groups = levelOrder
    .filter((level) => tracked.some((u) => u.jobLevel === level))
    .map((level) => ({ level, users: tracked.filter((u) => u.jobLevel === level) }));

  return (
    <>
      <h1 className="text-2xl font-semibold mb-6">Performance</h1>

      {limitMap.size === 0 ? (
        <p className="text-sm text-muted-foreground">
          No time in level limits are configured. Set limits in{" "}
          <Link to="/space-settings" className="underline">Space Settings</Link>.
        </p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No users at job levels with a configured limit.</p>
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map(({ level, users: groupUsers }) => {
            const limit = limitMap.get(level)!;
            return (
              <div key={level}>
                <h2 className="text-lg font-semibold mb-3">{level}</h2>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Level Since</TableHead>
                      <TableHead>Remaining Time</TableHead>
                      <TableHead>Limit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupUsers.map((user) => {
                      const remaining = user.levelStartDate ? monthsRemaining(user.levelStartDate, limit) : null;
                      const overLimit = remaining !== null && remaining < 0;
                      const nearLimit = remaining !== null && remaining >= 0 && remaining <= 12;
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            <Link to={`/users/${user.id}`} className="hover:underline">
                              {user.fullName}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {user.levelStartDate
                              ? new Date(user.levelStartDate).toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" })
                              : <span className="text-muted-foreground">Not set</span>}
                          </TableCell>
                          <TableCell className={overLimit ? "text-destructive font-medium" : nearLimit ? "text-yellow-500 font-medium" : ""}>
                            {remaining !== null
                              ? `${remaining} month${Math.abs(remaining) === 1 ? "" : "s"}`
                              : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell>{limit} month{limit === 1 ? "" : "s"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
