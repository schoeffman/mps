export interface JiraIssue {
  key: string;
  summary: string;
  status: string;
  statusColor: string;
  assignee: string | null;
}

export interface JiraTransition {
  id: string;
  name: string;
}

export async function fetchJiraTransitions(
  domain: string,
  email: string,
  apiToken: string,
  issueKey: string,
): Promise<JiraTransition[]> {
  const baseUrl = `https://${domain}.atlassian.net`;
  const url = `${baseUrl}/rest/api/3/issue/${issueKey}/transitions`;

  const auth = Buffer.from(`${email}:${apiToken}`).toString("base64");

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Jira API error (${response.status}): ${text}`);
  }

  const data = await response.json();

  return (data.transitions ?? []).map((t: { id: string; name: string }) => ({
    id: t.id,
    name: t.name,
  }));
}

export async function transitionJiraIssue(
  domain: string,
  email: string,
  apiToken: string,
  issueKey: string,
  transitionId: string,
): Promise<void> {
  const baseUrl = `https://${domain}.atlassian.net`;
  const url = `${baseUrl}/rest/api/3/issue/${issueKey}/transitions`;

  const auth = Buffer.from(`${email}:${apiToken}`).toString("base64");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ transition: { id: transitionId } }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Jira API error (${response.status}): ${text}`);
  }
}

export async function fetchJiraIssues(
  domain: string,
  email: string,
  apiToken: string,
  projectKey: string,
): Promise<JiraIssue[]> {
  const baseUrl = `https://${domain}.atlassian.net`;
  const url = `${baseUrl}/rest/api/3/search/jql`;

  const auth = Buffer.from(`${email}:${apiToken}`).toString("base64");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jql: projectKey.includes("-")
        ? `parent=${projectKey} ORDER BY created DESC`
        : `project=${projectKey} ORDER BY created DESC`,
      maxResults: 250,
      fields: ["summary", "status", "assignee"],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Jira API error (${response.status}): ${text}`);
  }

  const data = await response.json();

  return (data.issues ?? []).map((issue: {
    key: string;
    fields: {
      summary: string;
      status: { name: string; statusCategory: { colorName: string } };
      assignee: { displayName: string } | null;
    };
  }) => ({
    key: issue.key,
    summary: issue.fields.summary,
    status: issue.fields.status.name,
    statusColor: issue.fields.status.statusCategory.colorName,
    assignee: issue.fields.assignee?.displayName ?? null,
  }));
}
