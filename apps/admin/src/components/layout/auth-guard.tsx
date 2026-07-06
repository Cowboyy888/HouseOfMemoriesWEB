"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useSession } from "@/lib/auth-client";

/**
 * Authentication check only — redirects to /sign-in if there's no session.
 * Authorization (which roles can see which data) is enforced server-side by
 * PermissionsGuard; duplicating that logic here would just be a second,
 * driftable copy of the same rule.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/sign-in");
    }
  }, [isPending, session, router]);

  if (isPending || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>
    );
  }

  return <>{children}</>;
}
