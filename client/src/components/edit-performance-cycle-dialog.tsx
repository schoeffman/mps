import { useState } from "react";
import { useMutation, useQuery, gql } from "@apollo/client";
import { Pencil } from "lucide-react";
import { GET_PERFORMANCE_CYCLES } from "@/routes/performance-cycles";
import { GET_USERS } from "@/routes/users";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => String(currentYear - 2 + i));

const UPDATE_PERFORMANCE_CYCLE = gql`
  mutation UpdatePerformanceCycle($id: Int!, $input: UpdatePerformanceCycleInput!) {
    updatePerformanceCycle(id: $id, input: $input) {
      id
      title
      cycleMonth
      users {
        id
        fullName
      }
      createdAt
    }
  }
`;

interface EditPerformanceCycleDialogProps {
  cycle: {
    id: number;
    title: string;
    cycleMonth: string;
    users: { id: number; fullName: string }[];
  };
}

export function EditPerformanceCycleDialog({ cycle }: EditPerformanceCycleDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(cycle.title);
  const [selectedMonth, setSelectedMonth] = useState(cycle.cycleMonth.split("-")[1] ?? "");
  const [selectedYear, setSelectedYear] = useState(cycle.cycleMonth.split("-")[0] ?? "");
  const [userIds, setUserIds] = useState<number[]>(cycle.users.map((u) => u.id));

  const { data: usersData } = useQuery(GET_USERS);
  const [updateCycle, { loading }] = useMutation(UPDATE_PERFORMANCE_CYCLE, {
    refetchQueries: [{ query: GET_PERFORMANCE_CYCLES }],
  });

  const allUsers: { id: number; fullName: string }[] = usersData?.users ?? [];

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setTitle(cycle.title);
      setSelectedMonth(cycle.cycleMonth.split("-")[1] ?? "");
      setSelectedYear(cycle.cycleMonth.split("-")[0] ?? "");
      setUserIds(cycle.users.map((u) => u.id));
    }
    setOpen(nextOpen);
  }

  function toggleUser(userId: number) {
    setUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  const cycleMonth = selectedYear && selectedMonth ? `${selectedYear}-${selectedMonth}` : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await updateCycle({ variables: { id: cycle.id, input: { title, cycleMonth, userIds } } });
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
          <DialogTitle>Edit Performance Cycle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="edit-cycleTitle">Title</Label>
            <Input
              id="edit-cycleTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label>Month</Label>
            <div className="flex gap-2">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Users</Label>
            <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-2">
              {allUsers.map((user) => (
                <label key={user.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={userIds.includes(user.id)}
                    onCheckedChange={() => toggleUser(user.id)}
                  />
                  {user.fullName}
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={loading || !title || !cycleMonth}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
