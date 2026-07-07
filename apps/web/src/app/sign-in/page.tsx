import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "@/features/auth/components/sign-in-form";

export const metadata: Metadata = {
  title: "Sign In | DriveHub",
  description: "Sign in to your DriveHub account.",
};

export default function SignInPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
      <p className="mt-1 text-muted-foreground">Welcome back to DriveHub.</p>
      <div className="mt-6">
        <Suspense fallback={null}>
          <SignInForm />
        </Suspense>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="font-medium text-foreground underline underline-offset-4">
          Create one
        </Link>
      </p>
    </main>
  );
}
