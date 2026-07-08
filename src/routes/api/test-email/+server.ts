// src/routes/api/test-email/+server.ts
import { json } from '@sveltejs/kit'
import { testEmailConnection } from '$lib/server/auth/email'

export async function GET() {
  const result = await testEmailConnection()
  return json(result)
}