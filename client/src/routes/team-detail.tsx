import { useParams, Link } from "react-router-dom";
import { useQuery, gql } from "@apollo/client";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const GET_TEAM = gql`
  query GetTeam($id: Int!) {
    team(id: $id) {
      id
      name
      teamLead {
        id
        fullName
      }
      members {
        id
        fullName
        craftAbility
        jobLevel
        craftFocus
      }
      createdAt
    }
  }
`;

const enumLabels: Record<string, string> = {
  ProductManagement: "Product Management",
  DataScience: "Data Science",
  NotApplicable: "Not Applicable",
};

function formatEnum(value: string) {
  return enumLabels[value] ?? value;
}

export default function TeamDetail() {
  const { id } = useParams();
  const { loading, error, data } = useQuery(GET_TEAM, {
    variables: { id: Number(id) },
  });

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  if (!data?.team) return <p>Team not found.</p>;

  const { team } = data;

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link to="/teams">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">{team.name}</h1>
      </div>

      <div className="mb-6 text-sm text-muted-foreground space-y-1">
        <p>Lead: {team.teamLead.fullName}</p>
        <p>Created: {new Date(team.createdAt).toLocaleDateString()}</p>
      </div>

      <h2 className="text-lg font-semibold mb-2">Members</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Craft Ability</TableHead>
            <TableHead>Job Level</TableHead>
            <TableHead>Craft Focus</TableHead>
            <TableHead>Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {team.members.map((member: { id: number; fullName: string; craftAbility: string; jobLevel: string; craftFocus: string }) => (
            <TableRow key={member.id}>
              <TableCell className="font-medium">{member.fullName}</TableCell>
              <TableCell>{formatEnum(member.craftAbility)}</TableCell>
              <TableCell>{member.jobLevel}</TableCell>
              <TableCell>{formatEnum(member.craftFocus)}</TableCell>
              <TableCell>
                {member.id === team.teamLead.id ? (
                  <Badge>Lead</Badge>
                ) : (
                  <Badge variant="secondary">Member</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
