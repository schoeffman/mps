import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteScheduleButton } from "@/components/delete-schedule-button";
import { EditScheduleDialog } from "@/components/edit-schedule-dialog";

interface Schedule {
  id: number;
  name: string;
  year: number;
  quarter: number;
  createdAt: string;
}

export function SchedulesList({ schedules }: { schedules: Schedule[] }) {
  if (schedules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>No schedules yet.</p>
        <p className="text-sm">Click "Add Schedule" to create one.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Year</TableHead>
          <TableHead>Quarter</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-[80px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {schedules.map((schedule) => (
          <TableRow key={schedule.id}>
            <TableCell className="font-medium">
              <Link to={`/schedules/${schedule.id}`} className="hover:underline">
                {schedule.name}
              </Link>
            </TableCell>
            <TableCell>{schedule.year}</TableCell>
            <TableCell>Q{schedule.quarter}</TableCell>
            <TableCell>{new Date(schedule.createdAt).toLocaleDateString()}</TableCell>
            <TableCell className="flex gap-1">
              <EditScheduleDialog schedule={schedule} />
              <DeleteScheduleButton scheduleId={schedule.id} scheduleName={schedule.name} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
