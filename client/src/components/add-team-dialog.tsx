import { useState } from "react";
import { useMutation, useQuery, gql } from "@apollo/client";
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

const CREATE_TEAM = gql`
  mutation CreateTeam($input: CreateTeamInput!) {
    createTeam(input: $input) {
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

export function AddTeamDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [memberIds, setMemberIds] = useState<number[]>([]);
  const [teamLeadId, setTeamLeadId] = useState<string>("");

  const { data: usersData } = useQuery(GET_USERS);
  const [createTeam, { loading }] = useMutation(CREATE_TEAM, {
    refetchQueries: [{ query: GET_TEAMS }],
  });

  const allUsers: { id: number; fullName: string }[] = usersData?.users ?? [];

  function resetForm() {
    setName("");
    setMemberIds([]);
    setTeamLeadId("");
  }

  function toggleMember(userId: number) {
    setMemberIds((prev) => {
      const next = prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId];
      // If unchecking the current lead, clear lead selection
      if (!next.includes(Number(teamLeadId))) {
        setTeamLeadId("");
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createTeam({
      variables: {
        input: { name, teamLeadId: Number(teamLeadId), memberIds },
      },
    });
    resetForm();
    setOpen(false);
  }

  const selectedMembers = allUsers.filter((u) => memberIds.includes(u.id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Team</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Team</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="teamName">Team Name</Label>
            <Input
              id="teamName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label>Members</Label>
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
            <Label htmlFor="teamLead">Team Lead</Label>
            <Select value={teamLeadId} onValueChange={setTeamLeadId}>
              <SelectTrigger id="teamLead">
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
            {loading ? "Creating..." : "Create Team"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
