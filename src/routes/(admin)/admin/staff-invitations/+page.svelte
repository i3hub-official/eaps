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
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
	import {
		Loader,
		ChevronLeft,
		ChevronRight,
		UserPlus,
		Shield,
		Mail,
		Building2,
		Users,
		BookOpen,
		CheckCircle,
		XCircle,
		Clock,
		UserCheck,
		UserX,
		Filter,
		Search,
		Eye,
		EyeOff,
		Copy,
		Send,
		Trash2,
	} from '@lucide/svelte/icons';
	import { page } from '$app/state';

	let { data } = $props();

	// ─── State ────────────────────────────────────────────────────────────────
	let email = $state('');
	let primaryRole = $state(data.roles[0] ?? '');
	let collegeId = $state('');
	let departmentId = $state('');
	let selectedLevels = $state<number[]>([]);
	let selectedCourseIds = $state<string[]>([]);
	let selectedPermissions = $state<string[]>([]);
	let isSubmitting = $state(false);
	let errors = $state<Record<string, string>>({});
	let resendingId = $state<string | null>(null);
	let revokingId = $state<string | null>(null);
	let searchQuery = $state('');
	let filterStatus = $state('all');
	let showToken = $state(false);

	// ─── Computed ────────────────────────────────────────────────────────────
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

	const filteredInvitations = $derived(
		data.invitations.filter(inv => {
			const matchesSearch = searchQuery === '' ||
				inv.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
				inv.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(inv.staffName && inv.staffName.toLowerCase().includes(searchQuery.toLowerCase()));
			const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;
			return matchesSearch && matchesStatus;
		})
	);

	// ─── Handlers ────────────────────────────────────────────────────────────
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

	function togglePermission(permission: string) {
		selectedPermissions = selectedPermissions.includes(permission)
			? selectedPermissions.filter((p) => p !== permission)
			: [...selectedPermissions, permission];
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
		
		// Add permissions
		selectedPermissions.forEach((p) => fd.append('permissions', p));

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
				selectedPermissions = [];
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
		if (status === 'REVOKED') return 'destructive';
		return 'outline';
	}

	function formatDate(date: string | Date) {
		return new Date(date).toLocaleDateString('en-NG', { 
			day: '2-digit', 
			month: 'short', 
			year: 'numeric' 
		});
	}

	function getStatusIcon(status: string) {
		if (status === 'PENDING') return Clock;
		if (status === 'ACCEPTED') return CheckCircle;
		if (status === 'REVOKED') return XCircle;
		return Clock;
	}

	function getStatusColor(status: string) {
		if (status === 'PENDING') return 'text-yellow-500';
		if (status === 'ACCEPTED') return 'text-green-500';
		if (status === 'REVOKED') return 'text-red-500';
		return 'text-gray-500';
	}

	function getRoleIcon(role: string) {
		const icons: Record<string, any> = {
			SUPER_ADMIN: Shield,
			VC: Shield,
			DVC: Shield,
			REGISTRAR: Shield,
			DEAN: Building2,
			HOD: Building2,
			LECTURER: Users,
			INVIGILATOR: UserCheck,
			UNIVERSITY_EXAM_OFFICER: Shield,
			COLLEGE_EXAM_OFFICER: Building2,
		};
		return icons[role] || Users;
	}

	// Pagination
	function goToPage(page: number) {
		const url = new URL(window.location.href);
		url.searchParams.set('page', String(page));
		window.location.href = url.toString();
	}

	function copyInvitationLink(invitationId: string) {
		const link = `${window.location.origin}/onboard/staff/${invitationId}`;
		navigator.clipboard.writeText(link);
		toast.success('Invitation link copied to clipboard');
	}
</script>

<Topbar title="Staff Invitations" description="Pre-onboard staff before they have an account">
	{#snippet actions()}
		<Button variant="outline" size="sm" onclick={() => window.location.reload()}>
			Refresh
		</Button>
	{/snippet}
</Topbar>

<main class="flex flex-1 flex-col gap-6 p-6">
	<!-- Stats Cards -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card class="transition-all hover:shadow-md">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Total Invitations</CardTitle>
				<Mail class="size-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{data.pagination.totalItems}</div>
				<p class="text-xs text-muted-foreground">all invitations</p>
			</CardContent>
		</Card>

		<Card class="transition-all hover:shadow-md border-yellow-200 dark:border-yellow-800">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Pending</CardTitle>
				<Clock class="size-4 text-yellow-500" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
					{data.invitations.filter(i => i.status === 'PENDING').length}
				</div>
				<p class="text-xs text-muted-foreground">awaiting response</p>
			</CardContent>
		</Card>

		<Card class="transition-all hover:shadow-md border-green-200 dark:border-green-800">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Accepted</CardTitle>
				<UserCheck class="size-4 text-green-500" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold text-green-600 dark:text-green-400">
					{data.invitations.filter(i => i.status === 'ACCEPTED').length}
				</div>
				<p class="text-xs text-muted-foreground">onboarded</p>
			</CardContent>
		</Card>

		<Card class="transition-all hover:shadow-md border-red-200 dark:border-red-800">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Revoked</CardTitle>
				<UserX class="size-4 text-red-500" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold text-red-600 dark:text-red-400">
					{data.invitations.filter(i => i.status === 'REVOKED').length}
				</div>
				<p class="text-xs text-muted-foreground">cancelled</p>
			</CardContent>
		</Card>
	</div>

	<!-- Invite Form -->
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<UserPlus class="size-5" />
				Invite Staff
			</CardTitle>
			<CardDescription>
				They'll receive an email with a link to complete their own onboarding.
			</CardDescription>
		</CardHeader>
		<CardContent>
			<form onsubmit={handleCreate} class="space-y-4">
				<div class="grid gap-4 md:grid-cols-2">
					<div class="space-y-2">
						<Label for="email">Email Address *</Label>
						<Input 
							id="email" 
							type="email" 
							bind:value={email} 
							placeholder="staff@mouau.edu.ng"
							class={errors.email ? 'border-destructive' : ''}
						/>
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
							class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
						>
							{#each data.roles as role}
								<option value={role}>{role.replace(/_/g, ' ')}</option>
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
								class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
								class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
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
					<!-- Levels -->
					<div class="space-y-2">
						<Label>Levels They Teach <span class="text-muted-foreground font-normal">(optional — filters course list below)</span></Label>
						<div class="flex flex-wrap gap-2">
							{#each availableLevels as level}
								<label class="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm cursor-pointer hover:bg-muted/30 transition-colors">
									<Checkbox checked={selectedLevels.includes(level)} onCheckedChange={() => toggleLevel(level)} />
									{level}
								</label>
							{/each}
						</div>
					</div>

					<!-- Courses -->
					<div class="space-y-2">
						<Label>Courses They Teach <span class="text-muted-foreground font-normal">(select all that apply)</span></Label>
						{#if !departmentId}
							<p class="text-sm text-muted-foreground">Select a department to see available courses.</p>
						{:else if availableCourses.length === 0}
							<p class="text-sm text-muted-foreground">No courses match the selected department/levels.</p>
						{:else}
							<div class="max-h-64 overflow-y-auto rounded-md border divide-y">
								{#each availableCourses as course}
									<label class="flex items-center gap-3 p-2.5 text-sm cursor-pointer hover:bg-muted/40 transition-colors">
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
						<Shield class="size-4 inline mr-2" />
						University-wide roles (VC, DVC, Registrar, etc.) do not require college or department assignment.
					</div>
				{/if}

				<!-- Permissions -->
				<div class="space-y-2">
					<Label>Additional Permissions <span class="text-muted-foreground font-normal">(grant specific access rights)</span></Label>
					<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
						{#each data.permissions || [] as permission}
							<label class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-muted/30 transition-colors">
								<Checkbox checked={selectedPermissions.includes(permission.name)} onCheckedChange={() => togglePermission(permission.name)} />
								<div>
									<span>{permission.displayName || permission.name}</span>
									{#if permission.description}
										<p class="text-xs text-muted-foreground">{permission.description}</p>
									{/if}
								</div>
							</label>
						{:else}
							<p class="text-sm text-muted-foreground col-span-full">No additional permissions available.</p>
						{/each}
					</div>
				</div>

				<Button type="submit" disabled={isSubmitting} class="gap-2">
					{#if isSubmitting}
						<Loader class="size-4 animate-spin" />
						Sending Invitation...
					{:else}
						<Mail class="size-4" />
						Send Invitation
					{/if}
				</Button>
			</form>
		</CardContent>
	</Card>

	<!-- Invitations List -->
	<Card>
		<CardHeader>
			<div class="flex flex-wrap items-center justify-between gap-4">
				<div>
					<CardTitle>Recent Invitations</CardTitle>
					<CardDescription>
						Showing {data.invitations.length} of {data.pagination.totalItems} invitations
					</CardDescription>
				</div>
				
				<!-- Filters -->
				<div class="flex flex-wrap gap-2">
					<div class="relative">
						<Search class="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
						<Input
							bind:value={searchQuery}
							placeholder="Search invitations..."
							class="w-[180px] pl-8 h-8 text-sm"
						/>
					</div>
					<select
						bind:value={filterStatus}
						class="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
					>
						<option value="all">All Status</option>
						<option value="PENDING">Pending</option>
						<option value="ACCEPTED">Accepted</option>
						<option value="REVOKED">Revoked</option>
					</select>
				</div>
			</div>
		</CardHeader>
		<CardContent class="space-y-4">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Staff</TableHead>
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
					{#if filteredInvitations.length === 0}
						<TableRow>
							<TableCell colspan="8" class="text-center text-muted-foreground py-8">
								{#if searchQuery || filterStatus !== 'all'}
									<Search class="mx-auto size-8 text-muted-foreground/50 mb-2" />
									<p>No invitations match your filters</p>
								{:else}
									<Mail class="mx-auto size-8 text-muted-foreground/50 mb-2" />
									<p>No invitations sent yet</p>
								{/if}
							</TableCell>
						</TableRow>
					{:else}
						{#each filteredInvitations as inv}
							<TableRow class="transition-colors hover:bg-muted/30">
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
								<TableCell>
									<div class="flex items-center gap-1.5">
										<svelte:component this={getRoleIcon(inv.role)} class="size-3.5 text-muted-foreground" />
										<span>{inv.role.replace(/_/g, ' ')}</span>
									</div>
								</TableCell>
								<TableCell class="text-sm text-muted-foreground">
									{#if inv.college === 'N/A' && inv.department === 'N/A'}
										<span class="text-muted-foreground/50">—</span>
									{:else}
										{inv.college} / {inv.department}
									{/if}
								</TableCell>
								<TableCell class="text-sm">
									{#if inv.courses.length > 0}
										<div class="flex flex-wrap gap-1 max-w-[150px]">
											{#each inv.courses.slice(0, 3) as course}
												<Badge variant="outline" class="text-[10px]">{course}</Badge>
											{/each}
											{#if inv.courses.length > 3}
												<Badge variant="outline" class="text-[10px]">+{inv.courses.length - 3}</Badge>
											{/if}
										</div>
									{:else}
										<span class="text-muted-foreground/50">—</span>
									{/if}
								</TableCell>
								<TableCell>
									<Badge variant={statusVariant(inv.status)} class="gap-1">
										<svelte:component this={getStatusIcon(inv.status)} class={cn("size-3", getStatusColor(inv.status))} />
										{inv.status}
									</Badge>
								</TableCell>
								<TableCell class="text-sm text-muted-foreground">{formatDate(inv.expiresAt)}</TableCell>
								<TableCell class="text-right">
									{#if inv.status === 'PENDING'}
										<div class="flex items-center justify-end gap-1">
											<Button 
												variant="ghost" 
												size="sm" 
												onclick={() => copyInvitationLink(inv.id)}
												class="h-7 w-7 p-0"
												title="Copy invitation link"
											>
												<Copy class="size-3.5" />
												<span class="sr-only">Copy link</span>
											</Button>
											<Button 
												variant="ghost" 
												size="sm" 
												onclick={() => handleResend(inv.id)}
												disabled={resendingId === inv.id}
												class="h-7 w-7 p-0"
												title="Resend invitation"
											>
												{#if resendingId === inv.id}
													<Loader class="size-3.5 animate-spin" />
												{:else}
													<Send class="size-3.5" />
												{/if}
												<span class="sr-only">Resend</span>
											</Button>
											<Button 
												variant="ghost" 
												size="sm" 
												onclick={() => handleRevoke(inv.id)}
												disabled={revokingId === inv.id}
												class="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
												title="Revoke invitation"
											>
												{#if revokingId === inv.id}
													<Loader class="size-3.5 animate-spin" />
												{:else}
													<Trash2 class="size-3.5" />
												{/if}
												<span class="sr-only">Revoke</span>
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
						{#each Array(Math.min(5, data.pagination.totalPages)).fill(0).map((_, i) => i + 1) as p}
							<Button
								variant={p === data.pagination.currentPage ? 'default' : 'outline'}
								size="sm"
								onclick={() => goToPage(p)}
							>
								{p}
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