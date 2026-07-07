import { z } from "zod";

export const AiStatusResponseSchema = z.object({
  configured: z.boolean(),
  provider: z.enum(["OPENAI", "ANTHROPIC"]),
});
export type AiStatusResponse = z.infer<typeof AiStatusResponseSchema>;
