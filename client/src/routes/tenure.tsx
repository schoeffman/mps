import { Fragment } from "react";
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

export default function Tenure() {
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
    .map((level) => {
      const limit = limitMap.get(level)!;
      return {
        level,
        users: tracked
          .filter((u) => u.jobLevel === level)
          .sort((a, b) => {
            const ra = a.levelStartDate ? monthsRemaining(a.levelStartDate, limit) : Infinity;
            const rb = b.levelStartDate ? monthsRemaining(b.levelStartDate, limit) : Infinity;
            return ra - rb;
          }),
      };
    });

  return (
    <>
      <h1 className="text-2xl font-semibold mb-6">Tenure</h1>

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
                <h2 className="text-lg font-semibold mb-3">{level} <span className="text-sm font-normal text-muted-foreground">({limit} month{limit === 1 ? "" : "s"})</span></h2>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Level Since</TableHead>
                      <TableHead>Remaining Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupUsers.map((user) => {
                      const remaining = user.levelStartDate ? monthsRemaining(user.levelStartDate, limit) : null;
                      const overLimit = remaining !== null && remaining < 0;
                      const nearLimit = remaining !== null && remaining >= 0 && remaining <= 12;
                      const elapsed = remaining !== null ? limit - remaining : null;
                      const pct = elapsed !== null ? Math.min(Math.max(elapsed / limit * 100, 0), 100) : null;
                      const ticks = user.levelStartDate
                        ? Array.from({ length: limit - 1 }, (_, i) => i + 1)
                            .filter((m) => {
                              const month = (new Date(user.levelStartDate!).getMonth() + m) % 12;
                              return month === 0 || month === 6;
                            })
                            .map((m) => (m / limit) * 100)
                        : [];
                      return (
                        <Fragment key={user.id}>
                          <TableRow className="border-b-0">
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
                          </TableRow>
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={3} className="pt-2 pb-6">
                              <div className="relative h-2 w-full">
                                <div className="absolute inset-0 rounded-full bg-muted" />
                                {pct !== null && (
                                  <div
                                    className={`absolute inset-y-0 left-0 rounded-full ${overLimit ? "bg-destructive" : nearLimit ? "bg-yellow-500" : "bg-green-500"}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                )}
                                {ticks.map((tickPct) => (
                                  <div
                                    key={tickPct}
                                    className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-black/50"
                                    style={{ left: `${tickPct}%` }}
                                  />
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        </Fragment>
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
