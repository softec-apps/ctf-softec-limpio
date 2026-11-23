export interface CompetitionStatus {
  open: boolean;
  closedAt: string | null;
  revision: number;
  updatedAt: string;
}

export type AdminUserResults = {
  user: {
    id: string;
    alias: string;
    role: "ADMIN" | "PARTICIPANT";
    createdAt: string;
  };
  score: number;
  incorrectAttempts: number;
  solved: number;
  results: {
    id: string;
    title: string;
    category: string;
    points: number;
    createdAt: string | null;
    enabled: boolean;
    hidden: boolean;
  }[];
  ranking: {
    position: number;
    lastSolve: number | null;
    peers: {
      alias: string;
      position: number;
      score: number;
      lastSolve: number | null;
      incorrectAttempts: number;
    }[];
  } | null;
  updatedAt: string;
};

export type PublicCompetition = {
  updatedAt: string;
  competition: { open: boolean; closedAt: string | null };
  stats: {
    participants: number;
    resolutions: number;
    attempts: number;
    challenges: number;
    available: number;
    maxScore: number;
  };
  entries: {
    position: number;
    alias: string;
    score: number;
    solved: number;
    incorrectAttempts: number;
  }[];
  categories: {
    name: string;
    challenges: number;
    solved: number;
    resolutions: number;
  }[];
  activity: {
    alias: string;
    title: string;
    points: number;
    createdAt: string;
  }[];
};
