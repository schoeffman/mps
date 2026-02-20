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

const JIRA_CONFIG = gql`
  query JiraConfig {
    jiraConfig {
      id
      domain
      email
      hasToken
      storyPointsFieldId
    }
  }
`;

const SAVE_JIRA_CONFIG = gql`
  mutation SaveJiraConfig($domain: String!, $email: String!, $apiToken: String!, $storyPointsFieldId: String) {
    saveJiraConfig(domain: $domain, email: $email, apiToken: $apiToken, storyPointsFieldId: $storyPointsFieldId) {
      id
      domain
      email
      hasToken
      storyPointsFieldId
    }
  }
`;

const REMOVE_JIRA_CONFIG = gql`
  mutation RemoveJiraConfig {
    removeJiraConfig
  }
`;

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
  const [email, setEmail] = useState("");
  const [addError, setAddError] = useState("");

  // Jira config
  const { data: jiraData, refetch: refetchJira } = useQuery(JIRA_CONFIG, { skip: !isOwner });
  const [saveJiraConfig, { loading: savingJira }] = useMutation(SAVE_JIRA_CONFIG);
  const [removeJiraConfig] = useMutation(REMOVE_JIRA_CONFIG);
  const [jiraDomain, setJiraDomain] = useState("");
  const [jiraEmail, setJiraEmail] = useState("");
  const [jiraToken, setJiraToken] = useState("");
  const [jiraStoryPointsFieldId, setJiraStoryPointsFieldId] = useState("");
  const [jiraError, setJiraError] = useState("");

  const { data: membersData, refetch: refetchMembers } = useQuery(SPACE_MEMBERS, { skip: !isOwner });
  const members = membersData?.spaceMembers ?? [];

  const [addSpaceMember, { loading: adding }] = useMutation(ADD_SPACE_MEMBER);
  const [removeSpaceMember] = useMutation(REMOVE_SPACE_MEMBER);
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

  async function handleLeaveSpace(ownerAuthId: string) {
    try {
      await leaveSpace({ variables: { ownerAuthId } });
      // If we were viewing that space, switch back to own space
      const ownSpace = spaces.find((s) => s.isOwner);
      if (ownSpace) switchSpace(ownSpace.id);
    } catch {
      alert("Failed to leave space.");
    }
  }

  async function handleSaveJira(e: React.FormEvent) {
    e.preventDefault();
    setJiraError("");
    try {
      await saveJiraConfig({ variables: { domain: jiraDomain.trim(), email: jiraEmail.trim(), apiToken: jiraToken.trim(), storyPointsFieldId: jiraStoryPointsFieldId.trim() || null } });
      setJiraToken("");
      refetchJira();
    } catch (err: unknown) {
      setJiraError(err instanceof Error ? err.message : "Failed to save Jira config");
    }
  }

  async function handleRemoveJira() {
    try {
      await removeJiraConfig();
      setJiraDomain("");
      setJiraEmail("");
      setJiraToken("");
      setJiraStoryPointsFieldId("");
      refetchJira();
    } catch {
      alert("Failed to remove Jira config.");
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

      {/* Jira Integration — only in own space */}
      {isOwner && (
        <section className="mb-8">
          <h2 className="text-lg font-medium mb-4">Jira Integration</h2>
          {jiraData?.jiraConfig ? (
            <div className="space-y-3">
              <div className="rounded-lg border p-4 space-y-1">
                <p className="text-sm"><span className="font-medium">Domain:</span> {jiraData.jiraConfig.domain}.atlassian.net</p>
                <p className="text-sm"><span className="font-medium">Email:</span> {jiraData.jiraConfig.email}</p>
                <p className="text-sm"><span className="font-medium">API Token:</span> ••••••••</p>
                <p className="text-sm"><span className="font-medium">Story Points Field:</span> {jiraData.jiraConfig.storyPointsFieldId || "Not configured"}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setJiraDomain(jiraData.jiraConfig.domain);
                    setJiraEmail(jiraData.jiraConfig.email);
                    setJiraToken("");
                    setJiraStoryPointsFieldId(jiraData.jiraConfig.storyPointsFieldId ?? "");
                  }}
                >
                  Update
                </Button>
                <Button variant="outline" size="sm" onClick={handleRemoveJira}>
                  Remove
                </Button>
              </div>
              {(jiraDomain || jiraEmail) && (
                <form onSubmit={handleSaveJira} className="space-y-3 mt-3">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="jira-domain">Jira Domain</label>
                    <div className="flex items-center gap-1">
                      <Input id="jira-domain" placeholder="mycompany" value={jiraDomain} onChange={(e) => setJiraDomain(e.target.value)} required className="max-w-48" />
                      <span className="text-sm text-muted-foreground">.atlassian.net</span>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="jira-email">Email</label>
                    <Input id="jira-email" type="email" value={jiraEmail} onChange={(e) => setJiraEmail(e.target.value)} required className="max-w-sm" />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="jira-token">API Token</label>
                    <Input id="jira-token" type="password" placeholder="Enter new API token" value={jiraToken} onChange={(e) => setJiraToken(e.target.value)} required className="max-w-sm" />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="jira-sp-field">Story Points Field ID</label>
                    <Input id="jira-sp-field" placeholder="customfield_33062" value={jiraStoryPointsFieldId} onChange={(e) => setJiraStoryPointsFieldId(e.target.value)} className="max-w-sm" />
                    <p className="text-xs text-muted-foreground">Optional. The custom field ID used for story points in your Jira instance.</p>
                  </div>
                  {jiraError && <p className="text-sm text-destructive">{jiraError}</p>}
                  <Button type="submit" disabled={savingJira} size="sm">
                    {savingJira ? "Saving..." : "Save"}
                  </Button>
                </form>
              )}
            </div>
          ) : (
            <form onSubmit={handleSaveJira} className="space-y-3">
              <p className="text-sm text-muted-foreground mb-2">
                Connect your Jira Cloud instance to view issues on project pages.
              </p>
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="jira-domain">Jira Domain</label>
                <div className="flex items-center gap-1">
                  <Input id="jira-domain" placeholder="mycompany" value={jiraDomain} onChange={(e) => setJiraDomain(e.target.value)} required className="max-w-48" />
                  <span className="text-sm text-muted-foreground">.atlassian.net</span>
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="jira-email">Email</label>
                <Input id="jira-email" type="email" placeholder="you@example.com" value={jiraEmail} onChange={(e) => setJiraEmail(e.target.value)} required className="max-w-sm" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="jira-token">API Token</label>
                <Input id="jira-token" type="password" placeholder="Jira API token" value={jiraToken} onChange={(e) => setJiraToken(e.target.value)} required className="max-w-sm" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="jira-sp-field">Story Points Field ID</label>
                <Input id="jira-sp-field" placeholder="customfield_33062" value={jiraStoryPointsFieldId} onChange={(e) => setJiraStoryPointsFieldId(e.target.value)} className="max-w-sm" />
                <p className="text-xs text-muted-foreground">Optional. The custom field ID used for story points in your Jira instance.</p>
              </div>
              {jiraError && <p className="text-sm text-destructive">{jiraError}</p>}
              <Button type="submit" disabled={savingJira}>
                {savingJira ? "Saving..." : "Save Jira Config"}
              </Button>
            </form>
          )}
        </section>
      )}

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
