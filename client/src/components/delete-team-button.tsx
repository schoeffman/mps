import { useMutation, gql } from "@apollo/client";
import { GET_TEAMS } from "@/routes/teams";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const DELETE_TEAM = gql`
  mutation DeleteTeam($id: Int!) {
    deleteTeam(id: $id)
  }
`;

export function DeleteTeamButton({
  teamId,
  teamName,
}: {
  teamId: number;
  teamName: string;
}) {
  const [deleteTeam] = useMutation(DELETE_TEAM, {
    refetchQueries: [{ query: GET_TEAMS }],
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-xs">
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete team</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {teamName}? This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="destructive"
              onClick={() =>
                deleteTeam({ variables: { id: teamId } }).catch((err) =>
                  alert(err.message),
                )
              }
            >
              Delete
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
