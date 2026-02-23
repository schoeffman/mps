import { useState } from "react";
import { useMutation, gql } from "@apollo/client";
import { parseISO, format } from "date-fns";
import { Pencil } from "lucide-react";
import { GET_USERS } from "@/routes/users";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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

const UPDATE_USER = gql`
  mutation UpdateUser($id: Int!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      fullName
      craftAbility
      jobLevel
      levelStartDate
      craftFocus
      createdAt
    }
  }
`;

interface EditUserDialogProps {
  user: {
    id: number;
    fullName: string;
    craftAbility: string;
    jobLevel: string;
    levelStartDate: string | null;
    craftFocus: string;
  };
}

export function EditUserDialog({ user }: EditUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState(user.fullName);
  const [craftAbility, setCraftAbility] = useState(user.craftAbility);
  const [jobLevel, setJobLevel] = useState(user.jobLevel);
  const [levelStartDate, setLevelStartDate] = useState(user.levelStartDate ?? "");
  const [craftFocus, setCraftFocus] = useState(user.craftFocus);

  const [updateUser, { loading }] = useMutation(UPDATE_USER, {
    refetchQueries: [{ query: GET_USERS }],
  });

  function resetForm() {
    setFullName(user.fullName);
    setCraftAbility(user.craftAbility);
    setJobLevel(user.jobLevel);
    setLevelStartDate(user.levelStartDate ?? "");
    setCraftFocus(user.craftFocus);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      resetForm();
    }
    setOpen(nextOpen);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await updateUser({
      variables: {
        id: user.id,
        input: { fullName, craftAbility, jobLevel, levelStartDate: levelStartDate || null, craftFocus },
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
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="edit-fullName">Full Name</Label>
            <Input
              id="edit-fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-craftAbility">Craft Ability</Label>
            <Select value={craftAbility} onValueChange={setCraftAbility} required>
              <SelectTrigger id="edit-craftAbility">
                <SelectValue placeholder="Select craft ability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Engineering">Engineering</SelectItem>
                <SelectItem value="Design">Design</SelectItem>
                <SelectItem value="ProductManagement">Product Management</SelectItem>
                <SelectItem value="DataScience">Data Science</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-jobLevel">Job Level</Label>
            <Select value={jobLevel} onValueChange={setJobLevel} required>
              <SelectTrigger id="edit-jobLevel">
                <SelectValue placeholder="Select job level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Junior">Junior</SelectItem>
                <SelectItem value="Mid">Mid</SelectItem>
                <SelectItem value="Senior">Senior</SelectItem>
                <SelectItem value="Staff">Staff</SelectItem>
                <SelectItem value="Principal">Principal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Time at Level Start Date</Label>
            <DatePicker
              value={levelStartDate ? parseISO(levelStartDate) : undefined}
              onChange={(date) => setLevelStartDate(date ? format(date, "yyyy-MM-dd") : "")}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-craftFocus">Craft Focus</Label>
            <Select value={craftFocus} onValueChange={setCraftFocus}>
              <SelectTrigger id="edit-craftFocus">
                <SelectValue placeholder="Select craft focus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Frontend">Frontend</SelectItem>
                <SelectItem value="Backend">Backend</SelectItem>
                <SelectItem value="Fullstack">Fullstack</SelectItem>
                <SelectItem value="Mobile">Mobile</SelectItem>
                <SelectItem value="Infrastructure">Infrastructure</SelectItem>
                <SelectItem value="NotApplicable">Not Applicable</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={loading || !fullName || !craftAbility || !jobLevel}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
