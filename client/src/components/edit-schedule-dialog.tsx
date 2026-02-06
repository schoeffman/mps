import { useState } from "react";
import { useMutation, gql } from "@apollo/client";
import { Pencil } from "lucide-react";
import { GET_SCHEDULES } from "@/routes/schedules";
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

const UPDATE_SCHEDULE = gql`
  mutation UpdateSchedule($id: Int!, $input: UpdateScheduleInput!) {
    updateSchedule(id: $id, input: $input) {
      id
      name
      year
      quarter
      createdAt
    }
  }
`;

const currentYear = new Date().getFullYear();
const yearOptions = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

interface EditScheduleDialogProps {
  schedule: {
    id: number;
    name: string;
    year: number;
    quarter: number;
  };
}

export function EditScheduleDialog({ schedule }: EditScheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(schedule.name);
  const [year, setYear] = useState(String(schedule.year));
  const [quarter, setQuarter] = useState(String(schedule.quarter));

  const [updateSchedule, { loading }] = useMutation(UPDATE_SCHEDULE, {
    refetchQueries: [{ query: GET_SCHEDULES }],
  });

  function resetForm() {
    setName(schedule.name);
    setYear(String(schedule.year));
    setQuarter(String(schedule.quarter));
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      resetForm();
    }
    setOpen(nextOpen);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await updateSchedule({
      variables: {
        id: schedule.id,
        input: { name, year: Number(year), quarter: Number(quarter) },
      },
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-xs">
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Schedule</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="edit-scheduleName">Schedule Name</Label>
            <Input
              id="edit-scheduleName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-year">Year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger id="edit-year">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-quarter">Quarter</Label>
            <Select value={quarter} onValueChange={setQuarter}>
              <SelectTrigger id="edit-quarter">
                <SelectValue placeholder="Select quarter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Q1</SelectItem>
                <SelectItem value="2">Q2</SelectItem>
                <SelectItem value="3">Q3</SelectItem>
                <SelectItem value="4">Q4</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={loading || !name}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
