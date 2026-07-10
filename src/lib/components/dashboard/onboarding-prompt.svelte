<!-- src/lib/components/dashboard/onboarding-prompt.svelte -->
<script lang="ts">
	import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger,
	} from '$lib/components/ui/select/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import {
		Building2,
		BookOpen,
		Users,
		CheckCircle,
		AlertCircle,
		LoaderCircle,
		Plus,
		Rocket,
	} from '@lucide/svelte/icons';
	import { invalidateAll } from '$app/navigation';

	let { data, open, onOpenChange } = $props();

	// ─── State ────────────────────────────────────────────────────────────────
	let isSubmitting = $state(false);
	let activeTab = $state('college');
	let success = $state<string | null>(null);
	let error = $state<string | null>(null);

	// ─── College Form ──────────────────────────────────────────────────────
	let collegeForm = $state({
		name: '',
		shortName: '',
		code: '',
		email: '',
		phone: '',
	});

	// ─── Department Form ──────────────────────────────────────────────────
	let departmentForm = $state({
		name: '',
		shortName: '',
		code: '',
		collegeId: '',
		email: '',
		phone: '',
	});

	// ─── Course Form ──────────────────────────────────────────────────────
	let courseForm = $state({
		code: '',
		title: '',
		creditUnits: 2,
		levelId: '',
		departmentId: '',
		type: 'COMPULSORY',
		description: '',
	});

	// ─── Data ──────────────────────────────────────────────────────────────
	let user = $derived(data?.user);
	let colleges = $derived(data?.colleges || []);
	let departments = $derived(data?.departments || []);
	let levels = $derived(data?.levels || []);
	let courses = $derived(data?.courses || []);
	let canCreateCollege = $derived(data?.permissions?.canCreateCollege || false);
	let canCreateDepartment = $derived(data?.permissions?.canCreateDepartment || false);
	let canCreateCourse = $derived(data?.permissions?.canCreateCourse || false);
	let hasCollege = $derived(colleges.length > 0);
	let hasDepartment = $derived(departments.length > 0);
	let hasCourse = $derived(courses.length > 0);

	// Determine which tab to show first
	$effect(() => {
		if (hasCollege && !hasDepartment) {
			activeTab = 'department';
		} else if (hasCollege && hasDepartment && !hasCourse) {
			activeTab = 'course';
		} else if (!hasCollege) {
			activeTab = 'college';
		}
	});

	// ─── Handlers ────────────────────────────────────────────────────────────
	async function createCollege() {
		if (!collegeForm.name || !collegeForm.shortName) {
			error = 'Name and short name are required';
			return;
		}

		isSubmitting = true;
		error = null;
		success = null;

		try {
			const response = await fetch('/api/onboarding/college', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(collegeForm),
			});

			const result = await response.json();

			if (response.ok) {
				success = `College "${collegeForm.name}" created successfully!`;
				collegeForm = { name: '', shortName: '', code: '', email: '', phone: '' };
				await invalidateAll();
				window.location.reload();
			} else {
				error = result.error || 'Failed to create college';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create college';
		} finally {
			isSubmitting = false;
		}
	}

	async function createDepartment() {
		if (!departmentForm.name || !departmentForm.shortName || !departmentForm.collegeId) {
			error = 'Name, short name, and college are required';
			return;
		}

		isSubmitting = true;
		error = null;
		success = null;

		try {
			const response = await fetch('/api/onboarding/department', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(departmentForm),
			});

			const result = await response.json();

			if (response.ok) {
				success = `Department "${departmentForm.name}" created successfully!`;
				departmentForm = { name: '', shortName: '', code: '', collegeId: '', email: '', phone: '' };
				await invalidateAll();
				window.location.reload();
			} else {
				error = result.error || 'Failed to create department';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create department';
		} finally {
			isSubmitting = false;
		}
	}

	async function createCourse() {
		if (!courseForm.code || !courseForm.title || !courseForm.departmentId || !courseForm.levelId) {
			error = 'Code, title, department, and level are required';
			return;
		}

		isSubmitting = true;
		error = null;
		success = null;

		try {
			const response = await fetch('/api/onboarding/course', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(courseForm),
			});

			const result = await response.json();

			if (response.ok) {
				success = `Course "${courseForm.code}" created successfully!`;
				courseForm = {
					code: '',
					title: '',
					creditUnits: 2,
					levelId: '',
					departmentId: '',
					type: 'COMPULSORY',
					description: '',
				};
				await invalidateAll();
				window.location.reload();
			} else {
				error = result.error || 'Failed to create course';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create course';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<Dialog open={open} onOpenChange={onOpenChange}>
	<DialogContent class="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
		<DialogHeader>
			<DialogTitle class="flex items-center gap-2">
				<Rocket class="size-5 text-primary" />
				Set Up Your Academic Structure
			</DialogTitle>
			<DialogDescription>
				Complete your onboarding by setting up your college, department, and courses.
				<span class="block text-xs text-muted-foreground mt-1">
					{hasCollege ? '✅ College configured' : '⏳ College needed'} • 
					{hasDepartment ? '✅ Department configured' : '⏳ Department needed'} • 
					{hasCourse ? '✅ Courses configured' : '⏳ Courses needed'}
				</span>
			</DialogDescription>
		</DialogHeader>

		{#if success}
			<Alert class="border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400">
				<CheckCircle class="size-4" />
				<AlertDescription>{success}</AlertDescription>
			</Alert>
		{/if}

		{#if error}
			<Alert variant="destructive">
				<AlertCircle class="size-4" />
				<AlertDescription>{error}</AlertDescription>
			</Alert>
		{/if}

		<!-- Progress Steps -->
		<div class="flex items-center gap-2 py-2">
			<div class="flex items-center gap-1">
				<div class={`h-2 w-2 rounded-full ${hasCollege ? 'bg-green-500' : 'bg-yellow-500'}`} />
				<span class="text-xs">College</span>
			</div>
			<div class="flex-1 h-px bg-border" />
			<div class="flex items-center gap-1">
				<div class={`h-2 w-2 rounded-full ${hasDepartment ? 'bg-green-500' : 'bg-yellow-500'}`} />
				<span class="text-xs">Department</span>
			</div>
			<div class="flex-1 h-px bg-border" />
			<div class="flex items-center gap-1">
				<div class={`h-2 w-2 rounded-full ${hasCourse ? 'bg-green-500' : 'bg-yellow-500'}`} />
				<span class="text-xs">Courses</span>
			</div>
		</div>

		{#if hasCollege && hasDepartment && hasCourse}
			<div class="text-center py-8">
				<CheckCircle class="mx-auto size-12 text-green-500 mb-3" />
				<h3 class="text-lg font-semibold">All Set!</h3>
				<p class="text-sm text-muted-foreground">
					You're fully onboarded. You can close this window.
				</p>
			</div>
		{:else}
			<Tabs bind:value={activeTab} class="space-y-4">
				<TabsList class="grid w-full grid-cols-3">
					<TabsTrigger value="college" disabled={hasCollege || !canCreateCollege}>
						<Building2 class="mr-2 size-4" />
						College
					</TabsTrigger>
					<TabsTrigger value="department" disabled={!hasCollege || hasDepartment || !canCreateDepartment}>
						<Users class="mr-2 size-4" />
						Department
					</TabsTrigger>
					<TabsTrigger value="course" disabled={!hasDepartment || hasCourse || !canCreateCourse}>
						<BookOpen class="mr-2 size-4" />
						Course
					</TabsTrigger>
				</TabsList>

				<!-- ─── College Tab ────────────────────────────────────────────────── -->
				<TabsContent value="college">
					{#if hasCollege}
						<div class="text-center py-4">
							<CheckCircle class="mx-auto size-8 text-green-500 mb-2" />
							<p class="text-sm text-muted-foreground">College already configured</p>
						</div>
					{:else if canCreateCollege}
						<div class="grid gap-4 sm:grid-cols-2">
							<div class="space-y-2">
								<Label for="modalCollegeName">College Name *</Label>
								<Input
									id="modalCollegeName"
									bind:value={collegeForm.name}
									placeholder="e.g., College of Physical & Applied Sciences"
								/>
							</div>
							<div class="space-y-2">
								<Label for="modalCollegeShortName">Short Name *</Label>
								<Input
									id="modalCollegeShortName"
									bind:value={collegeForm.shortName}
									placeholder="e.g., COLPAS"
								/>
							</div>
							<div class="space-y-2">
								<Label for="modalCollegeCode">Code</Label>
								<Input
									id="modalCollegeCode"
									bind:value={collegeForm.code}
									placeholder="e.g., CPAS"
								/>
							</div>
							<div class="space-y-2">
								<Label for="modalCollegeEmail">Email</Label>
								<Input
									id="modalCollegeEmail"
									type="email"
									bind:value={collegeForm.email}
									placeholder="college@university.edu.ng"
								/>
							</div>
							<div class="space-y-2 sm:col-span-2">
								<Label for="modalCollegePhone">Phone</Label>
								<Input
									id="modalCollegePhone"
									bind:value={collegeForm.phone}
									placeholder="+2348000000000"
								/>
							</div>
						</div>
						<div class="flex justify-end">
							<Button onclick={createCollege} disabled={isSubmitting}>
								{#if isSubmitting}
									<LoaderCircle class="mr-2 size-4 animate-spin" />
									Creating...
								{:else}
									<Plus class="mr-2 size-4" />
									Create College
								{/if}
							</Button>
						</div>
					{:else}
						<div class="text-center py-4 text-muted-foreground">
							<p class="text-sm">You don't have permission to create colleges</p>
							<p class="text-xs">Contact your HOD or Dean</p>
						</div>
					{/if}
				</TabsContent>

				<!-- ─── Department Tab ────────────────────────────────────────────── -->
				<TabsContent value="department">
					{#if hasDepartment}
						<div class="text-center py-4">
							<CheckCircle class="mx-auto size-8 text-green-500 mb-2" />
							<p class="text-sm text-muted-foreground">Department already configured</p>
						</div>
					{:else if canCreateDepartment}
						<div class="grid gap-4 sm:grid-cols-2">
							<div class="space-y-2">
								<Label for="modalDeptCollege">College *</Label>
								<Select>
									<SelectTrigger id="modalDeptCollege" onchange={(e) => departmentForm.collegeId = e.currentTarget.value}>
										<span class="truncate">
											{departmentForm.collegeId 
												? colleges.find(c => c.id === departmentForm.collegeId)?.name 
												: 'Select a college'}
										</span>
									</SelectTrigger>
									<SelectContent>
										{#each colleges as college}
											<SelectItem 
												value={college.id}
												selected={departmentForm.collegeId === college.id}
												onclick={() => departmentForm.collegeId = college.id}
											>
												{college.name}
											</SelectItem>
										{/each}
									</SelectContent>
								</Select>
							</div>
							<div class="space-y-2">
								<Label for="modalDeptName">Department Name *</Label>
								<Input
									id="modalDeptName"
									bind:value={departmentForm.name}
									placeholder="e.g., Department of Computer Science"
								/>
							</div>
							<div class="space-y-2">
								<Label for="modalDeptShortName">Short Name *</Label>
								<Input
									id="modalDeptShortName"
									bind:value={departmentForm.shortName}
									placeholder="e.g., CSC"
								/>
							</div>
							<div class="space-y-2">
								<Label for="modalDeptCode">Code</Label>
								<Input
									id="modalDeptCode"
									bind:value={departmentForm.code}
									placeholder="e.g., CSC"
								/>
							</div>
							<div class="space-y-2">
								<Label for="modalDeptEmail">Email</Label>
								<Input
									id="modalDeptEmail"
									type="email"
									bind:value={departmentForm.email}
									placeholder="dept@university.edu.ng"
								/>
							</div>
							<div class="space-y-2">
								<Label for="modalDeptPhone">Phone</Label>
								<Input
									id="modalDeptPhone"
									bind:value={departmentForm.phone}
									placeholder="+2348000000000"
								/>
							</div>
						</div>
						<div class="flex justify-end">
							<Button onclick={createDepartment} disabled={isSubmitting}>
								{#if isSubmitting}
									<LoaderCircle class="mr-2 size-4 animate-spin" />
									Creating...
								{:else}
									<Plus class="mr-2 size-4" />
									Create Department
								{/if}
							</Button>
						</div>
					{:else}
						<div class="text-center py-4 text-muted-foreground">
							<p class="text-sm">You don't have permission to create departments</p>
							<p class="text-xs">Contact your HOD or Dean</p>
						</div>
					{/if}
				</TabsContent>

				<!-- ─── Course Tab ────────────────────────────────────────────────── -->
				<TabsContent value="course">
					{#if hasCourse}
						<div class="text-center py-4">
							<CheckCircle class="mx-auto size-8 text-green-500 mb-2" />
							<p class="text-sm text-muted-foreground">Courses already configured</p>
						</div>
					{:else if canCreateCourse}
						<div class="grid gap-4 sm:grid-cols-2">
							<div class="space-y-2">
								<Label for="modalCourseDepartment">Department *</Label>
								<Select>
									<SelectTrigger id="modalCourseDepartment" onchange={(e) => courseForm.departmentId = e.currentTarget.value}>
										<span class="truncate">
											{courseForm.departmentId 
												? departments.find(d => d.id === courseForm.departmentId)?.name 
												: 'Select a department'}
										</span>
									</SelectTrigger>
									<SelectContent>
										{#each departments as dept}
											<SelectItem 
												value={dept.id}
												selected={courseForm.departmentId === dept.id}
												onclick={() => courseForm.departmentId = dept.id}
											>
												{dept.name}
											</SelectItem>
										{/each}
									</SelectContent>
								</Select>
							</div>
							<div class="space-y-2">
								<Label for="modalCourseLevel">Level *</Label>
								<Select>
									<SelectTrigger id="modalCourseLevel" onchange={(e) => courseForm.levelId = e.currentTarget.value}>
										<span class="truncate">
											{courseForm.levelId 
												? levels.find(l => l.id === courseForm.levelId)?.label 
												: 'Select a level'}
										</span>
									</SelectTrigger>
									<SelectContent>
										{#each levels as level}
											<SelectItem 
												value={level.id}
												selected={courseForm.levelId === level.id}
												onclick={() => courseForm.levelId = level.id}
											>
												{level.label}
											</SelectItem>
										{/each}
									</SelectContent>
								</Select>
							</div>
							<div class="space-y-2">
								<Label for="modalCourseCode">Course Code *</Label>
								<Input
									id="modalCourseCode"
									bind:value={courseForm.code}
									placeholder="e.g., CSC301"
								/>
							</div>
							<div class="space-y-2">
								<Label for="modalCourseTitle">Course Title *</Label>
								<Input
									id="modalCourseTitle"
									bind:value={courseForm.title}
									placeholder="e.g., Database Management Systems"
								/>
							</div>
							<div class="space-y-2">
								<Label for="modalCourseCredits">Credit Units</Label>
								<Input
									id="modalCourseCredits"
									type="number"
									bind:value={courseForm.creditUnits}
									min="1"
									max="6"
								/>
							</div>
							<div class="space-y-2">
								<Label for="modalCourseType">Type</Label>
								<Select>
									<SelectTrigger id="modalCourseType" onchange={(e) => courseForm.type = e.currentTarget.value}>
										<span class="truncate">{courseForm.type}</span>
									</SelectTrigger>
									<SelectContent>
										<SelectItem 
											value="COMPULSORY" 
											selected={courseForm.type === 'COMPULSORY'}
											onclick={() => courseForm.type = 'COMPULSORY'}
										>
											Compulsory
										</SelectItem>
										<SelectItem 
											value="ELECTIVE" 
											selected={courseForm.type === 'ELECTIVE'}
											onclick={() => courseForm.type = 'ELECTIVE'}
										>
											Elective
										</SelectItem>
										<SelectItem 
											value="GENERAL_STUDIES" 
											selected={courseForm.type === 'GENERAL_STUDIES'}
											onclick={() => courseForm.type = 'GENERAL_STUDIES'}
										>
											General Studies
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div class="space-y-2 sm:col-span-2">
								<Label for="modalCourseDescription">Description</Label>
								<Textarea
									id="modalCourseDescription"
									bind:value={courseForm.description}
									placeholder="Course description..."
									rows={2}
								/>
							</div>
						</div>
						<div class="flex justify-end">
							<Button onclick={createCourse} disabled={isSubmitting}>
								{#if isSubmitting}
									<LoaderCircle class="mr-2 size-4 animate-spin" />
									Creating...
								{:else}
									<Plus class="mr-2 size-4" />
									Create Course
								{/if}
							</Button>
						</div>
					{:else}
						<div class="text-center py-4 text-muted-foreground">
							<p class="text-sm">You don't have permission to create courses</p>
							<p class="text-xs">Contact your HOD</p>
						</div>
					{/if}
				</TabsContent>
			</Tabs>
		{/if}

		<DialogFooter>
			<Button variant="outline" onclick={() => onOpenChange(false)}>
				{#if hasCollege && hasDepartment && hasCourse}
					Done
				{:else}
					Close
				{/if}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>