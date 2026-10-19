import type { ChallengeInput } from "@/lib/data";

export type ParsedChallenge = {
  error?: string;
  status?: number;
  value?: {
    id: string | null;
    title: string;
    category: string;
    flag: string;
    scoring: string;
    points: number;
    initial: number | null;
    minimum: number | null;
    decay: number | null;
    description: string;
    hints: string[];
  };
};

function int(x: unknown): number {
  const n = parseInt(String(x), 10);
  return Number.isFinite(n) ? n : NaN;
}

function slugify(s: string): string {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48);
}

function normaliseHints(h: unknown): string[] {
  if (Array.isArray(h)) return h.filter(Boolean) as string[];
  if (typeof h === "string") return h.split("\n").map((x) => x.trim()).filter(Boolean);
  return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseChallenge(body: any, needId: boolean): ParsedChallenge {
  const title = String(body?.title ?? "").trim();
  const category = String(body?.category ?? "").trim() || "Misc";
  const flag = String(body?.flag ?? "").trim();
  const scoring = body?.scoring === "dynamic" ? "dynamic" : "static";

  if (!title) return { error: "Title is required." };
  if (!flag) return { error: "Flag is required." };

  let id: string | null = null;
  if (needId) {
    id = slugify(body?.id || body?.title || "");
    if (!id) return { error: "An id (or title to derive it) is required." };
  }

  let points: number;
  let initial: number | null;
  let minimum: number | null;
  let decay: number | null;

  if (scoring === "dynamic") {
    initial = int(body?.initial);
    minimum = int(body?.minimum);
    decay = int(body?.decay);
    if (!(initial > 0)) return { error: "Initial value must be a positive number." };
    if (!(minimum >= 0)) return { error: "Minimum value must be zero or more." };
    if (minimum > initial) return { error: "Minimum can't be greater than initial." };
    if (!(decay >= 1)) return { error: "Decay (solves to reach minimum) must be at least 1." };
    points = initial;
  } else {
    points = int(body?.points);
    if (!(points >= 0)) return { error: "Points must be a non-negative number." };
    initial = minimum = decay = null;
  }

  return {
    value: {
      id,
      title,
      category,
      flag,
      scoring,
      points,
      initial,
      minimum,
      decay,
      description: String(body?.description ?? ""),
      hints: normaliseHints(body?.hints),
    },
  };
}

export type { ChallengeInput };
