// src/app.d.ts
import type { User } from '@prisma/client';
import type { CachedUser } from '$lib/server/auth/session.js';


declare global {
  namespace App {
    interface Locals {
      user: CachedUser | null;
    }
    interface PageData {}
    interface Error {}
    interface Platform {}
  }
}

export {};