// src/routes/(admin)/security/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  await requireAdmin(locals.user);

  // Get active sessions count
  const activeSessions = await prisma.authSession.count({
    where: { expiresAt: { gt: new Date() } }
  });

  // Get recent audit logs (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const auditLogsData = await prisma.auditLog.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      user: { select: { fullName: true, email: true } }
    }
  });

  // Get active sessions list
  const activeSessionsList = await prisma.authSession.findMany({
    where: { expiresAt: { gt: new Date() } },
    include: {
      user: { select: { fullName: true, email: true, role: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  // Get violations from the last 7 days
  const violationsData = await prisma.violation.findMany({
    where: { flaggedAt: { gte: sevenDaysAgo } },
    orderBy: { flaggedAt: 'desc' },
    take: 50,
    include: {
      session: {
        include: {
          student: { select: { fullName: true, matricNumber: true } },
          exam: { select: { title: true } }
        }
      }
    }
  });

  // Format audit logs for display
  const formattedAuditLogs = auditLogsData.map(log => ({
    timestamp: log.createdAt,
    user: log.user?.fullName || 'System',
    action: log.action,
    resource: log.entity || '-',
    ip: log.ipAddress || '-',
    status: 'success'
  }));

  // Format active sessions
  const formattedSessions = activeSessionsList.map(session => ({
    id: session.id,
    user: session.user?.fullName || 'Unknown',
    role: session.user?.role || 'unknown',
    loginTime: session.createdAt,
    lastActivity: session.createdAt,
    ip: session.ipAddress || '-',
    device: session.userAgent || 'Unknown'
  }));

  // Format violations
  const formattedViolations = violationsData.map(violation => ({
    timestamp: violation.flaggedAt,
    student: violation.session?.student?.fullName || 'Unknown',
    exam: violation.session?.exam?.title || 'Unknown',
    type: violation.flagType,
    severity: getSeverity(violation.flagType),
    action: violation.actionTaken || 'warning'
  }));

  // Generate recent alerts from violations and audit logs
  const recentAlerts: { title: string; description: string; timestamp: Date; severity: string }[] = [];

  // Add high severity violations as alerts
  const highViolations = formattedViolations.filter(v => v.severity === 'high');
  if (highViolations.length > 0) {
    recentAlerts.push({
      title: `${highViolations.length} High Severity Violation${highViolations.length > 1 ? 's' : ''}`,
      description: `Face mismatch or multiple faces detected during exams`,
      timestamp: highViolations[0]?.timestamp || new Date(),
      severity: 'high'
    });
  }

  // Add failed login attempts as alerts
  const failedLogins = formattedAuditLogs.filter(l => 
    l.action.toLowerCase().includes('login') || l.action.toLowerCase().includes('auth')
  );
  if (failedLogins.length > 0) {
    recentAlerts.push({
      title: `${failedLogins.length} Auth Event${failedLogins.length > 1 ? 's' : ''}`,
      description: `Recent authentication activities recorded`,
      timestamp: failedLogins[0]?.timestamp || new Date(),
      severity: 'medium'
    });
  }

  // Add system health alert
  recentAlerts.push({
    title: 'System Security Active',
    description: 'All security systems are operational',
    timestamp: new Date(),
    severity: 'low'
  });

  // Calculate metrics
  const highSeverityCount = formattedViolations.filter(v => v.severity === 'high').length;
  const autoSubmittedCount = formattedViolations.filter(v => v.action === 'auto_submitted').length;
  const faceFailureCount = formattedViolations.filter(v => v.type === 'multiple_faces' || v.type === 'no_face_detected').length;

  return {
    activeSessions,
    activeSessionsList: formattedSessions,
    auditLogs: formattedAuditLogs,
    violations: formattedViolations,
    recentAlerts: recentAlerts.slice(0, 5),
    threatCount: highSeverityCount,
    failedLogins: failedLogins.length,
    suspiciousActivities: formattedViolations.length,
    blockedAttempts: autoSubmittedCount,
    faceFailures: faceFailureCount,
  };
};

function getSeverity(flagType: string): string {
  const severityMap: Record<string, string> = {
    'tab_switch': 'medium',
    'window_blur': 'low',
    'fullscreen_exit': 'medium',
    'copy_attempt': 'medium',
    'devtools_open': 'high',
    'screenshot_attempt': 'medium',
    'multiple_faces': 'high',
    'no_face_detected': 'medium',
    'invigilator_manual': 'medium'
  };
  return severityMap[flagType] || 'low';
}