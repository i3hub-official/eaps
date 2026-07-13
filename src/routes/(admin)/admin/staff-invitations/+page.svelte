<!-- src/routes/(admin)/admin/staff-invitations/+page.svelte -->
<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { deserialize } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import {
		Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
	} from '$lib/components/ui/table/index.js';
	import { Loader, ChevronLeft, ChevronRight } from '@lucide/svelte/icons';

	let { data } = $props();

	let email = $state('');
	let primaryRole = $state(data.roles[0] ?? '');
	let collegeId = $state('');
	let departmentId = $state('');
	let selectedLevels = $state<number[]>([]);
	let selectedCourseIds = $state<string[]>([]);
	let isSubmitting = $state(false);
	let errors = $state<Record<string, string>>({});
	let resendingId = $state<string | null>(null);
	let revokingId = $state<string | null>(null);

	// Check if selected role needs college/department
	const needsCollegeDept = $derived(!data.rolesWithoutCollegeDept.includes(primaryRole));

	const availableDepartments = $derived(
		data.departments.filter((d) => !collegeId || d.collegeId === collegeId)
	);
	const availableLevels = $derived([...new Set(data.courses.map((c) => c.level))].sort((a, b) => a - b));
	const availableCourses = $derived(
		data.courses.filter(
			(c) =>
				(!departmentId || c.departmentId === departmentId) &&
				(selectedLevels.length === 0 || selectedLevels.includes(c.level))
		)
	);

	function toggleLevel(level: number) {
		selectedLevels = selectedLevels.includes(level)
			? selectedLevels.filter((l) => l !== level)
			: [...selectedLevels, level];
	}

	function toggleCourse(id: string) {
		selectedCourseIds = selectedCourseIds.includes(id)
			? selectedCourseIds.filter((c) => c !== id)
			: [...selectedCourseIds, id];
	}

	async function handleCreate(e: Event) {
		e.preventDefault();
		errors = {};
		isSubmitting = true;

		const fd = new FormData();
		fd.set('email', email);
		fd.set('primaryRole', primaryRole);
		
		if (needsCollegeDept) {
			fd.set('collegeId', collegeId);
			fd.set('departmentId', departmentId);
			selectedLevels.forEach((l) => fd.append('levels', String(l)));
			selectedCourseIds.forEach((c) => fd.append('courseIds', c));
		}

		try {
			const res = await fetch('?/create', { method: 'POST', body: fd });
			const result = deserialize(await res.text());

			if (result.type === 'success' && (result.data as any)?.success) {
				toast.success(`Invitation sent to ${email}`);
				email = '';
				collegeId = '';
				departmentId = '';
				selectedLevels = [];
				selectedCourseIds = [];
				await invalidateAll();
			} else if (result.type === 'failure') {
				const d = result.data as any;
				if (d?.errors) errors = d.errors;
				toast.error(d?.error ?? 'Please fix the highlighted fields');
			} else if (result.type === 'error') {
				toast.error(result.error?.message ?? 'Failed to send invitation');
			}
		} finally {
			isSubmitting = false;
		}
	}

	async function handleResend(invitationId: string) {
		resendingId = invitationId;
		const fd = new FormData();
		fd.set('invitationId', invitationId);
		try {
			const res = await fetch('?/resend', { method: 'POST', body: fd });
			const result = deserialize(await res.text());
			if (result.type === 'success') {
				toast.success('Invitation resent successfully');
				await invalidateAll();
			} else {
				toast.error(result.data?.error || 'Failed to resend invitation');
			}
		} catch (err) {
			toast.error('Failed to resend invitation');
		} finally {
			resendingId = null;
		}
	}

	async function handleRevoke(invitationId: string) {
		if (!confirm('Revoke this invitation? The link will stop working.')) return;
		revokingId = invitationId;
		const fd = new FormData();
		fd.set('invitationId', invitationId);
		try {
			const res = await fetch('?/revoke', { method: 'POST', body: fd });
			const result = deserialize(await res.text());
			if (result.type === 'success') {
				toast.success('Invitation revoked');
				await invalidateAll();
			} else {
				toast.error('Failed to revoke invitation');
			}
		} catch (err) {
			toast.error('Failed to revoke invitation');
		} finally {
			revokingId = null;
		}
	}

	function statusVariant(status: string) {
		if (status === 'PENDING') return 'secondary';
		if (status === 'ACCEPTED') return 'default';
		return 'destructive';
	}

	function formatDate(date: string | Date) {
		return new Date(date).toLocaleDateString('en-NG', { 
			day: '2-digit', 
			month: 'short', 
			year: 'numeric' 
		});
	}

	// Pagination
	function goToPage(page: number) {
		const url = new URL(window.location.href);
		url.searchParams.set('page', String(page));
		window.location.href = url.toString();
	}
</script>

<Topbar title="Staff Invitations" description="Pre-onboard staff before they have an account" />

<main class="flex flex-1 flex-col gap-6 p-6">
	<Card>
		<CardHeader>
			<CardTitle>Invite Staff</CardTitle>
			<CardDescription>
				They'll receive an email with an identification token to complete their own onboarding.
			</CardDescription>
		</CardHeader>
		<CardContent>
			<form onsubmit={handleCreate} class="space-y-4">
				<div class="grid gap-4 md:grid-cols-2">
					<div class="space-y-2">
						<Label for="email">Email *</Label>
						<Input id="email" type="email" bind:value={email} placeholder="staff@mouau.edu.ng" />
						{#if errors.email}<p class="text-sm text-destructive">{errors.email}</p>{/if}
					</div>

					<div class="space-y-2">
						<Label for="role">Role *</Label>
						<select 
							id="role" 
							bind:value={primaryRole} 
							onchange={() => {
								if (!needsCollegeDept) {
									collegeId = '';
									departmentId = '';
									selectedLevels = [];
									selectedCourseIds = [];
								}
							}}
							class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
						>
							{#each data.roles as role}
								<option value={role}>{role}</option>
							{/each}
						</select>
						{#if errors.primaryRole}<p class="text-sm text-destructive">{errors.primaryRole}</p>{/if}
					</div>

					{#if needsCollegeDept}
						<div class="space-y-2">
							<Label for="college">College *</Label>
							<select
								id="college"
								bind:value={collegeId}
								onchange={() => { departmentId = ''; selectedCourseIds = []; }}
								class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
							>
								<option value="">Select college</option>
								{#each data.colleges as c}
									<option value={c.id}>{c.shortName} — {c.name}</option>
								{/each}
							</select>
							{#if errors.collegeId}<p class="text-sm text-destructive">{errors.collegeId}</p>{/if}
						</div>

						<div class="space-y-2">
							<Label for="department">Department *</Label>
							<select
								id="department"
								bind:value={departmentId}
								disabled={!collegeId}
								onchange={() => { selectedCourseIds = []; }}
								class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
							>
								<option value="">Select department</option>
								{#each availableDepartments as d}
									<option value={d.id}>{d.name}</option>
								{/each}
							</select>
							{#if errors.departmentId}<p class="text-sm text-destructive">{errors.departmentId}</p>{/if}
						</div>
					{/if}
				</div>

				{#if needsCollegeDept}
					<div class="space-y-2">
						<Label>Levels they teach (optional — filters course list below)</Label>
						<div class="flex flex-wrap gap-2">
							{#each availableLevels as level}
								<label class="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm cursor-pointer">
									<Checkbox checked={selectedLevels.includes(level)} onCheckedChange={() => toggleLevel(level)} />
									{level}
								</label>
							{/each}
						</div>
					</div>

					<div class="space-y-2">
						<Label>Courses they teach</Label>
						{#if !departmentId}
							<p class="text-sm text-muted-foreground">Select a department to see available courses.</p>
						{:else if availableCourses.length === 0}
							<p class="text-sm text-muted-foreground">No courses match the selected department/levels.</p>
						{:else}
							<div class="max-h-64 overflow-y-auto rounded-md border divide-y">
								{#each availableCourses as course}
									<label class="flex items-center gap-3 p-2.5 text-sm cursor-pointer hover:bg-muted/40">
										<Checkbox checked={selectedCourseIds.includes(course.id)} onCheckedChange={() => toggleCourse(course.id)} />
										<span>{course.code} — {course.title}</span>
										<Badge variant="outline" class="ml-auto text-xs">{course.level}L</Badge>
									</label>
								{/each}
							</div>
						{/if}
						{#if errors.courseIds}<p class="text-sm text-destructive">{errors.courseIds}</p>{/if}
					</div>
				{:else}
					<div class="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
						<p>University-wide roles (VC, DVC, Registrar, etc.) do not require college or department assignment.</p>
					</div>
				{/if}

				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting ? 'Sending…' : 'Send Invitation'}
				</Button>
			</form>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>Recent Invitations</CardTitle>
			<CardDescription>
				Showing {data.invitations.length} of {data.pagination.totalItems} invitations
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Staff Name</TableHead>
						<TableHead>Email</TableHead>
						<TableHead>Role</TableHead>
						<TableHead>College / Dept</TableHead>
						<TableHead>Courses</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Expires</TableHead>
						<TableHead class="text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#if data.invitations.length === 0}
						<TableRow>
							<TableCell colspan="8" class="text-center text-muted-foreground py-8">
								No invitations found
							</TableCell>
						</TableRow>
					{:else}
						{#each data.invitations as inv}
							<TableRow>
								<TableCell>
									{#if inv.staffName}
										<span class="font-medium">{inv.staffName}</span>
										{#if inv.acceptedAt}
											<p class="text-xs text-muted-foreground">
												Accepted {formatDate(inv.acceptedAt)}
											</p>
										{/if}
									{:else}
										<span class="text-muted-foreground">—</span>
									{/if}
								</TableCell>
								<TableCell class="font-mono text-sm">{inv.maskedEmail}</TableCell>
								<TableCell>{inv.role}</TableCell>
								<TableCell class="text-sm text-muted-foreground">
									{inv.college === 'N/A' && inv.department === 'N/A' 
										? '—' 
										: `${inv.college} / ${inv.department}`}
								</TableCell>
								<TableCell class="text-sm">{inv.courses.join(', ') || '—'}</TableCell>
								<TableCell><Badge variant={statusVariant(inv.status)}>{inv.status}</Badge></TableCell>
								<TableCell class="text-sm text-muted-foreground">{formatDate(inv.expiresAt)}</TableCell>
								<TableCell class="text-right">
									{#if inv.status === 'PENDING'}
										<div class="flex items-center justify-end gap-1">
											<Button 
												variant="ghost" 
												size="sm" 
												onclick={() => handleResend(inv.id)}
												disabled={resendingId === inv.id}
											>
												{#if resendingId === inv.id}
													<Loader class="size-3 animate-spin" />
												{:else}
													Resend
												{/if}
											</Button>
											<Button 
												variant="ghost" 
												size="sm" 
												onclick={() => handleRevoke(inv.id)}
												disabled={revokingId === inv.id}
												class="text-destructive hover:text-destructive"
											>
												{#if revokingId === inv.id}
													<Loader class="size-3 animate-spin" />
												{:else}
													Revoke
												{/if}
											</Button>
										</div>
									{/if}
								</TableCell>
							</TableRow>
						{/each}
					{/if}
				</TableBody>
			</Table>

			<!-- Pagination -->
			{#if data.pagination.totalPages > 1}
				<div class="flex items-center justify-between border-t pt-4">
					<div class="text-sm text-muted-foreground">
						Page {data.pagination.currentPage} of {data.pagination.totalPages}
						<span class="mx-2">•</span>
						{data.pagination.totalItems} total
					</div>
					<div class="flex gap-1">
						<Button
							variant="outline"
							size="sm"
							disabled={!data.pagination.hasPrev}
							onclick={() => goToPage(data.pagination.currentPage - 1)}
						>
							<ChevronLeft class="size-3.5" />
							Previous
						</Button>
						{#each Array(Math.min(5, data.pagination.totalPages)).fill(0).map((_, i) => i + 1) as page}
							<Button
								variant={page === data.pagination.currentPage ? 'default' : 'outline'}
								size="sm"
								on:click={() => goToPage(page)}
							>
								{page}
							</Button>
						{/each}
						{#if data.pagination.totalPages > 5}
							<span class="flex items-center px-2">…</span>
							<Button
								variant="outline"
								size="sm"
								onclick={() => goToPage(data.pagination.totalPages)}
							>
								{data.pagination.totalPages}
							</Button>
						{/if}
						<Button
							variant="outline"
							size="sm"
							disabled={!data.pagination.hasNext}
							onclick={() => goToPage(data.pagination.currentPage + 1)}
						>
							Next
							<ChevronRight class="size-3.5" />
						</Button>
					</div>
				</div>
			{/if}
		</CardContent>
	</Card>
</main>