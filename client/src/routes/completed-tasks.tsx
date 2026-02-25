import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, gql } from "@apollo/client";
import { ArrowLeft, ChevronLeft, ChevronRight, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const GET_COMPLETED_TASKS = gql`
  query GetCompletedTasks($page: Int) {
    completedTasks(page: $page) {
      tasks {
        id
        title
        description
        createdAt
      }
      total
    }
  }
`;

const MARK_INCOMPLETE = gql`
  mutation MarkIncomplete($id: Int!, $status: String!) {
    updateTaskStatus(id: $id, status: $status) {
      id
      status
    }
  }
`;

const PAGE_SIZE = 20;

export default function CompletedTasks() {
  const [page, setPage] = useState(1);

  const { data, loading } = useQuery(GET_COMPLETED_TASKS, {
    variables: { page },
    fetchPolicy: "network-only",
  });
  const [markIncomplete] = useMutation(MARK_INCOMPLETE, {
    refetchQueries: [{ query: GET_COMPLETED_TASKS, variables: { page } }],
  });

  const tasks = data?.completedTasks.tasks ?? [];
  const total = data?.completedTasks.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <div className="flex items-center gap-3">
        <Link to="/tasks">
          <Button variant="ghost" size="sm" className="-ml-2">
            <ArrowLeft className="size-4 mr-1" />
            Back to Tasks
          </Button>
        </Link>
      </div>

      <h1 className="text-2xl font-semibold mt-2">Completed Tasks</h1>

      {loading && <p className="text-muted-foreground mt-4">Loading...</p>}

      {!loading && tasks.length === 0 && (
        <p className="text-muted-foreground mt-4">No completed tasks yet.</p>
      )}

      {tasks.length > 0 && (
        <>
          <div className="mt-4 rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">Title</th>
                  <th className="px-4 py-2 text-left font-medium">Description</th>
                  <th className="px-4 py-2 text-left font-medium">Completed</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {tasks.map((task: { id: number; title: string; description: string; createdAt: string }, i: number) => (
                  <tr key={task.id} className={`border-b last:border-b-0 ${i % 2 === 1 ? "bg-muted/30" : ""}`}>
                    <td className="px-4 py-2 font-medium">{task.title}</td>
                    <td className="px-4 py-2 text-muted-foreground">{task.description || "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                      {new Date(task.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-2 py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markIncomplete({ variables: { id: task.id, status: "New" } })}
                      >
                        <Undo2 className="size-4 mr-1" />
                        Reopen
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
