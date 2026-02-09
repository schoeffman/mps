import { ApolloClient, InMemoryCache, ApolloLink, HttpLink } from "@apollo/client";

let activeSpaceId: string | null = localStorage.getItem("mps-active-space-id");

export function setActiveSpaceId(id: string | null) {
  activeSpaceId = id;
}

export function getActiveSpaceId(): string | null {
  return activeSpaceId;
}

const spaceHeaderLink = new ApolloLink((operation, forward) => {
  if (activeSpaceId) {
    operation.setContext(({ headers = {} }: { headers?: Record<string, string> }) => ({
      headers: {
        ...headers,
        "x-space-id": activeSpaceId,
      },
    }));
  }
  return forward(operation);
});

const httpLink = new HttpLink({
  uri: "/graphql",
  credentials: "include",
});

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([spaceHeaderLink, httpLink]),
  cache: new InMemoryCache(),
});
