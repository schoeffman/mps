import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "@/lib/auth-client";
import { SpaceProvider } from "@/lib/space-context";

export function ProtectedRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SpaceProvider>
      <Outlet />
    </SpaceProvider>
  );
}
