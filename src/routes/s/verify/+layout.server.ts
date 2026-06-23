// src/routes/s/verify/+layout.server.ts
// Overrides any parent layout.server.ts auth guard for this subtree.
// Both /s/verify and /s/verify/[resultId] are public — no login required.
export const load = () => ({});