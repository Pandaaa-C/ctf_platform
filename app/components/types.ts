export type ChallengeView = {
  id: string;
  title: string;
  category: string;
  value: number;
  dynamic: boolean;
  minimum: number | null;
  initial: number | null;
  description: string | null;
  hints: string[];
  solves: number;
  firstBlood: string | null;
  solved: boolean;
};

export type ChallengesResponse = {
  team: string;
  categories: Record<string, ChallengeView[]>;
  totalPoints: number;
  myScore: number;
  solvedCount: number;
  totalCount: number;
};

export type SubmitResult = {
  status: "correct" | "wrong" | "already";
  message: string;
  points?: number;
  dynamic?: boolean;
  firstBlood?: boolean;
};

export type Standing = { rank: number; name: string; score: number; solved: number };
export type SeriesLine = { name: string; line: { t: number; score: number }[] };
export type ScoreboardResponse = { frozen: boolean; standings: Standing[]; series: SeriesLine[] };

export type AdminChallenge = {
  id: string;
  title: string;
  category: string;
  points: number;
  description: string | null;
  flag: string;
  hints: string[];
  scoring: string;
  initial: number | null;
  minimum: number | null;
  decay: number | null;
  solves: number;
};

export type AdminTeam = { id: number; name: string; score: number; solved: number };
