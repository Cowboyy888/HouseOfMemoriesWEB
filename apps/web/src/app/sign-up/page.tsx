import Link from "next/link";
import type { Metadata } from "next";
import { SignUpForm } from "@/features/auth/components/sign-up-form";

export const metadata: Metadata = {
  title: "Create Account | DriveHub",
  description: "Create a DriveHub account to book rentals, buy cars, and manage your bookings.",
};

export default function SignUpPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
      <p className="mt-1 text-muted-foreground">Book rentals and buy cars with DriveHub.</p>
      <div className="mt-6">
        <SignUpForm />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </main>
  );
}
