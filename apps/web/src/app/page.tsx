import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight">DriveHub</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Rent or buy your next car — one platform, one fleet.
      </p>
      <Button asChild className="mt-6" size="lg">
        <Link href="/cars">Browse Cars</Link>
      </Button>
    </main>
  );
}
