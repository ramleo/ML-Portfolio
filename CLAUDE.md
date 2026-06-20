@AGENTS.md

## Rules — follow always, no exceptions

1. **"first tell" = stop** — if the user says "first tell", "pehle bata", or any variant: only answer in text, no code, no agents, no edits. Wait for explicit "proceed" or "haan kar" before doing anything.

2. **Subagents always** — any task touching 2+ files, or generating >100 lines of new code, or parallelisable work: use subagents. Do not wait to be reminded.

3. **No file over 400 lines** — before touching any file, check its line count (`wc -l`). If it is over 350 lines, modularize it first via a subagent, then add the feature.
