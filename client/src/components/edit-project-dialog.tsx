import { useState } from "react";
import { useMutation, useQuery, gql } from "@apollo/client";
import { Pencil } from "lucide-react";
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
      color
      projectType
      jiraProjectKey
      createdAt
    }
  }
`;

const JIRA_CONFIG = gql`
  query JiraConfigCheck {
    jiraConfig {
      id
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
    color: string;
    projectType: string;
    jiraProjectKey?: string | null;
  };
  trigger?: React.ReactNode;
}

export function EditProjectDialog({ project, trigger }: EditProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(project.name);
  const [targetDate, setTargetDate] = useState(project.targetDate);
  const [status, setStatus] = useState(project.status);
  const [color, setColor] = useState(project.color);
  const [projectType, setProjectType] = useState(project.projectType);
  const [driId, setDriId] = useState<string>(String(project.dri.id));
  const [jiraProjectKey, setJiraProjectKey] = useState(project.jiraProjectKey ?? "");

  const { data: usersData } = useQuery(GET_USERS);
  const { data: jiraConfigData } = useQuery(JIRA_CONFIG);
  const [updateProject, { loading }] = useMutation(UPDATE_PROJECT, {
    refetchQueries: [{ query: GET_PROJECTS }, "GetScheduleDetail"],
  });

  const allUsers: { id: number; fullName: string }[] = usersData?.users ?? [];

  function resetForm() {
    setName(project.name);
    setTargetDate(project.targetDate);
    setStatus(project.status);
    setColor(project.color);
    setProjectType(project.projectType);
    setDriId(String(project.dri.id));
    setJiraProjectKey(project.jiraProjectKey ?? "");
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      resetForm();
    }
    setOpen(nextOpen);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await updateProject({
      variables: {
        id: project.id,
        input: { name, targetDate, driId: Number(driId), status, color, projectType, jiraProjectKey: jiraProjectKey.trim() || null },
      },
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon-xs">
            <Pencil />
          </Button>
        )}
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
                <SelectItem value="Cancelled">Cancelled</SelectItem>
                <SelectItem value="Paused">Paused</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-projectType">Type</Label>
            <Select value={projectType} onValueChange={setProjectType}>
              <SelectTrigger id="edit-projectType">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FeatureDevelopment">Feature Development</SelectItem>
                <SelectItem value="Maintenance">Maintenance</SelectItem>
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
            <Label htmlFor="edit-dri">DRI (Directly Responsible Individual)</Label>
            <Select value={driId} onValueChange={setDriId}>
              <SelectTrigger id="edit-dri">
                <SelectValue placeholder="Select DRI" />
              </SelectTrigger>
              <SelectContent>
                {allUsers.map((user) => (
                  <SelectItem key={user.id} value={String(user.id)}>
                    {user.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {jiraConfigData?.jiraConfig && (
            <div className="grid gap-2">
              <Label htmlFor="edit-jiraProjectKey">Jira Project Key</Label>
              <Input
                id="edit-jiraProjectKey"
                placeholder="e.g. MPS"
                value={jiraProjectKey}
                onChange={(e) => setJiraProjectKey(e.target.value)}
              />
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !name || !targetDate || !driId}
          >
            {loading ? "Saving..." : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
