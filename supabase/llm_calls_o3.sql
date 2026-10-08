-- O3 (observability): per-call token + cost telemetry on the existing llm_calls
-- table. Additive and idempotent — safe to run on the live table, and a no-op
-- on re-run. Run once in the Supabase SQL editor.
--
-- No trace_id column: llm_calls already has run_id, which IS the trace id the
-- frontend mints and sends as x-trace-id (observability O1). Correlation works
-- today; O3 only adds the cost/token fields.

alter table public.llm_calls add column if not exists input_tokens  integer;
alter table public.llm_calls add column if not exists output_tokens integer;
alter table public.llm_calls add column if not exists cost_usd      numeric(12,6);
alter table public.llm_calls add column if not exists operation     text default 'chat';
