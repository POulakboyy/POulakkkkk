// The engine must never depend on the host time zone: every API takes an explicit IANA zone.
// Pinning the process to UTC makes accidental use of local time fail loudly in tests.
const proc = (globalThis as { process?: { env: Record<string, string | undefined> } }).process;
if (proc) proc.env.TZ = 'UTC';
