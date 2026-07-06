"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/lib/auth-client";

export default function AccountPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/sign-in");
    }
  }, [isPending, session, router]);

  if (isPending || !session) {
    return <main className="mx-auto max-w-2xl px-4 py-16 text-muted-foreground">Loading...</main>;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-bold tracking-tight">My Account</h1>
      <dl className="mt-6 grid grid-cols-1 gap-4 rounded-xl border p-6 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase text-muted-foreground">Name</dt>
          <dd className="font-medium">{session.user.name}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-muted-foreground">Email</dt>
          <dd className="font-medium">{session.user.email}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-muted-foreground">Email verified</dt>
          <dd className="font-medium">{session.user.emailVerified ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-muted-foreground">Member since</dt>
          <dd className="font-medium">{new Date(session.user.createdAt).toLocaleDateString()}</dd>
        </div>
      </dl>
      <p className="mt-6 text-sm text-muted-foreground">
        Booking history and rental tracking will show up here once the Booking feature is built.
      </p>
    </main>
  );
}
