import { useQuery, gql } from "@apollo/client";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

const HELLO_QUERY = gql`
  query Hello {
    hello
  }
`;

export default function App() {
  const { loading, error, data } = useQuery(HELLO_QUERY);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4">
          {loading && <p>Loading...</p>}
          {error && <p>Error: {error.message}</p>}
          {data && (
            <>
              <h1>MPS</h1>
              <p>{data.hello}</p>
            </>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
