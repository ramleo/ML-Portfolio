// Per-visitor saved tests + run history for Testwright Run. The site has no
// login, so this lives in the browser (localStorage) — same pattern as the
// Text-to-SQL tool's saved queries. Every access is guarded: storage can be
// unavailable (private window, blocked) or throw.

export type SavedTest = { id: string; name: string; code: string; savedAt: number };
export type HistoryEntry = {
  id: string;
  name: string;
  status: "passed" | "failed" | "error";
  at: number;
  correlationId: string | null;
  code: string;
};

const SAVED_KEY = "qa_saved_tests";
const HISTORY_KEY = "qa_run_history";
const MAX_SAVED = 50;
const MAX_HISTORY = 40;

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, val: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch { /* quota / unavailable — silently skip */ }
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function getSavedTests(): SavedTest[] {
  return read<SavedTest>(SAVED_KEY).sort((a, b) => b.savedAt - a.savedAt);
}

export function saveTest(name: string, code: string): SavedTest {
  const entry: SavedTest = { id: uid(), name: name.trim() || "Untitled test", code, savedAt: Date.now() };
  const next = [entry, ...read<SavedTest>(SAVED_KEY).filter((t) => t.code !== code)].slice(0, MAX_SAVED);
  write(SAVED_KEY, next);
  return entry;
}

export function deleteSavedTest(id: string): void {
  write(SAVED_KEY, read<SavedTest>(SAVED_KEY).filter((t) => t.id !== id));
}

export function getHistory(): HistoryEntry[] {
  return read<HistoryEntry>(HISTORY_KEY).sort((a, b) => b.at - a.at);
}

export function addHistory(e: Omit<HistoryEntry, "id" | "at">): void {
  const entry: HistoryEntry = { ...e, id: uid(), at: Date.now() };
  write(HISTORY_KEY, [entry, ...read<HistoryEntry>(HISTORY_KEY)].slice(0, MAX_HISTORY));
}

export function clearHistory(): void {
  write(HISTORY_KEY, []);
}
