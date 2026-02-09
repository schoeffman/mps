import { createContext, useContext, useState, useMemo } from "react";
import { gql, useQuery } from "@apollo/client";
import { apolloClient, setActiveSpaceId } from "@/lib/apollo-client";

const MY_SPACES = gql`
  query MySpaces {
    mySpaces {
      id
      name
      email
      image
      isOwner
    }
  }
`;

export interface Space {
  id: string;
  name: string;
  email: string;
  image: string | null;
  isOwner: boolean;
}

interface SpaceContextValue {
  spaces: Space[];
  activeSpace: Space | null;
  isOwner: boolean;
  switchSpace: (id: string) => void;
  loading: boolean;
}

const SpaceContext = createContext<SpaceContextValue>({
  spaces: [],
  activeSpace: null,
  isOwner: true,
  switchSpace: () => {},
  loading: true,
});

const STORAGE_KEY = "mps-active-space-id";

export function SpaceProvider({ children }: { children: React.ReactNode }) {
  const { data, loading } = useQuery<{ mySpaces: Space[] }>(MY_SPACES);
  const spaces = data?.mySpaces ?? [];

  // React state drives which space is selected — initialized from localStorage
  const [activeId, setActiveId] = useState(() => localStorage.getItem(STORAGE_KEY));

  // Resolve active space: match activeId in the spaces list, fall back to own space
  const activeSpace = useMemo(() => {
    if (spaces.length === 0) return null;
    const found = activeId ? spaces.find((s) => s.id === activeId) : null;
    return found ?? spaces.find((s) => s.isOwner) ?? spaces[0];
  }, [spaces, activeId]);

  function switchSpace(id: string) {
    // Update React state (triggers re-render), module var (for Apollo link), and localStorage
    setActiveId(id);
    setActiveSpaceId(id);
    localStorage.setItem(STORAGE_KEY, id);
    // Refetch all active queries with the new x-space-id header
    apolloClient.resetStore();
  }

  const isOwner = activeSpace?.isOwner ?? true;

  return (
    <SpaceContext.Provider value={{ spaces, activeSpace, isOwner, switchSpace, loading }}>
      {children}
    </SpaceContext.Provider>
  );
}

export function useSpace() {
  return useContext(SpaceContext);
}
