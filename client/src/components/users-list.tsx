import { Link } from "react-router-dom";
import { Monitor, Server, Layers, Smartphone, Cloud } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DeleteUserButton } from "@/components/delete-user-button";
import { EditUserDialog } from "@/components/edit-user-dialog";

interface User {
  id: number;
  fullName: string;
  craftAbility: string;
  jobLevel: string;
  levelStartDate: string | null;
  craftFocus: string;
}

const craftFocusIcon: Record<string, React.ReactNode> = {
  Frontend:       <Monitor className="h-3.5 w-3.5" />,
  Backend:        <Server className="h-3.5 w-3.5" />,
  Fullstack:      <Layers className="h-3.5 w-3.5" />,
  Mobile:         <Smartphone className="h-3.5 w-3.5" />,
  Infrastructure: <Cloud className="h-3.5 w-3.5" />,
};

const enumLabels: Record<string, string> = {
  ProductManagement: "Product Management",
  DataScience: "Data Science",
  NotApplicable: "Not Applicable",
};

function formatEnum(value: string) {
  return enumLabels[value] ?? value;
}

const CRAFT_ORDER = ["Engineering", "Design", "ProductManagement", "DataScience"];

export function UsersList({ users }: { users: User[] }) {
  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>No users yet.</p>
        <p className="text-sm">Click "Add User" to create one.</p>
      </div>
    );
  }

  const groups = CRAFT_ORDER
    .filter((craft) => users.some((u) => u.craftAbility === craft))
    .map((craft) => ({
      craft,
      users: users.filter((u) => u.craftAbility === craft),
    }));

  return (
    <div className="flex flex-col gap-6">
      {groups.map(({ craft, users: groupUsers }) => (
        <div key={craft}>
          <h2 className="text-base font-semibold mb-2">{formatEnum(craft)}</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Job Level</TableHead>
                <TableHead>Focus</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <Link to={`/users/${user.id}`} className="hover:underline">
                      {user.fullName}
                    </Link>
                  </TableCell>
                  <TableCell>{user.jobLevel}</TableCell>
                  <TableCell>
                    {craftFocusIcon[user.craftFocus] ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-muted-foreground">{craftFocusIcon[user.craftFocus]}</span>
                          </TooltipTrigger>
                          <TooltipContent>{formatEnum(user.craftFocus)}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="flex gap-1">
                    <EditUserDialog user={user} />
                    <DeleteUserButton userId={user.id} userName={user.fullName} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
}
