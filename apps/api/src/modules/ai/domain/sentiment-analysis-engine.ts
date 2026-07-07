export interface SentimentAnalysisInput {
  text: string;
}

export interface SentimentAnalysisResult {
  label: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  score: number;
  highlights: string[];
}

const POSITIVE_WORDS = ["great", "excellent", "smooth", "friendly", "fast", "love", "perfect", "amazing", "good", "easy"];
const NEGATIVE_WORDS = ["terrible", "bad", "slow", "frustrating", "issue", "problem", "awful", "poor", "late", "damage"];

export function analyzeSentiment(input: SentimentAnalysisInput): SentimentAnalysisResult {
  const normalized = input.text.toLowerCase();
  const highlights: string[] = [];

  let score = 0;
  for (const word of POSITIVE_WORDS) {
    if (normalized.includes(word)) {
      score += 0.2;
      highlights.push(word);
    }
  }

  for (const word of NEGATIVE_WORDS) {
    if (normalized.includes(word)) {
      score -= 0.25;
      highlights.push(word);
    }
  }

  let label: SentimentAnalysisResult["label"] = "NEUTRAL";
  if (score > 0.2) {
    label = "POSITIVE";
  } else if (score < -0.2) {
    label = "NEGATIVE";
  }

  return {
    label,
    score: Number(score.toFixed(2)),
    highlights,
  };
}
