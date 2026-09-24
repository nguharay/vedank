

export const DIGIT_FLOW_TOPICS = new Set(["add9", "sub9", "add8sub8"]);

export const DIGIT_ARROW_EX: Record<string, { before: string; tensLabel: string; unitsLabel: string; after: string; eq: string }> = {
  add9: { before: "36", tensLabel: "+1", unitsLabel: "−1", after: "45", eq: "36 + 9" },
  sub9: { before: "36", tensLabel: "−1", unitsLabel: "+1", after: "27", eq: "36 − 9" },
  add8sub8: { before: "73", tensLabel: "+1", unitsLabel: "−2", after: "81", eq: "73 + 8" },
};
