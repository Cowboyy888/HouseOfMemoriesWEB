"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { ExecutiveSummary } from "@drivehub/contracts";

// Fixed order/colors per car status — categorical identity, not a ranking,
// so the mapping never changes based on which statuses are present in a
// given fetch (dataviz skill: "color follows the entity, never its rank").
const STATUS_ORDER = ["AVAILABLE", "RESERVED", "RENTED", "SOLD", "MAINTENANCE", "INACTIVE"] as const;

const chartConfig = {
  AVAILABLE: { label: "Available", color: "var(--chart-1)" },
  RESERVED: { label: "Reserved", color: "var(--chart-2)" },
  RENTED: { label: "Rented", color: "var(--chart-3)" },
  SOLD: { label: "Sold", color: "var(--chart-5)" },
  MAINTENANCE: { label: "Maintenance", color: "var(--chart-4)" },
  INACTIVE: { label: "Inactive", color: "var(--chart-6)" },
} satisfies ChartConfig;

export function CarsByStatusChart({ data }: { data: ExecutiveSummary["carsByStatus"] }) {
  const counts = new Map(data.map((row) => [row.status, row.count]));
  const chartData = STATUS_ORDER.filter((status) => (counts.get(status) ?? 0) > 0).map((status) => ({
    status,
    label: chartConfig[status].label,
    count: counts.get(status) ?? 0,
    fill: chartConfig[status].color,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Fleet by status</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No cars in the fleet yet.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <BarChart data={chartData} layout="vertical" margin={{ left: 16, right: 24 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="label"
                tickLine={false}
                axisLine={false}
                width={90}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={4}>
                {chartData.map((entry) => (
                  <Cell key={entry.status} fill={entry.fill} />
                ))}
                <LabelList dataKey="count" position="right" className="fill-foreground" fontSize={12} />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
