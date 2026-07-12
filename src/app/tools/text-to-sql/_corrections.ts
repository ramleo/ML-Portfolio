const storeKey = (dbRef: string) => `ml_sql_corrections_${dbRef}`;

function normalize(q: string): string {
  return q.trim().toLowerCase().slice(0, 100);
}

export function getCorrection(dbRef: string, question: string): string {
  try {
    const store = JSON.parse(localStorage.getItem(storeKey(dbRef)) ?? "{}");
    return store[normalize(question)] ?? "";
  } catch { return ""; }
}

export function saveCorrection(dbRef: string, question: string, correction: string): void {
  try {
    const store = JSON.parse(localStorage.getItem(storeKey(dbRef)) ?? "{}");
    store[normalize(question)] = correction.trim();
    localStorage.setItem(storeKey(dbRef), JSON.stringify(store));
  } catch {}
}

export function deleteCorrection(dbRef: string, question: string): void {
  try {
    const store = JSON.parse(localStorage.getItem(storeKey(dbRef)) ?? "{}");
    delete store[normalize(question)];
    localStorage.setItem(storeKey(dbRef), JSON.stringify(store));
  } catch {}
}