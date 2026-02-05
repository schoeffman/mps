import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, gql } from "@apollo/client";
import { GET_USERS } from "@/routes/users";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditUserDialog } from "@/components/edit-user-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const GET_USER = gql`
  query GetUser($id: Int!) {
    user(id: $id) {
      id
      fullName
      craftAbility
      jobLevel
      craftFocus
      createdAt
    }
  }
`;

const DELETE_USER = gql`
  mutation DeleteUser($id: Int!) {
    deleteUser(id: $id)
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

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loading, error, data } = useQuery(GET_USER, {
    variables: { id: Number(id) },
  });
  const [deleteUser] = useMutation(DELETE_USER, {
    refetchQueries: [{ query: GET_USERS }],
  });

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  if (!data?.user) return <p>User not found.</p>;

  const { user } = data;

  async function handleDelete() {
    try {
      await deleteUser({ variables: { id: Number(id) } });
      navigate("/users");
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link to="/users">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">{user.fullName}</h1>
        <div className="flex gap-1 ml-2">
          <EditUserDialog user={user} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon-xs">
                <Trash2 />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete user</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {user.fullName}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button variant="destructive" onClick={handleDelete}>
                    Delete
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="text-sm text-muted-foreground space-y-1">
        <p>Craft Ability: {formatEnum(user.craftAbility)}</p>
        <p>Job Level: {user.jobLevel}</p>
        <p>Craft Focus: {formatEnum(user.craftFocus)}</p>
        <p>Created: {new Date(user.createdAt).toLocaleDateString()}</p>
      </div>
    </>
  );
}
