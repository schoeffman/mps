import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, gql } from "@apollo/client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useSession, signOut, authClient } from "@/lib/auth-client";
import { apolloClient } from "@/lib/apollo-client";
import { useSpace } from "@/lib/space-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const DELETE_MY_ACCOUNT = gql`
  mutation DeleteMyAccount {
    deleteMyAccount
  }
`;

const LEAVE_SPACE = gql`
  mutation LeaveSpace($ownerAuthId: String!) {
    leaveSpace(ownerAuthId: $ownerAuthId)
  }
`;

export default function Settings() {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { isOwner, spaces, switchSpace } = useSpace();
  const [deleteMyAccount] = useMutation(DELETE_MY_ACCOUNT);
  const [leaveSpace] = useMutation(LEAVE_SPACE);

  const joinedSpaces = spaces.filter((s) => !s.isOwner);
  const user = session?.user;

  async function handleRevokeOtherSessions() {
    try {
      await authClient.revokeOtherSessions();
      alert("All other sessions have been signed out.");
    } catch {
      alert("Failed to revoke other sessions.");
    }
  }

  async function handleDeleteAccount() {
    try {
      await deleteMyAccount();
      await signOut();
      await apolloClient.clearStore();
      navigate("/login");
    } catch {
      alert("Failed to delete account.");
    }
  }

  async function handleLeaveSpace(ownerAuthId: string) {
    try {
      await leaveSpace({ variables: { ownerAuthId } });
      const ownSpace = spaces.find((s) => s.isOwner);
      if (ownSpace) switchSpace(ownSpace.id);
    } catch {
      alert("Failed to leave space.");
    }
  }

  return (
    <>
      <h1 className="text-2xl font-semibold mb-6">Account Settings</h1>

      {/* Profile Section */}
      <section className="mb-8">
        <h2 className="text-lg font-medium mb-4">Profile</h2>
        <div className="flex items-start gap-4">
          {user?.image ? (
            <img
              src={user.image}
              alt=""
              className="size-16 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="size-16 rounded-full bg-muted" />
          )}
          <div className="space-y-1">
            <p className="text-sm font-medium">{user?.name ?? "User"}</p>
            <p className="text-sm text-muted-foreground">{user?.email ?? ""}</p>
            <Badge variant="secondary">OAuth</Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Profile information is managed by your OAuth provider and cannot be edited here.
        </p>
      </section>

      {/* Appearance Section */}
      <section className="mb-8">
        <h2 className="text-lg font-medium mb-4">Appearance</h2>
        <Button variant="outline" onClick={toggleTheme}>
          {theme === "dark" ? (
            <Sun className="size-4 mr-2" />
          ) : (
            <Moon className="size-4 mr-2" />
          )}
          {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        </Button>
      </section>

      {/* Spaces I've Joined */}
      {joinedSpaces.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-medium mb-4">Spaces I've Joined</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Spaces you have been given access to by their owners.
          </p>
          <div className="space-y-2">
            {joinedSpaces.map((space) => (
              <div key={space.id} className="flex items-center gap-3 rounded-lg border p-3">
                {space.image ? (
                  <img src={space.image} alt="" className="size-8 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div className="size-8 rounded-full bg-muted" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{space.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{space.email}</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">Leave</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Leave {space.name}'s space?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You will lose access to {space.name}'s data. The owner can re-add you later.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleLeaveSpace(space.id)}>
                        Leave
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Danger Zone — only in own space */}
      {isOwner && (
        <section>
          <h2 className="text-lg font-medium mb-4 text-destructive">Danger Zone</h2>
          <div className="border border-destructive/30 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Sign out all devices</p>
                <p className="text-xs text-muted-foreground">
                  This will sign out all other sessions except your current one.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    Sign out all devices
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sign out all devices</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will sign out all other sessions. You will remain signed
                      in on this device.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRevokeOtherSessions}>
                      Sign out all devices
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Delete account</p>
                <p className="text-xs text-muted-foreground">
                  Permanently delete your account and all associated data. This
                  action cannot be undone.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    Delete account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete account</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to permanently delete your account?
                      All your data (users, teams, projects, schedules) will be
                      permanently removed. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <Button variant="destructive" onClick={handleDeleteAccount}>
                        Delete my account
                      </Button>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
