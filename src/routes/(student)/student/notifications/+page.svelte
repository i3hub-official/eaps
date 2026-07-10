<!-- src/routes/student/notifications/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Card } from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { enhance } from '$app/forms';
	import Bell from '@lucide/svelte/icons/bell';
	import BellOff from '@lucide/svelte/icons/bell-off';
	import CheckCheck from '@lucide/svelte/icons/check-check';

	let { data, form } = $props();

	let markingAll = $state(false);
	let markingId = $state<string | null>(null);

	function formatDate(d: string | Date) {
		return new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
	}

	const typeLabel: Record<string, string> = {
		REGISTRATION_REMINDER: 'Registration',
		MISSING_COURSE_ALERT: 'Course Alert',
		EXAM_SCHEDULE: 'Exam Schedule',
		FACE_ENROLLMENT_REMINDER: 'Face Enrollment',
		PAYMENT_REMINDER: 'Payment',
		RESULT_RELEASED: 'Result',
		EXAM_STARTING: 'Exam Starting',
		VIOLATION_ALERT: 'Violation',
		PENDING_APPROVAL: 'Approval',
		GENERAL: 'General'
	};
</script>

<Topbar title="Notifications" />

<main class="flex flex-1 flex-col gap-6 p-6">
	<div class="flex items-center justify-between">
		<p class="text-sm text-muted-foreground">
			{data.unreadCount} unread notification{data.unreadCount === 1 ? '' : 's'}
		</p>
		{#if data.unreadCount > 0}
			<form
				method="POST"
				action="?/markAllRead"
				use:enhance={() => {
					markingAll = true;
					return async ({ update }) => {
						await update();
						markingAll = false;
					};
				}}
			>
				<Button type="submit" variant="outline" size="sm" disabled={markingAll}>
					<CheckCheck class="size-3.5" />
					{markingAll ? 'Marking…' : 'Mark all read'}
				</Button>
			</form>
		{/if}
	</div>

	{#if data.notifications.length === 0}
		<Card class="flex flex-col items-center gap-3 border-dashed p-12 text-center">
			<div class="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
				<BellOff class="size-5" />
			</div>
			<div>
				<p class="text-base font-semibold">No notifications</p>
				<p class="mt-1 text-sm text-muted-foreground">You're all caught up.</p>
			</div>
		</Card>
	{:else}
		<div class="flex flex-col gap-2">
			{#each data.notifications as n (n.id)}
				<Card class="flex items-start gap-3 p-4 {n.isRead ? '' : 'bg-primary/5 border-primary/20'}">
					<div class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
						<Bell class="size-4" />
					</div>
					<div class="flex flex-1 flex-col gap-1">
						<div class="flex flex-wrap items-center gap-2">
							<Badge variant="outline" class="font-normal">{typeLabel[n.type] ?? n.type}</Badge>
							{#if !n.isRead}
								<span class="size-1.5 rounded-full bg-primary"></span>
							{/if}
						</div>
						<p class="text-sm font-medium">{n.title}</p>
						<p class="text-sm text-muted-foreground">{n.body}</p>
						<p class="text-xs text-muted-foreground">{formatDate(n.createdAt)}</p>
					</div>
					{#if !n.isRead}
						<form
							method="POST"
							action="?/markRead"
							use:enhance={() => {
								markingId = n.id;
								return async ({ update }) => {
									await update();
									markingId = null;
								};
							}}
						>
							<input type="hidden" name="notificationId" value={n.id} />
							<Button type="submit" variant="ghost" size="sm" disabled={markingId === n.id}>
								{markingId === n.id ? '…' : 'Mark read'}
							</Button>
						</form>
					{/if}
				</Card>
			{/each}
		</div>
	{/if}
</main>