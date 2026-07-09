// src/lib/server/messaging/conversations.ts
// 1:1 support messaging between students and staff (exam officers, etc.)
// This file covers the student-facing operations. A staff-side inbox
// (claim/reply/close) is a separate future build on top of the same tables.

import { getPrismaClient } from '$lib/server/db/index.js'
import { revealName } from '$lib/security/dataProtection'

const MAX_SUBJECT_LENGTH = 150
const MAX_MESSAGE_LENGTH = 4000

function safeDecryptName(value: string | null | undefined): string {
  if (!value) return ''
  try {
    return revealName(value)
  } catch {
    return ''
  }
}

export interface ConversationSummary {
  id: string
  subject: string
  status: 'OPEN' | 'RESOLVED' | 'CLOSED'
  lastMessageAt: Date
  lastMessagePreview: string | null
  lastMessageFromStaff: boolean
  assignedToName: string | null
  unreadCount: number
}

export async function listStudentConversations(studentId: string): Promise<ConversationSummary[]> {
  const prisma = await getPrismaClient()

  const conversations = await prisma.conversation.findMany({
    where: { studentId },
    orderBy: { lastMessageAt: 'desc' },
    include: {
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      assignedTo: { select: { firstName: true, lastName: true } },
      _count: {
        select: { messages: { where: { senderType: 'staff', readAt: null } } },
      },
    },
  })

  return conversations.map((c) => {
    const last = c.messages[0]
    return {
      id: c.id,
      subject: c.subject,
      status: c.status as ConversationSummary['status'],
      lastMessageAt: c.lastMessageAt,
      lastMessagePreview: last?.body ?? null,
      lastMessageFromStaff: last?.senderType === 'staff',
      assignedToName: c.assignedTo
        ? `${safeDecryptName(c.assignedTo.firstName)} ${safeDecryptName(c.assignedTo.lastName)}`.trim() || null
        : null,
      unreadCount: c._count.messages,
    }
  })
}

export interface ConversationMessage {
  id: string
  body: string
  senderType: 'staff' | 'student'
  senderName: string | null
  createdAt: Date
  readAt: Date | null
}

export interface ConversationDetail {
  id: string
  subject: string
  status: 'OPEN' | 'RESOLVED' | 'CLOSED'
  assignedToName: string | null
  messages: ConversationMessage[]
}

/** Loads a conversation for the given student and marks unread staff messages as read. */
export async function getConversationForStudent(
  conversationId: string,
  studentId: string,
): Promise<ConversationDetail | null> {
  const prisma = await getPrismaClient()

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      assignedTo: { select: { firstName: true, lastName: true } },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: { senderStaff: { select: { firstName: true, lastName: true } } },
      },
    },
  })

  if (!conversation || conversation.studentId !== studentId) return null

  await prisma.message.updateMany({
    where: { conversationId, senderType: 'staff', readAt: null },
    data: { readAt: new Date() },
  })

  return {
    id: conversation.id,
    subject: conversation.subject,
    status: conversation.status as ConversationDetail['status'],
    assignedToName: conversation.assignedTo
      ? `${safeDecryptName(conversation.assignedTo.firstName)} ${safeDecryptName(conversation.assignedTo.lastName)}`.trim() || null
      : null,
    messages: conversation.messages.map((m) => ({
      id: m.id,
      body: m.body,
      senderType: m.senderType as 'staff' | 'student',
      senderName:
        m.senderType === 'staff' && m.senderStaff
          ? `${safeDecryptName(m.senderStaff.firstName)} ${safeDecryptName(m.senderStaff.lastName)}`.trim() || null
          : null,
      createdAt: m.createdAt,
      readAt: m.readAt,
    })),
  }
}

export async function createConversation(
  studentId: string,
  departmentId: string,
  subject: string,
  firstMessageBody: string,
): Promise<{ success: boolean; conversationId?: string; error?: string }> {
  const trimmedSubject = subject.trim().slice(0, MAX_SUBJECT_LENGTH)
  const trimmedBody = firstMessageBody.trim().slice(0, MAX_MESSAGE_LENGTH)

  if (!trimmedSubject) return { success: false, error: 'Please enter a subject.' }
  if (!trimmedBody) return { success: false, error: 'Please enter a message.' }

  const prisma = await getPrismaClient()

  const conversation = await prisma.conversation.create({
    data: {
      studentId,
      departmentId,
      subject: trimmedSubject,
      status: 'OPEN',
      lastMessageAt: new Date(),
      messages: {
        create: { senderType: 'student', senderStudentId: studentId, body: trimmedBody },
      },
    },
  })

  return { success: true, conversationId: conversation.id }
}

export async function sendMessage(
  conversationId: string,
  studentId: string,
  body: string,
): Promise<{ success: boolean; error?: string }> {
  const trimmedBody = body.trim().slice(0, MAX_MESSAGE_LENGTH)
  if (!trimmedBody) return { success: false, error: 'Please enter a message.' }

  const prisma = await getPrismaClient()

  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } })
  if (!conversation || conversation.studentId !== studentId) {
    return { success: false, error: 'Conversation not found.' }
  }
  if (conversation.status !== 'OPEN') {
    return { success: false, error: 'This conversation is closed. Start a new one if you need further help.' }
  }

  await prisma.$transaction([
    prisma.message.create({
      data: { conversationId, senderType: 'student', senderStudentId: studentId, body: trimmedBody },
    }),
    prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } }),
  ])

  return { success: true }
}

export async function resolveConversation(
  conversationId: string,
  studentId: string,
): Promise<{ success: boolean; error?: string }> {
  const prisma = await getPrismaClient()

  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } })
  if (!conversation || conversation.studentId !== studentId) {
    return { success: false, error: 'Conversation not found.' }
  }
  if (conversation.status !== 'OPEN') {
    return { success: false, error: 'This conversation is already closed.' }
  }

  await prisma.conversation.update({ where: { id: conversationId }, data: { status: 'RESOLVED' } })

  return { success: true }
}