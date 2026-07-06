import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  hint?: string;
  tone?: "neutral" | "good" | "warning" | "critical";
}

// Status tones map to the dataviz skill's fixed status palette — reserved
// for state, never reused as a categorical series color.
const TONE_CLASSES: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  neutral: "text-foreground",
  good: "text-[#0ca30c] dark:text-[#3ecf3e]",
  warning: "text-[#a86400] dark:text-[#fab219]",
  critical: "text-[#d03b3b] dark:text-[#f2685f]",
};

export function KpiCard({ label, value, icon, hint, tone = "neutral" }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className={cn("font-heading text-2xl font-semibold tabular-nums", TONE_CLASSES[tone])}>
          {value}
        </div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
