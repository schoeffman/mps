import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteUserButton } from "@/components/delete-user-button";
import { EditUserDialog } from "@/components/edit-user-dialog";

interface User {
  id: number;
  fullName: string;
  craftAbility: string;
  jobLevel: string;
  craftFocus: string;
  createdAt: string;
}

const enumLabels: Record<string, string> = {
  ProductManagement: "Product Management",
  DataScience: "Data Science",
  NotApplicable: "Not Applicable",
};

function formatEnum(value: string) {
  return enumLabels[value] ?? value;
}

export function UsersList({ users }: { users: User[] }) {
  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>No users yet.</p>
        <p className="text-sm">Click "Add User" to create one.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Craft Ability</TableHead>
          <TableHead>Job Level</TableHead>
          <TableHead>Craft Focus</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-[80px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">
              <Link to={`/users/${user.id}`} className="hover:underline">
                {user.fullName}
              </Link>
            </TableCell>
            <TableCell>{formatEnum(user.craftAbility)}</TableCell>
            <TableCell>{user.jobLevel}</TableCell>
            <TableCell>{formatEnum(user.craftFocus)}</TableCell>
            <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
            <TableCell className="flex gap-1">
              <EditUserDialog user={user} />
              <DeleteUserButton userId={user.id} userName={user.fullName} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
