import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AiAssistant } from "@/features/ai/components/ai-assistant";
import { AiRecommendations } from "@/features/ai/components/ai-recommendations";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-5xl flex-col items-center px-4 py-12 text-center">
      <h1 className="text-4xl font-bold tracking-tight">DriveHub</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        Rent or buy your next car — one platform, one fleet.
      </p>
      <Button asChild className="mt-6" size="lg">
        <Link href="/cars">Browse Cars</Link>
      </Button>
      <AiAssistant />
      <AiRecommendations />
    </main>
  );
}
