import { useState } from "react";
import { useMutation, useQuery, gql } from "@apollo/client";
import { Pencil } from "lucide-react";
import { GET_PROJECTS } from "@/routes/projects";
import { GET_USERS } from "@/routes/users";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const UPDATE_PROJECT = gql`
  mutation UpdateProject($id: Int!, $input: UpdateProjectInput!) {
    updateProject(id: $id, input: $input) {
      id
      name
      targetDate
      dri {
        id
        fullName
      }
      status
      members {
        id
        fullName
      }
      createdAt
    }
  }
`;

interface EditProjectDialogProps {
  project: {
    id: number;
    name: string;
    targetDate: string;
    dri: { id: number; fullName: string };
    status: string;
    members: { id: number; fullName: string }[];
  };
}

export function EditProjectDialog({ project }: EditProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(project.name);
  const [targetDate, setTargetDate] = useState(project.targetDate);
  const [status, setStatus] = useState(project.status);
  const [memberIds, setMemberIds] = useState<number[]>(project.members.map((m) => m.id));
  const [driId, setDriId] = useState<string>(String(project.dri.id));

  const { data: usersData } = useQuery(GET_USERS);
  const [updateProject, { loading }] = useMutation(UPDATE_PROJECT, {
    refetchQueries: [{ query: GET_PROJECTS }],
  });

  const allUsers: { id: number; fullName: string }[] = usersData?.users ?? [];

  function resetForm() {
    setName(project.name);
    setTargetDate(project.targetDate);
    setStatus(project.status);
    setMemberIds(project.members.map((m) => m.id));
    setDriId(String(project.dri.id));
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      resetForm();
    }
    setOpen(nextOpen);
  }

  function toggleMember(userId: number) {
    setMemberIds((prev) => {
      const next = prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId];
      if (!next.includes(Number(driId))) {
        setDriId("");
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await updateProject({
      variables: {
        id: project.id,
        input: { name, targetDate, driId: Number(driId), status, memberIds },
      },
    });
    setOpen(false);
  }

  const selectedMembers = allUsers.filter((u) => memberIds.includes(u.id));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-xs">
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="edit-projectName">Project Name</Label>
            <Input
              id="edit-projectName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-targetDate">Target Date</Label>
            <Input
              id="edit-targetDate"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="edit-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Explore">Explore</SelectItem>
                <SelectItem value="Make">Make</SelectItem>
                <SelectItem value="Complete">Complete</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Team Members</Label>
            <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-2">
              {allUsers.map((user) => (
                <label key={user.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={memberIds.includes(user.id)}
                    onCheckedChange={() => toggleMember(user.id)}
                  />
                  {user.fullName}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-dri">DRI (Directly Responsible Individual)</Label>
            <Select value={driId} onValueChange={setDriId}>
              <SelectTrigger id="edit-dri">
                <SelectValue placeholder="Select DRI" />
              </SelectTrigger>
              <SelectContent>
                {selectedMembers.map((user) => (
                  <SelectItem key={user.id} value={String(user.id)}>
                    {user.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={loading || !name || !targetDate || !driId || memberIds.length === 0}
          >
            {loading ? "Saving..." : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
