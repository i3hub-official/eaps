// src/app.d.ts
import type { CachedUser } from '$lib/server/auth/session.js';

declare global {
  namespace App {
    interface Locals {
      user: CachedUser | null;
    }
    interface PageData {}
    interface Error {
      message: string;
      retryAfter?: number;
    }
    interface Platform {}
  }
}

export {};