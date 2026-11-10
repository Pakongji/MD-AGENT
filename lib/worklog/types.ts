/** JSON contract shared by the journal API, Excel export and browser UI. */
export type WorklogRow = {
  id: string;
  type: string;
  title: string;
  status: string;
  completedAt: string;
  due: string;
  result: string;
  blocker: string;
  next: string;
  owner: string;
  source: string;
  href: string;
};

export type WorklogReport = {
  label: string;
  start: string;
  end: string;
  asOf: string;
  trackingSince: string;
  completed: number;
  pending: number;
  blockers: number;
  calendar: number;
  rows: WorklogRow[];
  followups: WorklogRow[];
  achievements: string[];
  blockerGroups: { name: string; count: number }[];
};
