// src/app.d.ts
import type { User } from '@prisma/client';

declare global {
  namespace App {
    interface Locals {
      user: User | null;
    }
    interface PageData {}
    interface Error {}
    interface Platform {}
  }
}

export {};