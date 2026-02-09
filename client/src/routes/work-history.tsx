import { useState } from "react";
import { useQuery, gql } from "@apollo/client";
import { getProjectColor } from "@/lib/project-colors";

const GET_WORK_HISTORY = gql`
  query GetWorkHistory($date: String!) {
    workHistory(date: $date) {
      id
      date
      user {
        id
        fullName
      }
      project {
        id
        name
        color
      }
      scheduleName
    }
  }
`;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function WorkHistory() {
  const [date, setDate] = useState(todayISO);
  const { loading, error, data } = useQuery(GET_WORK_HISTORY, {
    variables: { date },
  });

  const entries = data?.workHistory ?? [];

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Work History</h1>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-xs"
        />
      </div>

      {loading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}

      {!loading && !error && entries.length === 0 && (
        <p className="text-muted-foreground mt-4">
          No work history recorded for {date}.
        </p>
      )}

      {entries.length > 0 && (
        <div className="mt-4 rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">User</th>
                <th className="px-4 py-2 text-left font-medium">Project</th>
                <th className="px-4 py-2 text-left font-medium">Schedule</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry: any) => {
                const color = getProjectColor(entry.project.color);
                return (
                  <tr key={entry.id} className="border-b last:border-b-0">
                    <td className="px-4 py-2">{entry.user.fullName}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block rounded-md border px-2 py-0.5 text-xs font-medium ${color.chipBg}`}
                      >
                        {entry.project.name}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {entry.scheduleName}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
