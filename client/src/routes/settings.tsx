import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, gql } from "@apollo/client";
import { Moon, Sun, X } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useSession, signOut, authClient } from "@/lib/auth-client";
import { apolloClient } from "@/lib/apollo-client";
import { useSpace } from "@/lib/space-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

const SPACE_MEMBERS = gql`
  query SpaceMembers {
    spaceMembers {
      id
      authId
      email
      name
      image
      createdAt
    }
  }
`;

const ADD_SPACE_MEMBER = gql`
  mutation AddSpaceMember($email: String!) {
    addSpaceMember(email: $email) {
      id
      authId
      email
      name
      image
      createdAt
    }
  }
`;

const REMOVE_SPACE_MEMBER = gql`
  mutation RemoveSpaceMember($memberAuthId: String!) {
    removeSpaceMember(memberAuthId: $memberAuthId)
  }
`;

export default function Settings() {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { isOwner } = useSpace();
  const [deleteMyAccount] = useMutation(DELETE_MY_ACCOUNT);
  const [email, setEmail] = useState("");
  const [addError, setAddError] = useState("");

  const { data: membersData, refetch: refetchMembers } = useQuery(SPACE_MEMBERS, { skip: !isOwner });
  const members = membersData?.spaceMembers ?? [];

  const [addSpaceMember, { loading: adding }] = useMutation(ADD_SPACE_MEMBER);
  const [removeSpaceMember] = useMutation(REMOVE_SPACE_MEMBER);

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

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    try {
      await addSpaceMember({ variables: { email: email.trim() } });
      setEmail("");
      refetchMembers();
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Failed to add member");
    }
  }

  async function handleRemoveMember(memberAuthId: string) {
    try {
      await removeSpaceMember({ variables: { memberAuthId } });
      refetchMembers();
    } catch {
      alert("Failed to remove member.");
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

      {/* Space Sharing Section — only in own space */}
      {isOwner && (
        <section className="mb-8">
          <h2 className="text-lg font-medium mb-4">Space Sharing</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Invite others by email to give them full access to your data.
          </p>
          <form onSubmit={handleAddMember} className="flex gap-2 mb-4">
            <Input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="max-w-sm"
            />
            <Button type="submit" disabled={adding}>
              Add Member
            </Button>
          </form>
          {addError && <p className="text-sm text-destructive mb-4">{addError}</p>}
          {members.length > 0 && (
            <div className="space-y-2">
              {members.map((member: { id: number; authId: string; name: string; email: string; image: string | null }) => (
                <div key={member.id} className="flex items-center gap-3 rounded-lg border p-3">
                  {member.image ? (
                    <img src={member.image} alt="" className="size-8 rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="size-8 rounded-full bg-muted" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(member.authId)}
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    title="Remove member"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
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
