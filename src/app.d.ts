// src/app.d.ts
import type { User, Session } from '$lib/server/auth/types';

declare global {
  namespace App {
    interface Error {
      message: string;
      code?: string;
    }
    interface Locals {
      user: User | null;
      session: Session | null;
      systemState: 'maintenance' | 'shutdown' | 'vpn_blocked' | null;
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

declare module '$service-worker' {
	export const build: string[];
	export const files: string[];
	export const version: string;
}

export {};