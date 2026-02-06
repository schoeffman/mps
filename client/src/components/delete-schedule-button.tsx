import { useMutation, gql } from "@apollo/client";
import { GET_SCHEDULES } from "@/routes/schedules";
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

const DELETE_SCHEDULE = gql`
  mutation DeleteSchedule($id: Int!) {
    deleteSchedule(id: $id)
  }
`;

export function DeleteScheduleButton({
  scheduleId,
  scheduleName,
}: {
  scheduleId: number;
  scheduleName: string;
}) {
  const [deleteSchedule] = useMutation(DELETE_SCHEDULE, {
    refetchQueries: [{ query: GET_SCHEDULES }],
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
          <AlertDialogTitle>Delete schedule</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {scheduleName}? All assignments in this
            schedule will also be deleted. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="destructive"
              onClick={() =>
                deleteSchedule({ variables: { id: scheduleId } }).catch(
                  (err) => alert(err.message),
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
