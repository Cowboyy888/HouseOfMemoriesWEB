import { z } from "zod";

export const AiRequestLogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(5),
});
export type AiRequestLogQuery = z.infer<typeof AiRequestLogQuerySchema>;
