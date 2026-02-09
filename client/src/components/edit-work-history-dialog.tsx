import { useState } from "react";
import { useMutation, useQuery, gql } from "@apollo/client";
import { Pencil } from "lucide-react";
import { GET_PROJECTS } from "@/routes/projects";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const UPDATE_WORK_HISTORY_ENTRY = gql`
  mutation UpdateWorkHistoryEntry($id: Int!, $projectId: Int!) {
    updateWorkHistoryEntry(id: $id, projectId: $projectId) {
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

interface EditWorkHistoryDialogProps {
  entry: {
    id: number;
    date: string;
    user: { id: number; fullName: string };
    project: { id: number; name: string };
    scheduleName: string;
  };
}

export function EditWorkHistoryDialog({ entry }: EditWorkHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState<string>(String(entry.project.id));

  const { data: projectsData } = useQuery(GET_PROJECTS);
  const [updateEntry, { loading }] = useMutation(UPDATE_WORK_HISTORY_ENTRY, {
    refetchQueries: ["GetWorkHistory", "GetWorkHistoryDates"],
  });

  const allProjects: { id: number; name: string }[] = projectsData?.projects ?? [];

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setProjectId(String(entry.project.id));
    }
    setOpen(nextOpen);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await updateEntry({
      variables: { id: entry.id, projectId: Number(projectId) },
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-xs">
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Work History Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="grid gap-1">
            <Label className="text-muted-foreground">User</Label>
            <p className="text-sm">{entry.user.fullName}</p>
          </div>

          <div className="grid gap-1">
            <Label className="text-muted-foreground">Date</Label>
            <p className="text-sm">{entry.date}</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-wh-project">Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger id="edit-wh-project">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {allProjects.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={loading || !projectId}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
