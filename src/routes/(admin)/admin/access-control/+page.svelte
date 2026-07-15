<!-- src/routes/(admin)/admin/access-control/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Label } from '$lib/components/ui/label/index.js'; // ← Added this import
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select/index.js';
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow,
	} from '$lib/components/ui/table/index.js';
	import {
		Shield,
		Users,
		UserCheck,
		UserX,
		AlertCircle,
		LoaderCircle,
		RefreshCw,
		Check,
		X,
		Plus,
		Trash2,
		Key,
	} from '@lucide/svelte/icons';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';

	let { data, form } = $props();

	let isRefreshing = $state(false);
	let isAssigning = $state(false);
	let isRemoving = $state<string | null>(null);
	let selectedStaff = $state('');
	let selectedRole = $state('');

	async function handleRefresh() {
		if (isRefreshing) return;
		isRefreshing = true;
		await invalidateAll();
		isRefreshing = false;
	}

	async function handleAssignRole() {
		if (!selectedStaff || !selectedRole) {
			toast.error('Please select both a staff member and a role');
			return;
		}

		isAssigning = true;
		const fd = new FormData();
		fd.set('staffId', selectedStaff);
		fd.set('roleId', selectedRole);

		try {
			const res = await fetch('?/assignRole', { method: 'POST', body: fd });
			const result = await res.json();
			if (result.success) {
				toast.success(result.message || 'Role assigned');
				selectedStaff = '';
				selectedRole = '';
				await invalidateAll();
			} else {
				toast.error(result.error || 'Failed to assign role');
			}
		} catch (err) {
			toast.error('Failed to assign role');
		} finally {
			isAssigning = false;
		}
	}

	async function handleRemoveRole(assignmentId: string) {
		if (!confirm('Remove this role assignment?')) return;
		isRemoving = assignmentId;

		const fd = new FormData();
		fd.set('assignmentId', assignmentId);

		try {
			const res = await fetch('?/removeRole', { method: 'POST', body: fd });
			const result = await res.json();
			if (result.success) {
				toast.success(result.message || 'Role removed');
				await invalidateAll();
			} else {
				toast.error(result.error || 'Failed to remove role');
			}
		} catch (err) {
			toast.error('Failed to remove role');
		} finally {
			isRemoving = null;
		}
	}

	function groupPermissions(permissions: any[]) {
		const groups: Record<string, any[]> = {};
		for (const p of permissions) {
			if (!groups[p.group]) groups[p.group] = [];
			groups[p.group].push(p);
		}
		return groups;
	}

	const groupedPermissions = $derived(groupPermissions(data?.permissions || []));
</script>

<svelte:head>
	<title>Access Control — MOUAU e-Test</title>
</svelte:head>

<Topbar title="Access Control" description="Manage roles and permissions">
	{#snippet actions()}
		<Button
			variant="outline"
			size="sm"
			onclick={handleRefresh}
			disabled={isRefreshing}
		>
			{#if isRefreshing}
				<LoaderCircle class="size-4 animate-spin" />
			{:else}
				<RefreshCw class="size-4" />
			{/if}
			Refresh
		</Button>
	{/snippet}
</Topbar>

<main class="flex flex-1 flex-col gap-6 p-6">
	{#if data?.error}
		<Alert variant="destructive">
			<AlertCircle class="size-4" />
			<AlertDescription>{data.error}</AlertDescription>
		</Alert>
	{:else}
		<!-- Stats Cards -->
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Total Roles</CardTitle>
					<Shield class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{data?.stats?.totalRoles || 0}</div>
					<p class="text-xs text-muted-foreground">defined roles</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Permissions</CardTitle>
					<Key class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{data?.stats?.totalPermissions || 0}</div>
					<p class="text-xs text-muted-foreground">permission grants</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Assignments</CardTitle>
					<UserCheck class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{data?.stats?.totalAssignments || 0}</div>
					<p class="text-xs text-muted-foreground">staff with roles</p>
				</CardContent>
			</Card>
		</div>

		<Tabs defaultValue="roles" class="space-y-4">
			<TabsList>
				<TabsTrigger value="roles">Roles</TabsTrigger>
				<TabsTrigger value="permissions">Permissions</TabsTrigger>
				<TabsTrigger value="assignments">Assignments</TabsTrigger>
			</TabsList>

			<!-- Roles Tab -->
			<TabsContent value="roles">
				<Card>
					<CardHeader>
						<CardTitle>Roles</CardTitle>
						<CardDescription>All defined roles in the system</CardDescription>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Role</TableHead>
									<TableHead>Display Name</TableHead>
									<TableHead>Permissions</TableHead>
									<TableHead class="text-center">Staff</TableHead>
									<TableHead>System</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#each data?.roles || [] as role}
									<TableRow>
										<TableCell class="font-medium">{role.name}</TableCell>
										<TableCell>{role.displayName}</TableCell>
										<TableCell>
											<div class="flex flex-wrap gap-1">
												{#each role.permissions.slice(0, 3) as perm}
													<Badge variant="outline" class="text-[10px]">{perm}</Badge>
												{/each}
												{#if role.permissions.length > 3}
													<Badge variant="outline" class="text-[10px]">+{role.permissions.length - 3}</Badge>
												{/if}
											</div>
										</TableCell>
										<TableCell class="text-center">
											<Badge variant="secondary">{role.staffCount}</Badge>
										</TableCell>
										<TableCell>
											{#if role.isSystem}
												<Badge variant="default" class="gap-1">
													<Check class="size-3" />
													System
												</Badge>
											{:else}
												<Badge variant="outline" class="gap-1">
													<X class="size-3" />
													Custom
												</Badge>
											{/if}
										</TableCell>
									</TableRow>
								{/each}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			</TabsContent>

			<!-- Permissions Tab -->
			<TabsContent value="permissions">
				<Card>
					<CardHeader>
						<CardTitle>Permissions</CardTitle>
						<CardDescription>All available permissions grouped by category</CardDescription>
					</CardHeader>
					<CardContent>
						{#each Object.entries(groupedPermissions) as [group, perms]}
							<div class="mb-6 last:mb-0">
								<h4 class="text-sm font-medium text-muted-foreground mb-2">{group}</h4>
								<div class="flex flex-wrap gap-2">
									{#each perms as perm}
										<Badge variant="outline" class="px-3 py-1 text-xs" title={perm.description || perm.name}>
											{perm.name}
										</Badge>
									{/each}
								</div>
							</div>
						{/each}
					</CardContent>
				</Card>
			</TabsContent>

			<!-- Assignments Tab -->
			<TabsContent value="assignments">
				<Card>
					<CardHeader>
						<CardTitle>Staff Assignments</CardTitle>
						<CardDescription>Manage role assignments for staff members</CardDescription>
					</CardHeader>
					<CardContent class="space-y-4">
						<!-- Assign Form -->
						<div class="flex flex-wrap gap-4 items-end">
							<div class="flex-1 min-w-[200px]">
								<Label class="text-xs text-muted-foreground">Staff Member</Label>
								<Select type="single" bind:value={selectedStaff}>
									<SelectTrigger>
										<span class="truncate">
											{selectedStaff ? data?.staff?.find((s: any) => s.id === selectedStaff)?.name || 'Select staff' : 'Select staff'}
										</span>
									</SelectTrigger>
									<SelectContent>
										{#each data?.staff || [] as staff}
											<SelectItem value={staff.id}>{staff.name}</SelectItem>
										{/each}
									</SelectContent>
								</Select>
							</div>
							<div class="flex-1 min-w-[200px]">
								<Label class="text-xs text-muted-foreground">Role</Label>
								<Select type="single" bind:value={selectedRole}>
									<SelectTrigger>
										<span class="truncate">
											{selectedRole ? data?.roles?.find((r: any) => r.id === selectedRole)?.displayName || 'Select role' : 'Select role'}
										</span>
									</SelectTrigger>
									<SelectContent>
										{#each data?.roles || [] as role}
											<SelectItem value={role.id}>{role.displayName}</SelectItem>
										{/each}
									</SelectContent>
								</Select>
							</div>
							<Button 
								onclick={handleAssignRole} 
								disabled={isAssigning || !selectedStaff || !selectedRole}
								class="gap-2"
							>
								{#if isAssigning}
									<LoaderCircle class="size-4 animate-spin" />
								{:else}
									<Plus class="size-4" />
								{/if}
								Assign Role
							</Button>
						</div>

						<!-- Assignments Table -->
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Staff</TableHead>
									<TableHead>Role</TableHead>
									<TableHead class="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#each data?.staff || [] as staff}
									{#if staff.roles.length > 0}
										{#each staff.roles as roleName}
											<TableRow>
												<TableCell>{staff.name}</TableCell>
												<TableCell>
													<Badge variant="outline">{roleName}</Badge>
												</TableCell>
												<TableCell class="text-right">
													<Button 
														variant="ghost" 
														size="sm" 
														class="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
														disabled={isRemoving !== null}
													>
														<Trash2 class="size-3.5" />
														<span class="sr-only">Remove</span>
													</Button>
												</TableCell>
											</TableRow>
										{/each}
									{/if}
								{/each}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			</TabsContent>
		</Tabs>
	{/if}
</main>