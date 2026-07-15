<!-- src/routes/(admin)/admin/team/+page.svelte -->
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
	import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '$lib/components/ui/dialog/index.js';
	import {
		Loader,
		ChevronLeft,
		ChevronRight,
		UserPlus,
		Shield,
		Mail,
		Users,
		CheckCircle,
		XCircle,
		Clock,
		UserCheck,
		UserX,
		Filter,
		Search,
		Send,
		Trash2,
		UserCog,
		UsersIcon,
		Code,
		Laptop,
		Eye,
		EyeOff,
	} from '@lucide/svelte/icons';
	import { cn } from '$lib/utils.js';

	let { data } = $props();

	// ─── State ────────────────────────────────────────────────────────────────
	let email = $state('');
	let name = $state('');
	let role = $state('');
	let selectedPermissions = $state<string[]>([]);
	let isSubmitting = $state(false);
	let isUpdating = $state(false);
	let errors = $state<Record<string, string>>({});
	let searchQuery = $state('');
	let filterRole = $state('all');
	let filterStatus = $state('all');
	let editDialogOpen = $state(false);
	let editingDeveloper = $state<any>(null);

	// ─── Role-Permission Mapping ────────────────────────────────────────────
	const ROLE_PERMISSIONS: Record<string, string[]> = {
		OWNER: [
			'VIEW_DASHBOARD',
			'MANAGE_USERS',
			'MANAGE_COURSES',
			'MANAGE_ASSESSMENTS',
			'MANAGE_QUESTIONS',
			'VIEW_REPORTS',
			'MANAGE_GRADES',
			'MANAGE_SETTINGS',
			'MANAGE_DEVELOPERS',
			'VIEW_LOGS',
			'MANAGE_INVITATIONS',
			'MANAGE_FACE_DATA'
		],
		ADMIN: [
			'VIEW_DASHBOARD',
			'MANAGE_USERS',
			'MANAGE_COURSES',
			'MANAGE_ASSESSMENTS',
			'MANAGE_QUESTIONS',
			'VIEW_REPORTS',
			'MANAGE_GRADES',
			'MANAGE_SETTINGS',
			'VIEW_LOGS',
			'MANAGE_INVITATIONS'
		],
		DEVELOPER: [
			'VIEW_DASHBOARD',
			'MANAGE_COURSES',
			'MANAGE_ASSESSMENTS',
			'MANAGE_QUESTIONS',
			'VIEW_REPORTS',
			'MANAGE_GRADES',
			'VIEW_LOGS'
		],
		SUPPORT: [
			'VIEW_DASHBOARD',
			'VIEW_REPORTS',
			'MANAGE_GRADES',
			'VIEW_LOGS'
		],
		OBSERVER: [
			'VIEW_DASHBOARD',
			'VIEW_REPORTS'
		]
	};

	// ─── Computed ────────────────────────────────────────────────────────────
	const filteredDevelopers = $derived(
		(data.developers || []).filter(dev => {
			const matchesSearch = searchQuery === '' ||
				dev.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
				dev.name.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesRole = filterRole === 'all' || dev.role === filterRole;
			const matchesStatus = filterStatus === 'all' || 
				(filterStatus === 'active' && dev.isActive) ||
				(filterStatus === 'inactive' && !dev.isActive) ||
				(filterStatus === 'pending' && !dev.acceptedAt);
			return matchesSearch && matchesRole && matchesStatus;
		})
	);

	// ─── Role Change Handler ────────────────────────────────────────────────
	function handleRoleChange(newRole: string) {
		role = newRole;
		// Auto-select permissions based on role
		selectedPermissions = ROLE_PERMISSIONS[newRole] || [];
	}

	function handleEditRoleChange(newRole: string) {
		if (editingDeveloper) {
			editingDeveloper.role = newRole;
			editingDeveloper.permissions = ROLE_PERMISSIONS[newRole] || [];
		}
	}

	// ─── Handlers ────────────────────────────────────────────────────────────
	function togglePermission(permission: string) {
		// For OBSERVER role, prevent unchecking permissions
		if (role === 'OBSERVER') {
			const observerPerms = ROLE_PERMISSIONS['OBSERVER'];
			if (observerPerms.includes(permission) && selectedPermissions.includes(permission)) {
				toast.info('Observer permissions are fixed and cannot be changed');
				return;
			}
		}
		selectedPermissions = selectedPermissions.includes(permission)
			? selectedPermissions.filter((p) => p !== permission)
			: [...selectedPermissions, permission];
	}

	function toggleEditPermission(permission: string) {
		if (!editingDeveloper) return;
		
		// For OBSERVER role, prevent unchecking permissions
		if (editingDeveloper.role === 'OBSERVER') {
			const observerPerms = ROLE_PERMISSIONS['OBSERVER'];
			if (observerPerms.includes(permission) && editingDeveloper.permissions.includes(permission)) {
				toast.info('Observer permissions are fixed and cannot be changed');
				return;
			}
		}
		
		if (editingDeveloper.permissions.includes(permission)) {
			editingDeveloper.permissions = editingDeveloper.permissions.filter((p: string) => p !== permission);
		} else {
			editingDeveloper.permissions = [...editingDeveloper.permissions, permission];
		}
	}

	function isPermissionDisabled(permission: string, currentRole: string): boolean {
		const rolePerms = ROLE_PERMISSIONS[currentRole] || [];
		return rolePerms.includes(permission);
	}

	async function handleInvite(e: Event) {
		e.preventDefault();
		errors = {};
		isSubmitting = true;

		const fd = new FormData();
		fd.set('email', email);
		fd.set('name', name);
		fd.set('role', role);
		selectedPermissions.forEach((p) => fd.append('permissions', p));

		try {
			const res = await fetch('?/invite', { method: 'POST', body: fd });
			const result = deserialize(await res.text());

			if (result.type === 'success') {
				toast.success(`Invitation sent to ${email}`);
				email = '';
				name = '';
				role = '';
				selectedPermissions = [];
				await invalidateAll();
			} else if (result.type === 'failure') {
				const d = result.data as any;
				if (d?.errors) errors = d.errors;
				toast.error(d?.error ?? 'Please fix the highlighted fields');
			}
		} finally {
			isSubmitting = false;
		}
	}

	async function handleUpdate(developerId: string) {
		if (!editingDeveloper) return;
		isUpdating = true;

		const fd = new FormData();
		fd.set('developerId', developerId);
		fd.set('role', editingDeveloper.role);
		fd.set('isActive', String(editingDeveloper.isActive));
		editingDeveloper.permissions.forEach((p: string) => fd.append('permissions', p));

		try {
			const res = await fetch('?/update', { method: 'POST', body: fd });
			const result = deserialize(await res.text());
			if (result.type === 'success') {
				toast.success('Developer updated successfully');
				editDialogOpen = false;
				await invalidateAll();
			} else {
				toast.error(result.data?.error || 'Failed to update developer');
			}
		} finally {
			isUpdating = false;
		}
	}

	async function handleRemove(developerId: string, name: string) {
		if (!confirm(`Remove ${name} from the development team?`)) return;
		
		const fd = new FormData();
		fd.set('developerId', developerId);
		try {
			const res = await fetch('?/remove', { method: 'POST', body: fd });
			const result = deserialize(await res.text());
			if (result.type === 'success') {
				toast.success('Developer removed from team');
				await invalidateAll();
			} else {
				toast.error(result.data?.error || 'Failed to remove developer');
			}
		} catch (err) {
			toast.error('Failed to remove developer');
		}
	}

	async function handleResendInvite(developerId: string, email: string) {
		const fd = new FormData();
		fd.set('developerId', developerId);
		try {
			const res = await fetch('?/resendInvite', { method: 'POST', body: fd });
			const result = deserialize(await res.text());
			if (result.type === 'success') {
				toast.success(`Invitation resent to ${email}`);
				await invalidateAll();
			} else {
				toast.error(result.data?.error || 'Failed to resend invitation');
			}
		} catch (err) {
			toast.error('Failed to resend invitation');
		}
	}

	function openEditDialog(developer: any) {
		editingDeveloper = { ...developer };
		editDialogOpen = true;
	}

	function getRoleColor(role: string) {
		const colors: Record<string, string> = {
			OWNER: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
			ADMIN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
			DEVELOPER: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
			SUPPORT: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
			OBSERVER: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800',
		};
		return colors[role] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800';
	}

	function getRoleIcon(role: string) {
		const icons: Record<string, any> = {
			OWNER: Shield,
			ADMIN: UserCog,
			DEVELOPER: Code,
			SUPPORT: Users,
			OBSERVER: Laptop,
		};
		return icons[role] || Users;
	}

	function getStatusBadge(isActive: boolean, acceptedAt: string | null) {
		if (!acceptedAt) {
			return { label: 'Pending', variant: 'outline', icon: Clock };
		}
		if (isActive) {
			return { label: 'Active', variant: 'default', icon: CheckCircle };
		}
		return { label: 'Inactive', variant: 'secondary', icon: XCircle };
	}

	function formatDate(date: string | Date | null) {
		if (!date) return 'Never';
		return new Date(date).toLocaleDateString('en-NG', { 
			day: '2-digit', 
			month: 'short', 
			year: 'numeric' 
		});
	}

	// ─── Pagination ──────────────────────────────────────────────────────────
	function goToPage(page: number) {
		const url = new URL(window.location.href);
		url.searchParams.set('page', String(page));
		window.location.href = url.toString();
	}
</script>

<svelte:head>
	<title>Development Team — EAPS</title>
</svelte:head>

<Topbar title="Development Team" description="Manage your development team members">
	{#snippet actions()}
		<Button variant="outline" size="sm" onclick={() => window.location.reload()}>
			Refresh
		</Button>
	{/snippet}
</Topbar>

<main class="flex flex-1 flex-col gap-6 p-6">
	{#if data.error}
		<Card>
			<CardContent class="flex flex-col items-center justify-center py-12">
				<Shield class="size-12 text-muted-foreground/50 mb-4" />
				<h3 class="text-lg font-semibold">Access Restricted</h3>
				<p class="text-sm text-muted-foreground mt-1">{data.error}</p>
			</CardContent>
		</Card>
	{:else}
		<!-- ─── Stats Cards ────────────────────────────────────────────── -->
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<Card class="transition-all hover:shadow-md">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Total Developers</CardTitle>
					<UsersIcon class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{data.pagination.totalItems}</div>
					<p class="text-xs text-muted-foreground">team members</p>
				</CardContent>
			</Card>

			<Card class="transition-all hover:shadow-md border-green-200 dark:border-green-800">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Active</CardTitle>
					<UserCheck class="size-4 text-green-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold text-green-600 dark:text-green-400">
						{data.developers.filter((d: any) => d.isActive && d.acceptedAt).length}
					</div>
					<p class="text-xs text-muted-foreground">currently active</p>
				</CardContent>
			</Card>

			<Card class="transition-all hover:shadow-md border-yellow-200 dark:border-yellow-800">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Pending Invites</CardTitle>
					<Mail class="size-4 text-yellow-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
						{data.developers.filter((d: any) => !d.acceptedAt).length}
					</div>
					<p class="text-xs text-muted-foreground">awaiting response</p>
				</CardContent>
			</Card>

			<Card class="transition-all hover:shadow-md border-blue-200 dark:border-blue-800">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Roles</CardTitle>
					<Shield class="size-4 text-blue-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
						{new Set(data.developers.map((d: any) => d.role)).size}
					</div>
					<p class="text-xs text-muted-foreground">available roles</p>
				</CardContent>
			</Card>
		</div>

		<!-- ─── Invite Developer ────────────────────────────────────────── -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<UserPlus class="size-5" />
					Invite Developer
				</CardTitle>
				<CardDescription>
					Send an invitation to a developer to join the team
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onsubmit={handleInvite} class="space-y-4">
					<div class="grid gap-4 md:grid-cols-2">
						<div class="space-y-2">
							<Label for="email">Email Address *</Label>
							<Input 
								id="email" 
								type="email" 
								bind:value={email} 
								placeholder="developer@example.com"
								class={errors.email ? 'border-destructive' : ''}
							/>
							{#if errors.email}<p class="text-sm text-destructive">{errors.email}</p>{/if}
						</div>

						<div class="space-y-2">
							<Label for="name">Full Name *</Label>
							<Input 
								id="name" 
								type="text" 
								bind:value={name} 
								placeholder="Jane Doe"
								class={errors.name ? 'border-destructive' : ''}
							/>
							{#if errors.name}<p class="text-sm text-destructive">{errors.name}</p>{/if}
						</div>

						<div class="space-y-2">
							<Label for="role">Role *</Label>
							<select 
								id="role" 
								bind:value={role}
								onchange={(e) => handleRoleChange(e.currentTarget.value)}
								class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
							>
								<option value="">Select role</option>
								{#each data.developerRoles as r}
									<option value={r.value}>{r.label} — {r.description}</option>
								{/each}
							</select>
							{#if errors.role}<p class="text-sm text-destructive">{errors.role}</p>{/if}
						</div>

						<div class="space-y-2">
							<Label>Permissions</Label>
							<div class="max-h-48 overflow-y-auto rounded-md border p-2 space-y-1">
								{#each data.availablePermissions as perm}
									{@const isDisabled = role === 'OBSERVER' && ROLE_PERMISSIONS['OBSERVER'].includes(perm.name)}
									{@const isLocked = role === 'OBSERVER' && ROLE_PERMISSIONS['OBSERVER'].includes(perm.name) && selectedPermissions.includes(perm.name)}
									{@const isSelected = selectedPermissions.includes(perm.name)}
									
									<label class={cn(
										"flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/30 p-1 rounded transition-colors",
										role === 'OBSERVER' && ROLE_PERMISSIONS['OBSERVER'].includes(perm.name) ? 'bg-muted/20 border border-blue-200 dark:border-blue-800' : '',
										role && !ROLE_PERMISSIONS[role]?.includes(perm.name) && selectedPermissions.includes(perm.name) ? 'bg-yellow-50/50 border border-yellow-200 dark:border-yellow-800' : ''
									)}>
										<Checkbox 
											checked={isSelected}
											onCheckedChange={() => togglePermission(perm.name)}
											disabled={role === 'OBSERVER' && ROLE_PERMISSIONS['OBSERVER'].includes(perm.name)}
										/>
										<span class={cn(
											"flex-1",
											role === 'OBSERVER' && ROLE_PERMISSIONS['OBSERVER'].includes(perm.name) ? 'font-medium' : ''
										)}>
											{perm.display}
											{#if role === 'OBSERVER' && ROLE_PERMISSIONS['OBSERVER'].includes(perm.name)}
												<span class="text-xs text-blue-500 ml-1">(fixed)</span>
											{/if}
										</span>
										<span class="text-xs text-muted-foreground">— {perm.description}</span>
										{#if role && ROLE_PERMISSIONS[role]?.includes(perm.name) && !ROLE_PERMISSIONS['OBSERVER'].includes(perm.name)}
											<Badge variant="outline" class="text-[9px] text-blue-500 border-blue-300">Role</Badge>
										{/if}
										{#if role === 'OBSERVER' && ROLE_PERMISSIONS['OBSERVER'].includes(perm.name)}
											<Badge variant="outline" class="text-[9px] text-gray-500 border-gray-300">View Only</Badge>
										{/if}
									</label>
								{/each}
							</div>
							<p class="text-xs text-muted-foreground mt-1">
								{#if role === 'OBSERVER'}
									<span class="text-blue-500">🔒 Observer permissions are fixed and cannot be changed</span>
								{:else if role}
									<span class="text-muted-foreground">Blue <Badge variant="outline" class="text-[9px] text-blue-500 border-blue-300">Role</Badge> permissions are auto-selected for this role</span>
								{/if}
							</p>
						</div>
					</div>

					<Button type="submit" disabled={isSubmitting} class="gap-2">
						{#if isSubmitting}
							<Loader class="size-4 animate-spin" />
							Sending Invitation...
						{:else}
							<Send class="size-4" />
							Send Invitation
						{/if}
					</Button>
				</form>
			</CardContent>
		</Card>

		<!-- ─── Developers List ──────────────────────────────────────────── -->
		<Card>
			<CardHeader>
				<div class="flex flex-wrap items-center justify-between gap-4">
					<div>
						<CardTitle>Development Team</CardTitle>
						<CardDescription>
							Managing your development team members
						</CardDescription>
					</div>
					
					<!-- Filters -->
					<div class="flex flex-wrap gap-2">
						<div class="relative">
							<Search class="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
							<Input
								bind:value={searchQuery}
								placeholder="Search team members..."
								class="w-[180px] pl-8 h-8 text-sm"
							/>
						</div>
						<select
							bind:value={filterRole}
							class="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
						>
							<option value="all">All Roles</option>
							{#each data.developerRoles as r}
								<option value={r.value}>{r.label}</option>
							{/each}
						</select>
						<select
							bind:value={filterStatus}
							class="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
						>
							<option value="all">All Status</option>
							<option value="active">Active</option>
							<option value="inactive">Inactive</option>
							<option value="pending">Pending</option>
						</select>
					</div>
				</div>
			</CardHeader>
			<CardContent class="space-y-4">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Email</TableHead>
							<TableHead>Role</TableHead>
							<TableHead>Permissions</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Joined</TableHead>
							<TableHead class="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#if filteredDevelopers.length === 0}
							<TableRow>
								<TableCell colspan="7" class="text-center text-muted-foreground py-8">
									{#if searchQuery || filterRole !== 'all' || filterStatus !== 'all'}
										<Search class="mx-auto size-8 text-muted-foreground/50 mb-2" />
										<p>No developers match your filters</p>
									{:else}
										<UsersIcon class="mx-auto size-8 text-muted-foreground/50 mb-2" />
										<p>No developers on the team yet</p>
										<p class="text-sm mt-1">Invite your first developer above</p>
									{/if}
								</TableCell>
							</TableRow>
						{:else}
							{#each filteredDevelopers as dev}
								<TableRow class="transition-colors hover:bg-muted/30">
									<TableCell class="font-medium">
										<div class="flex items-center gap-2">
											<div class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
												{dev.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
											</div>
											<span>{dev.name}</span>
										</div>
									</TableCell>
									<TableCell class="font-mono text-sm">{dev.email}</TableCell>
									<TableCell>
										<Badge class={getRoleColor(dev.role)}>
											<svelte:component this={getRoleIcon(dev.role)} class="size-3 mr-1" />
											{dev.role}
										</Badge>
									</TableCell>
									<TableCell>
										{#if dev.permissions.length > 0}
											<div class="flex flex-wrap gap-1 max-w-[150px]">
												{#each dev.permissions.slice(0, 3) as perm}
													<Badge variant="outline" class="text-[10px]">{perm.replace(/_/g, ' ')}</Badge>
												{/each}
												{#if dev.permissions.length > 3}
													<Badge variant="outline" class="text-[10px]">+{dev.permissions.length - 3}</Badge>
												{/if}
											</div>
										{:else}
											<span class="text-muted-foreground/50 text-xs">—</span>
										{/if}
									</TableCell>
									<TableCell>
										<Badge variant={getStatusBadge(dev.isActive, dev.acceptedAt).variant} class="gap-1">
											<svelte:component this={getStatusBadge(dev.isActive, dev.acceptedAt).icon} class="size-3" />
											{getStatusBadge(dev.isActive, dev.acceptedAt).label}
										</Badge>
									</TableCell>
									<TableCell class="text-sm text-muted-foreground">
										{dev.acceptedAt ? formatDate(dev.acceptedAt) : 'Pending'}
									</TableCell>
									<TableCell class="text-right">
										<div class="flex items-center justify-end gap-1">
											<Button 
												variant="ghost" 
												size="sm" 
												class="h-7 w-7 p-0"
												onclick={() => openEditDialog(dev)}
												title="Edit developer"
											>
												<UserCog class="size-3.5" />
												<span class="sr-only">Edit</span>
											</Button>
											{#if !dev.acceptedAt}
												<Button 
													variant="ghost" 
													size="sm" 
													class="h-7 w-7 p-0"
													onclick={() => handleResendInvite(dev.id, dev.email)}
													title="Resend invitation"
												>
													<Send class="size-3.5" />
													<span class="sr-only">Resend</span>
												</Button>
											{/if}
											<Button 
												variant="ghost" 
												size="sm" 
												onclick={() => handleRemove(dev.id, dev.name)}
												class="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
												title="Remove developer"
											>
												<Trash2 class="size-3.5" />
												<span class="sr-only">Remove</span>
											</Button>
										</div>
									</TableCell>
								</TableRow>
							{/each}
						{/if}
					</TableBody>
				</Table>

				<!-- ─── Pagination ────────────────────────────────────────────── -->
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

		<!-- ─── Edit Developer Dialog ────────────────────────────────────── -->
		<Dialog bind:open={editDialogOpen}>
			<DialogContent class="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Edit Developer</DialogTitle>
					<DialogDescription>
						Update role and permissions for {editingDeveloper?.name}
					</DialogDescription>
				</DialogHeader>
				{#if editingDeveloper}
					<form onsubmit={(e) => { e.preventDefault(); handleUpdate(editingDeveloper.id); }} class="space-y-4">
						<div class="space-y-2">
							<Label>Role</Label>
							<select
								bind:value={editingDeveloper.role}
								onchange={(e) => handleEditRoleChange(e.currentTarget.value)}
								class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
							>
								{#each data.developerRoles as r}
									<option value={r.value}>{r.label}</option>
								{/each}
							</select>
						</div>

						<div class="space-y-2">
							<Label>Permissions</Label>
							<div class="max-h-48 overflow-y-auto rounded-md border p-2 space-y-1">
								{#each data.availablePermissions as perm}
									{@const isDisabled = editingDeveloper.role === 'OBSERVER' && ROLE_PERMISSIONS['OBSERVER'].includes(perm.name)}
									{@const isLocked = editingDeveloper.role === 'OBSERVER' && ROLE_PERMISSIONS['OBSERVER'].includes(perm.name) && editingDeveloper.permissions.includes(perm.name)}
									{@const isSelected = editingDeveloper.permissions.includes(perm.name)}
									
									<label class={cn(
										"flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/30 p-1 rounded transition-colors",
										editingDeveloper.role === 'OBSERVER' && ROLE_PERMISSIONS['OBSERVER'].includes(perm.name) ? 'bg-muted/20 border border-blue-200 dark:border-blue-800' : '',
										editingDeveloper.role && !ROLE_PERMISSIONS[editingDeveloper.role]?.includes(perm.name) && editingDeveloper.permissions.includes(perm.name) ? 'bg-yellow-50/50 border border-yellow-200 dark:border-yellow-800' : ''
									)}>
										<Checkbox 
											checked={isSelected}
											onCheckedChange={() => toggleEditPermission(perm.name)}
											disabled={editingDeveloper.role === 'OBSERVER' && ROLE_PERMISSIONS['OBSERVER'].includes(perm.name)}
										/>
										<span class={cn(
											"flex-1",
											editingDeveloper.role === 'OBSERVER' && ROLE_PERMISSIONS['OBSERVER'].includes(perm.name) ? 'font-medium' : ''
										)}>
											{perm.display}
											{#if editingDeveloper.role === 'OBSERVER' && ROLE_PERMISSIONS['OBSERVER'].includes(perm.name)}
												<span class="text-xs text-blue-500 ml-1">(fixed)</span>
											{/if}
										</span>
										<span class="text-xs text-muted-foreground">— {perm.description}</span>
										{#if editingDeveloper.role && ROLE_PERMISSIONS[editingDeveloper.role]?.includes(perm.name) && !ROLE_PERMISSIONS['OBSERVER'].includes(perm.name)}
											<Badge variant="outline" class="text-[9px] text-blue-500 border-blue-300">Role</Badge>
										{/if}
										{#if editingDeveloper.role === 'OBSERVER' && ROLE_PERMISSIONS['OBSERVER'].includes(perm.name)}
											<Badge variant="outline" class="text-[9px] text-gray-500 border-gray-300">View Only</Badge>
										{/if}
									</label>
								{/each}
							</div>
							<p class="text-xs text-muted-foreground mt-1">
								{#if editingDeveloper.role === 'OBSERVER'}
									<span class="text-blue-500">🔒 Observer permissions are fixed and cannot be changed</span>
								{:else if editingDeveloper.role}
									<span class="text-muted-foreground">Blue <Badge variant="outline" class="text-[9px] text-blue-500 border-blue-300">Role</Badge> permissions are auto-selected for this role</span>
								{/if}
							</p>
						</div>

						<div class="flex items-center gap-2">
							<Checkbox 
								checked={editingDeveloper.isActive} 
								onCheckedChange={() => editingDeveloper.isActive = !editingDeveloper.isActive}
							/>
							<Label>Active</Label>
						</div>

						<DialogFooter>
							<Button variant="outline" onclick={() => editDialogOpen = false}>
								Cancel
							</Button>
							<Button type="submit" disabled={isUpdating}>
								{#if isUpdating}
									<Loader class="mr-2 size-4 animate-spin" />
									Updating...
								{:else}
									Update Developer
								{/if}
							</Button>
						</DialogFooter>
					</form>
				{/if}
			</DialogContent>
		</Dialog>
	{/if}
</main>