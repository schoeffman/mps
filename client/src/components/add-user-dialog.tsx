import { useState } from "react";
import { useMutation, gql } from "@apollo/client";
import { format } from "date-fns";
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

const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
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

export function AddUserDialog() {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [craftAbility, setCraftAbility] = useState("");
  const [jobLevel, setJobLevel] = useState("");
  const [levelStartDate, setLevelStartDate] = useState("");
  const [craftFocus, setCraftFocus] = useState("NotApplicable");

  const [createUser, { loading }] = useMutation(CREATE_USER, {
    refetchQueries: [{ query: GET_USERS }],
  });

  function resetForm() {
    setFullName("");
    setCraftAbility("");
    setJobLevel("");
    setLevelStartDate("");
    setCraftFocus("NotApplicable");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createUser({
      variables: {
        input: { fullName, craftAbility, jobLevel, levelStartDate: levelStartDate || null, craftFocus },
      },
    });
    resetForm();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add User</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="craftAbility">Craft Ability</Label>
            <Select value={craftAbility} onValueChange={setCraftAbility} required>
              <SelectTrigger id="craftAbility">
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
            <Label htmlFor="jobLevel">Job Level</Label>
            <Select value={jobLevel} onValueChange={setJobLevel} required>
              <SelectTrigger id="jobLevel">
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
              value={levelStartDate ? new Date(levelStartDate) : undefined}
              onChange={(date) => setLevelStartDate(date ? format(date, "yyyy-MM-dd") : "")}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="craftFocus">Craft Focus</Label>
            <Select value={craftFocus} onValueChange={setCraftFocus}>
              <SelectTrigger id="craftFocus">
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
            {loading ? "Creating..." : "Create User"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
