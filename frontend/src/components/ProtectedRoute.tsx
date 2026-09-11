import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet } from "react-router-dom";
import { fetchMe } from "@/lib/session";

export default function ProtectedRoute() {
  const me = useQuery({ queryKey: ["me"], queryFn: fetchMe, retry: false });

  if (me.isPending) {
    return (
      <main className="paper-noise flex min-h-svh items-center justify-center bg-[var(--linen)] px-6" data-testid="auth-loading-state">
        <div className="h-2 w-24 animate-pulse rounded-full bg-[var(--terracotta-soft)]" data-testid="auth-loading-bar" />
      </main>
    );
  }

  if (me.isError || !me.data) return <Navigate to="/login" replace />;
  return <Outlet />;
}
