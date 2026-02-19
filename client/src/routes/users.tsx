import { useQuery, gql } from "@apollo/client";
import { UsersList } from "@/components/users-list";
import { AddUserDialog } from "@/components/add-user-dialog";

export const GET_USERS = gql`
  query GetUsers {
    users {
      id
      fullName
      craftAbility
      jobLevel
      craftFocus
      createdAt
    }
  }
`;

export default function Users() {
  const { loading, error, data } = useQuery(GET_USERS);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users{data && <span className="text-base font-normal text-muted-foreground ml-2">({data.users.length})</span>}</h1>
        <AddUserDialog />
      </div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      {data && <UsersList users={data.users} />}
    </>
  );
}
