"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/contexts/AppContext";

/**
 * AuthGuard – wraps any protected page.
 * - While auth is loading (initial Supabase session check), shows a spinner.
 * - If auth is done and user is not logged in, redirects to /login.
 * - If requireAdmin=true and user is not admin, redirects to /dashboard.
 * - Once all checks pass, renders children.
 */
export default function AuthGuard({
  children,
  requireAdmin = false,
}: {
  children: React.ReactNode;
  requireAdmin?: boolean;
}) {
  const { currentUser, authLoading } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return; // wait until we know
    if (!currentUser) {
      router.replace("/login");
    } else if (requireAdmin && currentUser.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [authLoading, currentUser, requireAdmin, router]);

  // Spinner while checking session
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Don't render children until we confirm the user is valid
  if (!currentUser) return null;
  if (requireAdmin && currentUser.role !== "admin") return null;

  return <>{children}</>;
}
