"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { authClient, useSession } from "@/lib/auth-client";

export function SiteHeader() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          DriveHub
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/cars" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Browse Cars
          </Link>
          {isPending ? null : session ? (
            <>
              <NotificationBell />
              <Link href="/account" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                {session.user.name}
              </Link>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/sign-in" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Sign in
              </Link>
              <Button asChild size="sm">
                <Link href="/sign-up">Sign up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
