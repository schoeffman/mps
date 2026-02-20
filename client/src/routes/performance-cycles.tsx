import { useQuery, gql } from "@apollo/client";
import { Link } from "react-router-dom";
import { AddPerformanceCycleDialog } from "@/components/add-performance-cycle-dialog";
import { EditPerformanceCycleDialog } from "@/components/edit-performance-cycle-dialog";
import { DeletePerformanceCycleButton } from "@/components/delete-performance-cycle-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const GET_PERFORMANCE_CYCLES = gql`
  query GetPerformanceCycles {
    performanceCycles {
      id
      title
      cycleMonth
      users {
        id
        fullName
      }
      createdAt
    }
  }
`;

function formatCycleMonth(cycleMonth: string) {
  return new Date(cycleMonth + "-01").toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function PerformanceCycles() {
  const { loading, error, data } = useQuery(GET_PERFORMANCE_CYCLES);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Performance Cycles</h1>
        <AddPerformanceCycleDialog />
      </div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      {data && (
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Month</TableHead>
              <TableHead>Users</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.performanceCycles.map(
              (cycle: {
                id: number;
                title: string;
                cycleMonth: string;
                users: { id: number; fullName: string }[];
              }) => (
                <TableRow key={cycle.id}>
                  <TableCell className="font-medium">
                    <Link
                      to={`/users/performance-cycles/${cycle.id}`}
                      className="hover:underline"
                    >
                      {cycle.title}
                    </Link>
                  </TableCell>
                  <TableCell>{formatCycleMonth(cycle.cycleMonth)}</TableCell>
                  <TableCell>{cycle.users.length}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <EditPerformanceCycleDialog cycle={cycle} />
                      <DeletePerformanceCycleButton
                        cycleId={cycle.id}
                        cycleTitle={cycle.title}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ),
            )}
          </TableBody>
        </Table>
      )}
    </>
  );
}
