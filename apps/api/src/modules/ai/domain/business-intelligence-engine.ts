export interface ExecutiveInsightInput {
  totalRevenue: number;
  monthlyRevenue: number;
  activeRentals: number;
  activeCustomers: number;
  conversionRate: number;
  occupancyRate: number;
  topVehicle: string;
}

export interface ExecutiveInsights {
  summary: string;
  recommendations: string[];
}

export function buildExecutiveInsights(input: ExecutiveInsightInput): ExecutiveInsights {
  const recommendations: string[] = [];

  if (input.conversionRate < 0.1) {
    recommendations.push("Increase booking conversion with targeted offers");
  }

  if (input.occupancyRate > 0.7) {
    recommendations.push("Prioritize fleet availability on peak periods");
  } else {
    recommendations.push("Promote underutilized vehicles to improve occupancy");
  }

  if (input.monthlyRevenue > input.totalRevenue * 0.3) {
    recommendations.push("Scale the strongest-performing rental segments");
  }

  const summary = input.conversionRate >= 0.15 && input.occupancyRate >= 0.6
    ? `Business performance is healthy, with strong demand around ${input.topVehicle}.`
    : `Business performance is underperforming, with conversion and occupancy below target.`;

  return { summary, recommendations };
}
