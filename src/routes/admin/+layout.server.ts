// src/routes/admin/+layout.server.ts
// Shared layout load — runs on every admin route.
// Attaches staff + permissions to all pages.

import type { LayoutServerLoad } from './$types'
import { requireStaff } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'

export const load: LayoutServerLoad = async (event) => {
  const { staff, permissions } = await requireStaff(event)
  const prisma = await getPrismaClient()

  // Get unread notification count for staff (if you have notifications for staff)
  const unreadCount = await prisma.notification.count({
    where: { 
      staffId: staff.id, 
      isRead: false 
    },
  })

  return {
    staff: {
      id: staff.id,
      firstName: staff.firstName || '',
      lastName: staff.lastName || '',
      email: staff.email || '',
      staffNumber: staff.staffNumber || '',
      primaryRole: staff.primaryRole || 'STAFF',
      avatar: staff.avatar || '',
      department: staff.department?.name || null,
      college: staff.college?.name || null,
      status: staff.status,
    },
    permissions: Array.from(permissions || new Set()),
    unreadCount,
  }
}