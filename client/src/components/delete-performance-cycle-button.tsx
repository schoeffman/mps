import { useMutation, gql } from "@apollo/client";
import { GET_PERFORMANCE_CYCLES } from "@/routes/performance-cycles";
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

const DELETE_PERFORMANCE_CYCLE = gql`
  mutation DeletePerformanceCycle($id: Int!) {
    deletePerformanceCycle(id: $id)
  }
`;

export function DeletePerformanceCycleButton({
  cycleId,
  cycleTitle,
}: {
  cycleId: number;
  cycleTitle: string;
}) {
  const [deleteCycle] = useMutation(DELETE_PERFORMANCE_CYCLE, {
    refetchQueries: [{ query: GET_PERFORMANCE_CYCLES }],
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
          <AlertDialogTitle>Delete performance cycle</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{cycleTitle}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="destructive"
              onClick={() =>
                deleteCycle({ variables: { id: cycleId } }).catch((err) =>
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
