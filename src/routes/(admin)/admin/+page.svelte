<!-- src/routes/(admin)/admin/+page.svelte -->
<script lang="ts">
	import { Topbar, StatCard } from '$lib/components/dashboard';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import Users from '@lucide/svelte/icons/users';
	import Radio from '@lucide/svelte/icons/radio';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import CalendarCheck from '@lucide/svelte/icons/calendar-check';
	import Download from '@lucide/svelte/icons/download';
	import Clock from '@lucide/svelte/icons/clock';
	import Building2 from '@lucide/svelte/icons/building-2';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import UserCheck from '@lucide/svelte/icons/user-check';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import Eye from '@lucide/svelte/icons/eye';
	import Shield from '@lucide/svelte/icons/shield';
	import Code from '@lucide/svelte/icons/code';
	import UsersIcon from '@lucide/svelte/icons/users';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import Mail from '@lucide/svelte/icons/mail';
	import UserCog from '@lucide/svelte/icons/user-cog';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';

	let { data } = $props()

	const { stats, studentStats, liveSessions, auditLog, recentStaff, devTeam, user } = data

	// ─── Stats for the grid ──────────────────────────────────────────────
	const statsCards = [
		{ 
			label: 'Enrolled Students', 
			value: stats.totalStudents.toLocaleString(), 
			delta: `${stats.studentGrowth > 0 ? '+' : ''}${stats.studentGrowth}% this session`, 
			deltaTone: stats.studentGrowth > 0 ? 'up' as const : 'down' as const, 
			icon: Users, 
			accent: 'primary' as const 
		},
		{ 
			label: 'Active Sessions', 
			value: stats.activeSessions.toString(), 
			delta: `${stats.activeColleges} colleges live now`, 
			deltaTone: 'neutral' as const, 
			icon: Radio, 
			accent: 'primary' as const 
		},
		{ 
			label: 'Flagged Incidents (24h)', 
			value: stats.flaggedIncidents.toString(), 
			delta: stats.incidentChange === 0 
				? 'No change from yesterday' 
				: `${stats.incidentChange > 0 ? '+' : ''}${stats.incidentChange} vs yesterday`, 
			deltaTone: stats.incidentChange > 0 ? 'up' as const : 'down' as const, 
			icon: TriangleAlert, 
			accent: 'danger' as const 
		},
		{ 
			label: 'Avg. Attendance', 
			value: `${stats.avgAttendance}%`, 
			delta: `${stats.sessionCompletionRate}% completion rate`, 
			deltaTone: 'up' as const, 
			icon: CalendarCheck, 
			accent: 'gold' as const 
		}
	]

	// ─── Session status badge mapping ──────────────────────────────────
	const sessionBadge: Record<string, { label: string; variant: 'secondary' | 'outline' | 'destructive' | 'default' }> = {
		'in-progress': { label: 'In progress', variant: 'secondary' },
		'ending-soon': { label: 'Ending soon', variant: 'outline' },
		'flagged': { label: 'Attention needed', variant: 'destructive' }
	}

	// ─── Format time remaining ──────────────────────────────────────────
	function formatTimeRemaining(minutes: number): string {
		if (minutes <= 0) return 'Ending now'
		if (minutes < 60) return `${minutes}m remaining`
		const hours = Math.floor(minutes / 60)
		const mins = minutes % 60
		return `${hours}h ${mins}m remaining`
	}

	// ─── Format date ────────────────────────────────────────────────────
	function formatDate(date: Date | string) {
		return new Date(date).toLocaleDateString('en-NG', { 
			day: '2-digit', 
			month: 'short', 
			year: 'numeric' 
		})
	}

	// ─── Role colors ────────────────────────────────────────────────────
	function getRoleColor(role: string) {
		const colors: Record<string, string> = {
			OWNER: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
			ADMIN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
			DEVELOPER: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
			SUPPORT: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
			OBSERVER: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800',
		}
		return colors[role] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800'
	}
</script>

<svelte:head>
	<title>Admin Dashboard — EAPS</title>
</svelte:head>

<Topbar 
	title="Admin Dashboard" 
	description={`Welcome back, ${user?.firstName || 'Admin'} • ${user?.primaryRole?.replace(/_/g, ' ') || 'Administrator'}`}
/>

<main class="flex flex-1 flex-col gap-6 p-6">
	<!-- ─── Stats Cards ────────────────────────────────────────────────── -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
		{#each statsCards as s (s.label)}
			<StatCard 
				label={s.label} 
				value={s.value} 
				delta={s.delta} 
				deltaTone={s.deltaTone} 
				icon={s.icon} 
				accent={s.accent} 
			/>
		{/each}
	</div>

	<!-- ─── Quick Stats Bar ────────────────────────────────────────────── -->
	<Card.Root>
		<Card.Content class="py-4">
			<div class="grid grid-cols-2 gap-4 sm:grid-cols-5">
				<div class="text-center">
					<p class="text-xs text-muted-foreground">Total Staff</p>
					<p class="text-2xl font-bold">{stats.totalStaff}</p>
				</div>
				<div class="text-center">
					<p class="text-xs text-muted-foreground">Today's Sessions</p>
					<p class="text-2xl font-bold">{stats.todaySessions}</p>
				</div>
				<div class="text-center">
					<p class="text-xs text-muted-foreground">Today's Violations</p>
					<p class="text-2xl font-bold text-red-600">{stats.todayViolations}</p>
				</div>
				<div class="text-center">
					<p class="text-xs text-muted-foreground">Upcoming (24h)</p>
					<p class="text-2xl font-bold text-blue-600">{stats.upcomingSessions}</p>
				</div>
				<div class="text-center">
					<p class="text-xs text-muted-foreground">Completion Rate</p>
					<p class="text-2xl font-bold text-green-600">{stats.sessionCompletionRate}%</p>
				</div>
			</div>
			<div class="mt-3">
				<Progress value={stats.sessionCompletionRate} class="h-1.5" />
			</div>
		</Card.Content>
	</Card.Root>

	<!-- ─── Main Grid ────────────────────────────────────────────────────── -->
	<div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
		<!-- ─── Audit Log ─────────────────────────────────────────────────── -->
		<Card.Root class="xl:col-span-2">
			<Card.Header class="flex-row items-center justify-between">
				<div>
					<Card.Title>Recent Audit Activity</Card.Title>
					<Card.Description>Latest system and staff actions across the platform</Card.Description>
				</div>
				<Button variant="outline" size="sm" href="/admin/audit-logs">
					<Eye class="mr-2 size-4" />
					View All
				</Button>
			</Card.Header>
			<Card.Content class="p-0">
				<div class="overflow-x-auto max-h-[400px] overflow-y-auto">
					<Table.Root>
						<Table.Header class="sticky top-0 z-10 bg-background">
							<Table.Row>
								<Table.Head>Time</Table.Head>
								<Table.Head>Actor</Table.Head>
								<Table.Head>Action</Table.Head>
								<Table.Head>Target</Table.Head>
								<Table.Head>IP</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#if auditLog.length === 0}
								<Table.Row>
									<Table.Cell colspan="5" class="text-center text-muted-foreground py-8">
										No recent activity found
									</Table.Cell>
								</Table.Row>
							{:else}
								{#each auditLog as row (row.time + row.actor)}
									<Table.Row class="hover:bg-muted/30 transition-colors">
										<Table.Cell class="font-mono text-xs text-muted-foreground whitespace-nowrap">
											{row.time}
										</Table.Cell>
										<Table.Cell class="font-medium max-w-[150px] truncate" title={row.actor}>
											{#if row.actorType === 'staff'}
												<span class="flex items-center gap-1">
													<UserCheck class="size-3 text-blue-500" />
													{row.actor}
												</span>
											{:else if row.actorType === 'student'}
												<span class="flex items-center gap-1">
													<UsersIcon class="size-3 text-green-500" />
													{row.actor}
												</span>
											{:else}
												<span class="flex items-center gap-1">
													<AlertCircle class="size-3 text-gray-500" />
													{row.actor}
												</span>
											{/if}
										</Table.Cell>
										<Table.Cell class="text-muted-foreground">{row.action}</Table.Cell>
										<Table.Cell class="max-w-[150px] truncate" title={row.target}>
											{row.target}
										</Table.Cell>
										<Table.Cell class="font-mono text-xs text-muted-foreground">{row.ip}</Table.Cell>
									</Table.Row>
								{/each}
							{/if}
						</Table.Body>
					</Table.Root>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- ─── Live Exam Sessions ───────────────────────────────────────── -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Radio class="size-4 text-green-500 animate-pulse" />
					Live Exam Sessions
				</Card.Title>
				<Card.Description>Real-time snapshot from invigilation feeds</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-3">
				{#if liveSessions.length === 0}
					<div class="flex flex-col items-center justify-center py-8 text-center">
						<Clock class="size-10 text-muted-foreground/50 mb-2" />
						<p class="text-sm text-muted-foreground">No active exam sessions</p>
						<p class="text-xs text-muted-foreground/70">Sessions will appear here when students are taking exams</p>
					</div>
				{:else}
					{#each liveSessions as s (s.course + s.timeRemaining)}
						<div class="flex flex-col gap-1.5 rounded-md border p-3 hover:bg-muted/30 transition-colors">
							<div class="flex items-start justify-between gap-2">
								<span class="text-sm font-medium truncate" title={s.course}>{s.course}</span>
								<Badge variant={sessionBadge[s.status]?.variant || 'secondary'} class="shrink-0">
									{sessionBadge[s.status]?.label || s.status}
								</Badge>
							</div>
							<div class="flex items-center justify-between text-xs text-muted-foreground">
								<span class="flex items-center gap-1">
									<Building2 class="size-3" />
									{s.college || 'Unknown College'}
								</span>
								<span class="font-mono">{s.candidates} candidates</span>
							</div>
							{#if s.timeRemaining > 0}
								<div class="text-xs text-muted-foreground/70">
									⏱️ {formatTimeRemaining(s.timeRemaining)}
								</div>
							{/if}
						</div>
					{/each}
				{/if}
				<Button variant="ghost" size="sm" href="/admin/sessions" class="w-full text-muted-foreground">
					<Eye class="mr-2 size-4" />
					View all sessions
				</Button>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- ─── Student Enrollment Card ────────────────────────────────────── -->
	<Card.Root>
		<Card.Header class="flex-row items-center justify-between">
			<div>
				<Card.Title class="flex items-center gap-2">
					<GraduationCap class="size-4 text-primary" />
					Student Enrollment Overview
				</Card.Title>
				<Card.Description>Student distribution by level and top departments</Card.Description>
			</div>
			<Button variant="outline" size="sm" href="/admin/students">
				<Eye class="mr-2 size-4" />
				View All Students
			</Button>
		</Card.Header>
		<Card.Content>
			<div class="grid gap-6 md:grid-cols-2">
				<!-- By Level -->
				<div>
					<h4 class="text-sm font-medium text-muted-foreground mb-3">By Level</h4>
					<div class="space-y-2">
						{#if studentStats?.byLevel?.length > 0}
							{#each studentStats.byLevel as item}
								{@const total = stats.totalStudents || 1}
								<div>
									<div class="flex items-center justify-between text-sm">
										<span>Level {item.level}</span>
										<span class="font-medium">{item.count}</span>
									</div>
									<Progress value={(item.count / total) * 100} class="h-1.5 mt-0.5" />
								</div>
							{/each}
						{:else}
							<p class="text-sm text-muted-foreground">No student data available</p>
						{/if}
					</div>
				</div>

				<!-- By Department -->
				<div>
					<h4 class="text-sm font-medium text-muted-foreground mb-3">Top Departments</h4>
					<div class="space-y-2">
						{#if studentStats?.topDepartments?.length > 0}
							{#each studentStats.topDepartments as item}
								{@const total = stats.totalStudents || 1}
								<div>
									<div class="flex items-center justify-between text-sm">
										<span class="truncate" title={item.department}>{item.department}</span>
										<span class="font-medium">{item.count}</span>
									</div>
									<Progress value={(item.count / total) * 100} class="h-1.5 mt-0.5" />
								</div>
							{/each}
						{:else}
							<p class="text-sm text-muted-foreground">No department data available</p>
						{/if}
					</div>
				</div>
			</div>
			<div class="mt-4 pt-4 border-t border-border">
				<div class="flex items-center justify-between text-sm">
					<span class="text-muted-foreground">Total Active Students</span>
					<span class="font-bold text-xl">{stats.totalStudents.toLocaleString()}</span>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- ─── Staff & Team Members Grid ──────────────────────────────────── -->
	<div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
		<!-- ─── Recent Staff ────────────────────────────────────────────── -->
		<Card.Root>
			<Card.Header class="flex-row items-center justify-between">
				<div>
					<Card.Title class="flex items-center gap-2">
						<UserCheck class="size-4 text-blue-500" />
						Recent Staff
					</Card.Title>
					<Card.Description>Latest staff members who joined</Card.Description>
				</div>
				<div class="flex gap-2">
					<Button variant="outline" size="sm" href="/admin/staff-invitations">
						<Mail class="mr-2 size-4" />
						Invite
					</Button>
					<Button variant="outline" size="sm" href="/admin/lecturers">
						<Eye class="mr-2 size-4" />
						View All
					</Button>
				</div>
			</Card.Header>
			<Card.Content>
				{#if recentStaff.length === 0}
					<div class="flex flex-col items-center justify-center py-8 text-center">
						<UsersIcon class="size-10 text-muted-foreground/50 mb-2" />
						<p class="text-sm text-muted-foreground">No staff members found</p>
					</div>
				{:else}
					<div class="space-y-3">
						{#each recentStaff as staff (staff.id)}
							<div class="flex items-center justify-between rounded-md border p-3 hover:bg-muted/30 transition-colors">
								<div class="flex items-center gap-3 min-w-0">
									<div class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
										{staff.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
									</div>
									<div class="min-w-0">
										<p class="text-sm font-medium truncate">{staff.name}</p>
										<p class="text-xs text-muted-foreground truncate">{staff.email}</p>
										<div class="flex flex-wrap items-center gap-2 mt-0.5">
											<span class="text-[10px] text-muted-foreground/70 flex items-center gap-0.5">
												<Building2 class="size-2.5" />
												{staff.college}
											</span>
											<span class="text-[10px] text-muted-foreground/50">•</span>
											<span class="text-[10px] text-muted-foreground/70 flex items-center gap-0.5">
												<UsersIcon class="size-2.5" />
												{staff.department}
											</span>
										</div>
									</div>
								</div>
								<div class="flex items-center gap-2 shrink-0">
									<Badge variant="outline" class="text-[10px]">
										{staff.role.replace(/_/g, ' ')}
									</Badge>
									<span class="text-xs text-muted-foreground whitespace-nowrap">
										{formatDate(staff.joinedAt)}
									</span>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- ─── Development Team ────────────────────────────────────────── -->
		<Card.Root>
			<Card.Header class="flex-row items-center justify-between">
				<div>
					<Card.Title class="flex items-center gap-2">
						<Code class="size-4 text-purple-500" />
						Development Team
					</Card.Title>
					<Card.Description>Active developers on the platform</Card.Description>
				</div>
				<div class="flex gap-2">
					<Button variant="outline" size="sm" href="/admin/team">
						<UserPlus class="mr-2 size-4" />
						Manage
					</Button>
					<Button variant="outline" size="sm" href="/admin/team">
						<Eye class="mr-2 size-4" />
						View All
					</Button>
				</div>
			</Card.Header>
			<Card.Content>
				{#if devTeam.length === 0}
					<div class="flex flex-col items-center justify-center py-8 text-center">
						<Code class="size-10 text-muted-foreground/50 mb-2" />
						<p class="text-sm text-muted-foreground">No developers on the team yet</p>
						<Button variant="outline" size="sm" href="/admin/team" class="mt-2">
							<UserPlus class="mr-2 size-4" />
							Invite Developers
						</Button>
					</div>
				{:else}
					<div class="space-y-3">
						{#each devTeam as dev (dev.id)}
							<div class="flex items-center justify-between rounded-md border p-3 hover:bg-muted/30 transition-colors">
								<div class="flex items-center gap-3 min-w-0">
									<div class="flex size-8 shrink-0 items-center justify-center rounded-full bg-purple-500/10 text-xs font-medium text-purple-600 dark:text-purple-400">
										{dev.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
									</div>
									<div class="min-w-0">
										<p class="text-sm font-medium truncate">{dev.name}</p>
										<p class="text-xs text-muted-foreground truncate">{dev.email}</p>
										<div class="flex flex-wrap items-center gap-2 mt-0.5">
											<span class="text-[10px] text-muted-foreground/70 flex items-center gap-0.5">
												<Shield class="size-2.5" />
												{dev.role}
											</span>
										</div>
									</div>
								</div>
								<div class="flex items-center gap-2 shrink-0">
									<Badge class={getRoleColor(dev.role)}>
										{dev.role}
									</Badge>
									{#if dev.lastLoginAt}
										<span class="text-xs text-muted-foreground whitespace-nowrap">
											{formatDate(dev.lastLoginAt)}
										</span>
									{:else}
										<span class="text-xs text-muted-foreground/50">Never</span>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</main>