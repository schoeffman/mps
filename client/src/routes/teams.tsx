import { useQuery, gql } from "@apollo/client";
import { TeamsList } from "@/components/teams-list";
import { AddTeamDialog } from "@/components/add-team-dialog";

export const GET_TEAMS = gql`
  query GetTeams {
    teams {
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

export default function Teams() {
  const { loading, error, data } = useQuery(GET_TEAMS);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Teams</h1>
        <AddTeamDialog />
      </div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      {data && <TeamsList teams={data.teams} />}
    </>
  );
}
