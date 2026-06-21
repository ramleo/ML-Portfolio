// Streaming CSV parser — handles files >50MB without loading the entire file
// as a string. Reads in 64KB chunks, so peak memory = one chunk + parsed rows.
//
// Two exports:
//   parseCSVStream        — onDone receives string[][]  (row[0] is the header row)
//   parseCSVStreamFS      — onDone receives { headers, rows } (FS-tool format)

// ── Low-level line parser ─────────────────────────────────────────────────────

function parseLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let inQ = false;
  for (let i = 0; i <= line.length; i++) {
    const ch = line[i];
    if (i === line.length || (!inQ && ch === ",")) {
      // unquoted: trim whitespace; quoted: strip surrounding quotes + unescape ""
      const t = cell.trim();
      if (t.startsWith('"') && t.endsWith('"')) {
        cells.push(t.slice(1, -1).replace(/""/g, '"'));
      } else {
        cells.push(t);
      }
      cell = "";
    } else {
      cell += ch;
      if (ch === '"') inQ = !inQ;
    }
  }
  return cells;
}

// ── Shared streaming core ─────────────────────────────────────────────────────

function streamCore(
  file: File,
  onDone: (rows: string[][]) => void,
  onError: (msg: string) => void
): void {
  if (typeof file.stream !== "function") {
    onError("File streaming not supported in this browser.");
    return;
  }

  const reader = file
    .stream()
    .pipeThrough(new TextDecoderStream())
    .getReader();

  const rows: string[][] = [];
  let partial = "";

  function processChunk(chunk: string): void {
    const combined = partial + chunk;
    // Normalise \r\n → \n and lone \r → \n
    const normalised = combined.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = normalised.split("\n");
    // Last element may be an incomplete line — keep in buffer
    partial = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim() === "") continue;
      rows.push(parseLine(line));
    }
  }

  function pump(): void {
    reader
      .read()
      .then(({ done, value }) => {
        if (done) {
          // Flush any remaining content
          if (partial.trim() !== "") {
            rows.push(parseLine(partial));
          }
          onDone(rows);
          return;
        }
        processChunk(value);
        pump();
      })
      .catch((err: unknown) => {
        onError(err instanceof Error ? err.message : "Stream read error");
      });
  }

  pump();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Stream-parse a CSV File.
 * onDone receives string[][] where row[0] is the header row.
 * Compatible with callers that previously used parseCSV from preprocessing.ts
 * or feAlgorithms.ts.
 */
export function parseCSVStream(
  file: File,
  onDone: (rows: string[][]) => void,
  onError: (msg: string) => void
): void {
  streamCore(file, onDone, onError);
}

/**
 * Stream-parse a CSV File.
 * onDone receives { headers: string[]; rows: string[][] }.
 * Compatible with callers that previously used parseCSV from fsCore.ts /
 * fsAlgorithms.ts (feature-selection tool format).
 */
export function parseCSVStreamFS(
  file: File,
  onDone: (result: { headers: string[]; rows: string[][] }) => void,
  onError: (msg: string) => void
): void {
  streamCore(file, (allRows) => {
    if (allRows.length < 2) {
      onDone({ headers: [], rows: [] });
      return;
    }
    onDone({ headers: allRows[0], rows: allRows.slice(1) });
  }, onError);
}
