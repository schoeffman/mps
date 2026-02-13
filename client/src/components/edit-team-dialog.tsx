import { useState, useMemo } from "react";
import { useMutation, useQuery, gql } from "@apollo/client";
import { Pencil } from "lucide-react";
import { GET_TEAMS } from "@/routes/teams";
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

const UPDATE_TEAM = gql`
  mutation UpdateTeam($id: Int!, $input: UpdateTeamInput!) {
    updateTeam(id: $id, input: $input) {
      id
      name
      teamLead {
        id
        fullName
      }
      members {
        id
        fullName
      }
      createdAt
    }
  }
`;

interface EditTeamDialogProps {
  team: {
    id: number;
    name: string;
    teamLead: { id: number; fullName: string };
    members: { id: number; fullName: string }[];
  };
}

export function EditTeamDialog({ team }: EditTeamDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(team.name);
  const [memberIds, setMemberIds] = useState<number[]>(team.members.map((m) => m.id));
  const [teamLeadId, setTeamLeadId] = useState<string>(String(team.teamLead.id));

  const { data: usersData } = useQuery(GET_USERS);
  const { data: teamsData } = useQuery(GET_TEAMS);
  const [updateTeam, { loading }] = useMutation(UPDATE_TEAM, {
    refetchQueries: [{ query: GET_TEAMS }],
  });

  const allUsers: { id: number; fullName: string }[] = usersData?.users ?? [];

  // Map userId → team name for users on OTHER teams
  const takenByTeam = useMemo(() => {
    const map = new Map<number, string>();
    if (!teamsData?.teams) return map;
    for (const t of teamsData.teams) {
      if (t.id === team.id) continue;
      for (const m of t.members) {
        map.set(m.id, t.name);
      }
    }
    return map;
  }, [teamsData, team.id]);

  function resetForm() {
    setName(team.name);
    setMemberIds(team.members.map((m) => m.id));
    setTeamLeadId(String(team.teamLead.id));
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
      if (!next.includes(Number(teamLeadId))) {
        setTeamLeadId("");
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await updateTeam({
      variables: {
        id: team.id,
        input: { name, teamLeadId: Number(teamLeadId), memberIds },
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
          <DialogTitle>Edit Team</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="edit-teamName">Team Name</Label>
            <Input
              id="edit-teamName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label>Members</Label>
            <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-2">
              {allUsers.map((user) => {
                const otherTeam = takenByTeam.get(user.id);
                return (
                  <label key={user.id} className={`flex items-center gap-2 text-sm ${otherTeam ? "opacity-50" : ""}`}>
                    <Checkbox
                      checked={memberIds.includes(user.id)}
                      onCheckedChange={() => toggleMember(user.id)}
                      disabled={!!otherTeam}
                    />
                    {user.fullName}
                    {otherTeam && <span className="text-xs text-muted-foreground">({otherTeam})</span>}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-teamLead">Team Lead</Label>
            <Select value={teamLeadId} onValueChange={setTeamLeadId}>
              <SelectTrigger id="edit-teamLead">
                <SelectValue placeholder="Select team lead" />
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
            disabled={loading || !name || !teamLeadId || memberIds.length === 0}
          >
            {loading ? "Saving..." : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
