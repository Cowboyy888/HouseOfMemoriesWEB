import type { Metadata } from "next";
import { SignInForm } from "@/features/auth/components/sign-in-form";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to the DriveHub admin dashboard.",
};

export default function AdminSignInPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="font-heading text-2xl font-bold tracking-tight">DriveHub Admin</h1>
      <p className="mt-1 text-muted-foreground">Sign in with your staff account.</p>
      <div className="mt-6">
        <SignInForm />
      </div>
    </main>
  );
}
