<!-- src/routes/(admin)/admin/levels/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '$lib/components/ui/dialog/index.js';
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
		Plus,
		Edit,
		Trash2,
		GraduationCap,
		BookOpen,
		Users,
		AlertCircle,
		LoaderCircle,
		RefreshCw,
		Check,
		X,
	} from '@lucide/svelte/icons';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';

	let { data, form } = $props();

	let isRefreshing = $state(false);
	let isDeleting = $state<string | null>(null);
	let editingLevel = $state<any>(null);
	let editDialogOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let deleteId = $state<string | null>(null);

	async function handleRefresh() {
		if (isRefreshing) return;
		isRefreshing = true;
		await invalidateAll();
		isRefreshing = false;
	}

	function openEditDialog(level: any) {
		editingLevel = { ...level };
		editDialogOpen = true;
	}

	function openDeleteDialog(id: string) {
		deleteId = id;
		deleteDialogOpen = true;
	}

	async function handleDelete() {
		if (!deleteId) return;
		isDeleting = deleteId;

		const fd = new FormData();
		fd.set('id', deleteId);

		try {
			const res = await fetch('?/delete', { method: 'POST', body: fd });
			const result = await res.json();
			if (result.success) {
				toast.success(result.message || 'Level deleted');
				deleteDialogOpen = false;
				await invalidateAll();
			} else {
				toast.error(result.error || 'Failed to delete level');
			}
		} catch (err) {
			toast.error('Failed to delete level');
		} finally {
			isDeleting = null;
			deleteId = null;
		}
	}
</script>

<svelte:head>
	<title>Levels — MOUAU e-Test</title>
</svelte:head>

<Topbar title="Levels" description="Manage academic levels">
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
		<Dialog>
			<DialogTrigger>
				<Button size="sm">
					<Plus class="mr-2 size-4" />
					Add Level
				</Button>
			</DialogTrigger>
			<DialogContent>
				<form method="POST" action="?/create" use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') {
							toast.success(result.data?.message || 'Level created');
							await invalidateAll();
						}
						if (result.type === 'failure') {
							toast.error(result.data?.error || 'Failed to create level');
						}
						await update();
					};
				}}>
					<DialogHeader>
						<DialogTitle>Add New Level</DialogTitle>
						<DialogDescription>
							Create a new academic level (e.g., 100, 200, 300, 400)
						</DialogDescription>
					</DialogHeader>
					<div class="space-y-4 py-4">
						<div class="space-y-2">
							<Label for="name">Level Number</Label>
							<Input id="name" name="name" type="number" placeholder="100" required min="1" />
							<p class="text-xs text-muted-foreground">The level number (e.g., 100, 200, 300)</p>
						</div>
						<div class="space-y-2">
							<Label for="label">Level Label</Label>
							<Input id="label" name="label" placeholder="First Year" required />
							<p class="text-xs text-muted-foreground">A descriptive label (e.g., "First Year", "100 Level")</p>
						</div>
					</div>
					<DialogFooter>
						<Button type="submit">Create Level</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
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
					<CardTitle class="text-sm font-medium">Total Levels</CardTitle>
					<GraduationCap class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{data?.stats?.total || 0}</div>
					<p class="text-xs text-muted-foreground">academic levels</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">With Courses</CardTitle>
					<BookOpen class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{data?.stats?.withCourses || 0}</div>
					<p class="text-xs text-muted-foreground">levels with active courses</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">With Students</CardTitle>
					<Users class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{data?.stats?.withStudents || 0}</div>
					<p class="text-xs text-muted-foreground">levels with enrolled students</p>
				</CardContent>
			</Card>
		</div>

		<!-- Levels Table -->
		<Card>
			<CardHeader>
				<CardTitle>Academic Levels</CardTitle>
				<CardDescription>Manage all academic levels in the system</CardDescription>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Level</TableHead>
							<TableHead>Label</TableHead>
							<TableHead class="text-center">Courses</TableHead>
							<TableHead class="text-center">Students</TableHead>
							<TableHead>Created</TableHead>
							<TableHead class="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#if data?.levels?.length === 0}
							<TableRow>
								<TableCell colspan="6" class="text-center text-muted-foreground py-8">
									<GraduationCap class="mx-auto size-8 text-muted-foreground/50 mb-2" />
									<p>No levels found</p>
									<p class="text-sm mt-1">Click "Add Level" to create your first level</p>
								</TableCell>
							</TableRow>
						{:else}
							{#each data.levels as level}
								<TableRow class="transition-colors hover:bg-muted/30">
									<TableCell class="font-bold text-lg">{level.name}</TableCell>
									<TableCell>{level.label}</TableCell>
									<TableCell class="text-center">
										<Badge variant="secondary">{level.courseCount}</Badge>
									</TableCell>
									<TableCell class="text-center">
										<Badge variant="secondary">{level.studentCount}</Badge>
									</TableCell>
									<TableCell className="text-sm text-muted-foreground">
										{new Date(level.createdAt).toLocaleDateString('en-NG', { 
											day: '2-digit', 
											month: 'short', 
											year: 'numeric' 
										})}
									</TableCell>
									<TableCell className="text-right">
										<div className="flex justify-end gap-1">
											<Button variant="ghost" size="sm" class="h-7 w-7 p-0" onclick={() => openEditDialog(level)}>
												<Edit class="size-3.5" />
												<span class="sr-only">Edit</span>
											</Button>
											<Button 
												variant="ghost" 
												size="sm" 
												class="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
												onclick={() => openDeleteDialog(level.id)}
												disabled={isDeleting === level.id}
											>
												{#if isDeleting === level.id}
													<LoaderCircle class="size-3.5 animate-spin" />
												{:else}
													<Trash2 class="size-3.5" />
												{/if}
												<span class="sr-only">Delete</span>
											</Button>
										</div>
									</TableCell>
								</TableRow>
							{/each}
						{/if}
					</TableBody>
				</Table>
			</CardContent>
		</Card>

		<!-- Edit Dialog -->
		<Dialog bind:open={editDialogOpen}>
			<DialogContent>
				<form method="POST" action="?/update" use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') {
							toast.success(result.data?.message || 'Level updated');
							editDialogOpen = false;
							await invalidateAll();
						}
						if (result.type === 'failure') {
							toast.error(result.data?.error || 'Failed to update level');
						}
						await update();
					};
				}}>
					<DialogHeader>
						<DialogTitle>Edit Level</DialogTitle>
						<DialogDescription>
							Update the level label
						</DialogDescription>
					</DialogHeader>
					<div class="space-y-4 py-4">
						<input type="hidden" name="id" value={editingLevel?.id || ''} />
						<div class="space-y-2">
							<Label>Level Number</Label>
							<Input value={editingLevel?.name || ''} disabled />
							<p class="text-xs text-muted-foreground">Level number cannot be changed</p>
						</div>
						<div class="space-y-2">
							<Label for="edit-label">Level Label</Label>
						<Input id="edit-label" name="label" bind:value={editingLevel.label} required />
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onclick={() => editDialogOpen = false}>Cancel</Button>
						<Button type="submit">Save Changes</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>

		<!-- Delete Dialog -->
		<Dialog bind:open={deleteDialogOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete Level</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete this level? This action cannot be undone.
						Levels with courses or students cannot be deleted.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onclick={() => deleteDialogOpen = false}>Cancel</Button>
					<Button variant="destructive" onclick={handleDelete} disabled={isDeleting === deleteId}>
						{#if isDeleting === deleteId}
							<LoaderCircle class="mr-2 size-4 animate-spin" />
							Deleting...
						{:else}
							<Trash2 class="mr-2 size-4" />
							Delete Level
						{/if}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	{/if}
</main>