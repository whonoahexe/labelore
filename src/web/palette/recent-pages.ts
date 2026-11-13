// RED stub (13-05 Task 1): the signatures the tests pin, with neutral behaviour. Replaced in the GREEN commit.

export const RECENT_LIMIT = 5;

export interface RecentEntry {
  path: string;
  title: string;
  at: number;
}

export interface RecentStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function recentKey(_slug: string, _scope: string | null): string {
  return '';
}

export function readRecent(_storage: RecentStorage | null, _key: string): RecentEntry[] {
  return [];
}

export function recordRecent(_storage: RecentStorage | null, _key: string, _entry: RecentEntry): RecentEntry[] {
  return [];
}

export function browserStorage(): RecentStorage | null {
  return null;
}
