export interface JiraIssue {
  key: string;
  summary: string;
  status: string;
  statusColor: string;
  assignee: string | null;
}

export async function fetchJiraIssues(
  domain: string,
  email: string,
  apiToken: string,
  projectKey: string,
): Promise<JiraIssue[]> {
  const baseUrl = `https://${domain}.atlassian.net`;
  const jql = `project=${projectKey} ORDER BY created DESC`;
  const url = `${baseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=50&fields=summary,status,assignee`;

  const auth = Buffer.from(`${email}:${apiToken}`).toString("base64");

  const response = await fetch(url, {
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
