// src/routes/s/verify/+page.server.ts
// Public route — loads nothing from DB.
// DB is only touched when the user submits the search (calls /api/verify/lookup).
export const load = () => ({});