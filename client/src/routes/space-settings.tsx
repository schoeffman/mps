import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, gql } from "@apollo/client";
import { X } from "lucide-react";
import { useSpace } from "@/lib/space-context";
import { Button } from "@/components/ui/button";
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

export default function SpaceSettings() {
  const navigate = useNavigate();
  const { isOwner, activeSpace, spaces, switchSpace } = useSpace();

  // Jira config
  const { data: jiraData, refetch: refetchJira } = useQuery(JIRA_CONFIG, { skip: !isOwner });
  const [saveJiraConfig, { loading: savingJira }] = useMutation(SAVE_JIRA_CONFIG);
  const [removeJiraConfig] = useMutation(REMOVE_JIRA_CONFIG);
  const [jiraDomain, setJiraDomain] = useState("");
  const [jiraEmail, setJiraEmail] = useState("");
  const [jiraToken, setJiraToken] = useState("");
  const [jiraStoryPointsFieldId, setJiraStoryPointsFieldId] = useState("");
  const [jiraError, setJiraError] = useState("");

  // Members
  const { data: membersData, refetch: refetchMembers } = useQuery(SPACE_MEMBERS, { skip: !isOwner });
  const members = membersData?.spaceMembers ?? [];
  const [memberEmail, setMemberEmail] = useState("");
  const [addError, setAddError] = useState("");
  const [addSpaceMember, { loading: adding }] = useMutation(ADD_SPACE_MEMBER);
  const [removeSpaceMember] = useMutation(REMOVE_SPACE_MEMBER);

  // Leave space
  const [leaveSpace] = useMutation(LEAVE_SPACE);

  async function handleSaveJira(e: React.FormEvent) {
    e.preventDefault();
    setJiraError("");
    try {
      await saveJiraConfig({
        variables: {
          domain: jiraDomain.trim(),
          email: jiraEmail.trim(),
          apiToken: jiraToken.trim(),
          storyPointsFieldId: jiraStoryPointsFieldId.trim() || null,
        },
      });
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

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    try {
      await addSpaceMember({ variables: { email: memberEmail.trim() } });
      setMemberEmail("");
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

  async function handleLeaveSpace() {
    if (!activeSpace) return;
    try {
      await leaveSpace({ variables: { ownerAuthId: activeSpace.id } });
      const ownSpace = spaces.find((s) => s.isOwner);
      if (ownSpace) switchSpace(ownSpace.id);
      navigate("/");
    } catch {
      alert("Failed to leave space.");
    }
  }

  return (
    <>
      <h1 className="text-2xl font-semibold mb-6">Space Settings</h1>

      {isOwner ? (
        <>
          {/* Jira Integration */}
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

          {/* Members */}
          <section className="mb-8">
            <h2 className="text-lg font-medium mb-4">Members</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Invite others by email to give them full access to your space.
            </p>
            <form onSubmit={handleAddMember} className="flex gap-2 mb-4">
              <Input
                type="email"
                placeholder="user@example.com"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
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
        </>
      ) : (
        /* Viewing someone else's space — show owner info and leave option */
        <section className="mb-8">
          <h2 className="text-lg font-medium mb-4">This Space</h2>
          {activeSpace && (
            <div className="flex items-center gap-3 rounded-lg border p-4 mb-6 max-w-sm">
              {activeSpace.image ? (
                <img src={activeSpace.image} alt="" className="size-10 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <div className="size-10 rounded-full bg-muted" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{activeSpace.name}</p>
                <p className="text-xs text-muted-foreground truncate">{activeSpace.email}</p>
              </div>
            </div>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">Leave Space</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Leave {activeSpace?.name}'s space?</AlertDialogTitle>
                <AlertDialogDescription>
                  You will lose access to {activeSpace?.name}'s data. The owner can re-add you later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleLeaveSpace}>Leave</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      )}
    </>
  );
}
