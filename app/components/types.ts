export type ChallengeView = {
  id: number;
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

export type CtfListItem = { slug: string; name: string; tagline: string; challenges: number; teams: number };

export type AdminChallenge = {
  id: number;
  ctfId: number;
  slug: string;
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
  canManage: boolean;
};

export type AdminTeam = { id: number; name: string; score: number; solved: number };

export type AdminCtf = {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  frozen: boolean;
  challenges: number;
  teams: number;
};

export type AdminPage = {
  id: number;
  ctfId: number;
  slug: string;
  title: string;
  body: string;
  sortOrder: number | null;
};

export type Organiser = { id: number; username: string; role: string; scope: number[] };
export type OrganiserChallenge = { id: number; title: string; ctf: string };
