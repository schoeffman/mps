export interface AtlassianProjectData {
  name: string;
  status: string | null;
  dueDate: string | null;
  latestUpdate: {
    status: string | null;
    summary: string | null;
    date: string | null;
  } | null;
}

async function fetchCloudId(domain: string, auth: string): Promise<string> {
  const response = await fetch(`https://${domain}.atlassian.net/_edge/tenant_info`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch cloud ID (${response.status}): ${text}`);
  }
  const data = await response.json();
  if (!data.cloudId) {
    throw new Error("Cloud ID not found in tenant info response");
  }
  return data.cloudId;
}

export async function fetchAtlassianProject(
  domain: string,
  email: string,
  apiToken: string,
  projectKey: string,
): Promise<AtlassianProjectData> {
  const graphqlUrl = `https://${domain}.atlassian.net/gateway/api/graphql`;
  const auth = Buffer.from(`${email}:${apiToken}`).toString("base64");

  const cloudId = await fetchCloudId(domain, auth);
  const containerId = `ari:cloud:townsquare::site/${cloudId}`;

  const query = `
    query GetAtlassianProject($projectKey: String!, $containerId: ID!) {
      projects_byKey(projectKey: $projectKey, containerId: $containerId) @optIn(to: "Townsquare") {
        name
        dueDate {
          dateRange {
            start
            end
          }
        }
        state {
          label
        }
        updates(first: 1) {
          edges {
            node {
              summary
              creationDate
            }
          }
        }
      }
    }
  `;

  const response = await fetch(graphqlUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query,
      variables: { projectKey, containerId },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Atlassian API error (${response.status}): ${text}`);
  }

  const data = await response.json();

  if (data.errors?.length) {
    throw new Error(`Atlassian GraphQL error: ${data.errors[0].message}`);
  }

  const project = data.data?.projects_byKey;
  if (!project) {
    throw new Error(`Atlassian project not found: ${projectKey}`);
  }

  const dueEnd = project.dueDate?.dateRange?.end ?? null;
  const updateNode = project.updates?.edges?.[0]?.node ?? null;

  return {
    name: project.name,
    status: project.state?.label ?? null,
    dueDate: dueEnd,
    latestUpdate: updateNode
      ? {
          status: null,
          summary: updateNode.summary ?? null,
          date: updateNode.creationDate ?? null,
        }
      : null,
  };
}
