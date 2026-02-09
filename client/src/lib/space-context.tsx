import { createContext, useContext, useEffect, useMemo } from "react";
import { gql, useQuery } from "@apollo/client";
import { apolloClient, setActiveSpaceId, getActiveSpaceId } from "@/lib/apollo-client";

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

  // Resolve active space: use stored ID if still valid, otherwise fall back to own space
  const activeSpace = useMemo(() => {
    if (spaces.length === 0) return null;
    const storedId = localStorage.getItem(STORAGE_KEY);
    const found = storedId ? spaces.find((s) => s.id === storedId) : null;
    return found ?? spaces.find((s) => s.isOwner) ?? spaces[0];
  }, [spaces]);

  // Keep module-level ID in sync
  useEffect(() => {
    if (activeSpace) {
      setActiveSpaceId(activeSpace.id);
      localStorage.setItem(STORAGE_KEY, activeSpace.id);
    }
  }, [activeSpace]);

  // On initial mount, restore stored space ID so first query uses correct header
  useEffect(() => {
    const storedId = localStorage.getItem(STORAGE_KEY);
    if (storedId && !getActiveSpaceId()) {
      setActiveSpaceId(storedId);
    }
  }, []);

  function switchSpace(id: string) {
    setActiveSpaceId(id);
    localStorage.setItem(STORAGE_KEY, id);
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
