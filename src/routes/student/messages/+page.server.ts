// src/routes/student/messages/+page.server.ts
import { fail, error } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import {
  listStudentConversations,
  getConversationForStudent,
  createConversation,
  sendMessage,
  resolveConversation,
} from '$lib/server/messaging/conversations'

export const load: PageServerLoad = async ({ locals, url }) => {
  const user = locals.user
  if (!user || user.type !== 'student') throw error(401, 'Not authenticated')

  const conversations = await listStudentConversations(user.id)

  const selectedId = url.searchParams.get('c')
  const selected = selectedId ? await getConversationForStudent(selectedId, user.id) : null

  return { conversations, selected }
}

export const actions: Actions = {
  start: async ({ request, locals }) => {
    const user = locals.user
    if (!user || user.type !== 'student') return fail(401, { startError: 'Not authenticated.' })

    const form = await request.formData()
    const subject = form.get('subject')?.toString() ?? ''
    const body = form.get('body')?.toString() ?? ''

    const result = await createConversation(user.id, user.departmentId, subject, body)
    if (!result.success) return fail(400, { startError: result.error })

    return { startSuccess: true, conversationId: result.conversationId }
  },

  send: async ({ request, locals }) => {
    const user = locals.user
    if (!user || user.type !== 'student') return fail(401, { sendError: 'Not authenticated.' })

    const form = await request.formData()
    const conversationId = form.get('conversationId')?.toString() ?? ''
    const body = form.get('body')?.toString() ?? ''

    const result = await sendMessage(conversationId, user.id, body)
    if (!result.success) return fail(400, { sendError: result.error })

    return { sendSuccess: true }
  },

  resolve: async ({ request, locals }) => {
    const user = locals.user
    if (!user || user.type !== 'student') return fail(401, { resolveError: 'Not authenticated.' })

    const form = await request.formData()
    const conversationId = form.get('conversationId')?.toString() ?? ''

    const result = await resolveConversation(conversationId, user.id)
    if (!result.success) return fail(400, { resolveError: result.error })

    return { resolveSuccess: true }
  },
}