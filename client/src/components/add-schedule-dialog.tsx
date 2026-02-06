import { useState } from "react";
import { useMutation, gql } from "@apollo/client";
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

const CREATE_SCHEDULE = gql`
  mutation CreateSchedule($input: CreateScheduleInput!) {
    createSchedule(input: $input) {
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

export function AddScheduleDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [year, setYear] = useState(String(currentYear));
  const [quarter, setQuarter] = useState("1");

  const [createSchedule, { loading }] = useMutation(CREATE_SCHEDULE, {
    refetchQueries: [{ query: GET_SCHEDULES }],
  });

  function resetForm() {
    setName("");
    setYear(String(currentYear));
    setQuarter("1");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createSchedule({
      variables: {
        input: { name, year: Number(year), quarter: Number(quarter) },
      },
    });
    resetForm();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Schedule</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Schedule</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="scheduleName">Schedule Name</Label>
            <Input
              id="scheduleName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="year">Year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger id="year">
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
            <Label htmlFor="quarter">Quarter</Label>
            <Select value={quarter} onValueChange={setQuarter}>
              <SelectTrigger id="quarter">
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
            {loading ? "Creating..." : "Create Schedule"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
