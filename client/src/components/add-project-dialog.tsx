import { useState } from "react";
import { useMutation, useQuery, gql } from "@apollo/client";
import { GET_PROJECTS } from "@/routes/projects";
import { GET_USERS } from "@/routes/users";
import { PROJECT_COLOR_OPTIONS } from "@/lib/project-colors";
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

const CREATE_PROJECT = gql`
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      id
      name
      targetDate
      dri {
        id
        fullName
      }
      status
      color
      members {
        id
        fullName
      }
      createdAt
    }
  }
`;

export function AddProjectDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [status, setStatus] = useState("Explore");
  const [color, setColor] = useState("blue");
  const [memberIds, setMemberIds] = useState<number[]>([]);
  const [driId, setDriId] = useState<string>("");

  const { data: usersData } = useQuery(GET_USERS);
  const [createProject, { loading }] = useMutation(CREATE_PROJECT, {
    refetchQueries: [{ query: GET_PROJECTS }],
  });

  const allUsers: { id: number; fullName: string }[] = usersData?.users ?? [];

  function resetForm() {
    setName("");
    setTargetDate("");
    setStatus("Explore");
    setColor("blue");
    setMemberIds([]);
    setDriId("");
  }

  function toggleMember(userId: number) {
    setMemberIds((prev) => {
      const next = prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId];
      // If unchecking the current DRI, clear DRI selection
      if (!next.includes(Number(driId))) {
        setDriId("");
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createProject({
      variables: {
        input: { name, targetDate, driId: Number(driId), status, color, memberIds },
      },
    });
    resetForm();
    setOpen(false);
  }

  const selectedMembers = allUsers.filter((u) => memberIds.includes(u.id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Project</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="projectName">Project Name</Label>
            <Input
              id="projectName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="targetDate">Target Date</Label>
            <Input
              id="targetDate"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
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
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  title={opt.label}
                  onClick={() => setColor(opt.key)}
                  className={`w-7 h-7 rounded-md border-2 transition-all cursor-pointer ${opt.chipBg} ${
                    color === opt.key ? "ring-2 ring-primary ring-offset-1 scale-110" : "opacity-70 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
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
            <Label htmlFor="dri">DRI (Directly Responsible Individual)</Label>
            <Select value={driId} onValueChange={setDriId}>
              <SelectTrigger id="dri">
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
            {loading ? "Creating..." : "Create Project"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
