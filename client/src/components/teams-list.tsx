import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteTeamButton } from "@/components/delete-team-button";
import { EditTeamDialog } from "@/components/edit-team-dialog";

interface Team {
  id: number;
  name: string;
  teamLead: { id: number; fullName: string };
  members: { id: number; fullName: string }[];
  createdAt: string;
}

export function TeamsList({ teams }: { teams: Team[] }) {
  if (teams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>No teams yet.</p>
        <p className="text-sm">Click "Add Team" to create one.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Team Lead</TableHead>
          <TableHead>Members</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-[80px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {teams.map((team) => (
          <TableRow key={team.id}>
            <TableCell className="font-medium">
              <Link to={`/teams/${team.id}`} className="hover:underline">
                {team.name}
              </Link>
            </TableCell>
            <TableCell>{team.teamLead.fullName}</TableCell>
            <TableCell>{team.members.length}</TableCell>
            <TableCell>{new Date(team.createdAt).toLocaleDateString()}</TableCell>
            <TableCell className="flex gap-1">
              <EditTeamDialog team={team} />
              <DeleteTeamButton teamId={team.id} teamName={team.name} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
