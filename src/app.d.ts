// src/app.d.ts
declare global {
  namespace App {
    interface Locals {}
    interface PageData {}
    interface Error {
      message: string;
      retryAfter?: number;
    }
    interface Platform {}
  }
}

export {};