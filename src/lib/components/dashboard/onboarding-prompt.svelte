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
	import {
		Popover,
		PopoverContent,
		PopoverTrigger,
	} from '$lib/components/ui/popover/index.js';
	import {
		Command,
		CommandEmpty,
		CommandGroup,
		CommandInput,
		CommandItem,
		CommandList,
	} from '$lib/components/ui/command/index.js';
	import {
		Building2,
		BookOpen,
		Users,
		Check,
		Circle,
		CircleAlert,
		History,
		LoaderCircle,
		Plus,
		ChevronsUpDown,
	} from '@lucide/svelte/icons';
	import { invalidateAll } from '$app/navigation';
	import { cn } from '$lib/utils.js';

	let { data, open, onOpenChange } = $props();

	// ─── State ────────────────────────────────────────────────────────────────
	let isSubmitting = $state(false);
	let activeTab = $state('college');
	let success = $state<string | null>(null);
	let error = $state<string | null>(null);

	// ─── Search States ──────────────────────────────────────────────────────
	let collegeSearchOpen = $state(false);
	let departmentSearchOpen = $state(false);
	let levelSearchOpen = $state(false);
	let typeSearchOpen = $state(false);

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
	let hasCollege = $derived(data?.hasCollege ?? false);
	let hasDepartment = $derived(data?.hasDepartment ?? false);
	let hasCourse = $derived(data?.hasCourse ?? false);

	// ─── Computed ──────────────────────────────────────────────────────────
	let selectedCollegeName = $derived(
		colleges.find(c => c.id === departmentForm.collegeId)?.name || 'Select a college'
	);
	let selectedDepartmentName = $derived(
		departments.find(d => d.id === courseForm.departmentId)?.name || 'Select a department'
	);
	let selectedLevelLabel = $derived(
		levels.find(l => l.id === courseForm.levelId)?.label || 'Select a level'
	);

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
				success = `College "${collegeForm.name}" created.`;
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
				success = `Department "${departmentForm.name}" created.`;
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
				success = `Course "${courseForm.code}" created.`;
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

<Dialog {open} onOpenChange={onOpenChange}>
	<DialogContent class="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
		<DialogHeader>
			<DialogTitle class="flex items-center gap-2">
				<Building2 class="size-5" />
				Set up your academic structure
			</DialogTitle>
			<DialogDescription>
				Complete this one-time setup for your college, department, and courses.
			</DialogDescription>
		</DialogHeader>

		<!-- One-time / logging notice -->
		<Alert>
			<History class="size-4" />
			<AlertDescription>
				This setup runs once. Every change you make here is recorded in the activity log
				with your account and a timestamp.
			</AlertDescription>
		</Alert>

		{#if success}
			<Alert>
				<Check class="size-4" />
				<AlertDescription>{success}</AlertDescription>
			</Alert>
		{/if}

		{#if error}
			<Alert variant="destructive">
				<CircleAlert class="size-4" />
				<AlertDescription>{error}</AlertDescription>
			</Alert>
		{/if}

		<!-- Progress Steps -->
		<div class="flex items-center gap-2 py-2 text-sm text-muted-foreground">
			<div class="flex items-center gap-1.5">
				{#if hasCollege}
					<Check class="size-3.5" />
				{:else}
					<Circle class="size-3.5" />
				{/if}
				<span>College</span>
			</div>
			<div class="flex-1 h-px bg-border" />
			<div class="flex items-center gap-1.5">
				{#if hasDepartment}
					<Check class="size-3.5" />
				{:else}
					<Circle class="size-3.5" />
				{/if}
				<span>Department</span>
			</div>
			<div class="flex-1 h-px bg-border" />
			<div class="flex items-center gap-1.5">
				{#if hasCourse}
					<Check class="size-3.5" />
				{:else}
					<Circle class="size-3.5" />
				{/if}
				<span>Courses</span>
			</div>
		</div>

		{#if hasCollege && hasDepartment && hasCourse}
			<div class="text-center py-8">
				<Check class="mx-auto size-10 mb-3" />
				<h3 class="text-lg font-semibold">Setup complete</h3>
				<p class="text-sm text-muted-foreground">
					You can close this window.
				</p>
			</div>
		{:else}
			<Tabs bind:value={activeTab} class="space-y-6">
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
							<Check class="mx-auto size-6 mb-2" />
							<p class="text-sm text-muted-foreground">College already configured</p>
						</div>
					{:else if canCreateCollege}
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
							<div class="space-y-2">
								<Label for="modalCollegeName">College Name *</Label>
								<Input
									class="h-12 text-base"
									id="modalCollegeName"
									bind:value={collegeForm.name}
									placeholder="e.g., College of Physical & Applied Sciences"
								/>
							</div>
							<div class="space-y-2">
								<Label for="modalCollegeShortName">Short Name *</Label>
								<Input
									class="h-12 text-base"
									id="modalCollegeShortName"
									bind:value={collegeForm.shortName}
									placeholder="e.g., COLPAS"
								/>
							</div>
							<div class="space-y-2">
								<Label for="modalCollegeCode">Code</Label>
								<Input
									class="h-12 text-base"
									id="modalCollegeCode"
									bind:value={collegeForm.code}
									placeholder="e.g., CPAS"
								/>
							</div>
							<div class="space-y-2">
								<Label for="modalCollegeEmail">Email</Label>
								<Input
									class="h-12 text-base"
									id="modalCollegeEmail"
									type="email"
									bind:value={collegeForm.email}
									placeholder="college@university.edu.ng"
								/>
							</div>
							<div class="space-y-2 sm:col-span-2">
								<Label for="modalCollegePhone">Phone</Label>
								<Input
									class="h-12 text-base"
									id="modalCollegePhone"
									bind:value={collegeForm.phone}
									placeholder="+2348000000000"
								/>
							</div>
						</div>
						<div class="flex justify-end pt-2">
							<Button onclick={createCollege} disabled={isSubmitting} class="h-12 w-full text-base">
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
							<Check class="mx-auto size-6 mb-2" />
							<p class="text-sm text-muted-foreground">Department already configured</p>
						</div>
					{:else if canCreateDepartment}
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
							<div class="space-y-2">
								<Label>College *</Label>
								<Popover open={collegeSearchOpen} onOpenChange={collegeSearchOpen}>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											role="combobox"
											aria-expanded={collegeSearchOpen}
											class="h-12 w-full justify-between text-base font-normal"
										>
											<span class="truncate">{selectedCollegeName}</span>
											<ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
										</Button>
									</PopoverTrigger>
									<PopoverContent class="w-[--radix-popover-trigger-width] max-h-[300px] p-0">
										<Command>
											<CommandInput placeholder="Search colleges..." />
											<CommandList>
												<CommandEmpty>No college found.</CommandEmpty>
												<CommandGroup>
													{#each colleges as college}
														<CommandItem
															value={college.name}
															onselect={() => {
																departmentForm.collegeId = college.id;
																collegeSearchOpen = false;
															}}
															class="cursor-pointer"
														>
															<Check
																class={cn(
																	"mr-2 size-4",
																	departmentForm.collegeId === college.id ? "opacity-100" : "opacity-0"
																)}
															/>
															{college.name}
														</CommandItem>
													{/each}
												</CommandGroup>
											</CommandList>
										</Command>
									</PopoverContent>
								</Popover>
							</div>
							<div class="space-y-2">
								<Label for="modalDeptName">Department Name *</Label>
								<Input
									class="h-12 text-base"
									id="modalDeptName"
									bind:value={departmentForm.name}
									placeholder="e.g., Department of Computer Science"
								/>
							</div>
							<div class="space-y-2">
								<Label for="modalDeptShortName">Short Name *</Label>
								<Input
									class="h-12 text-base"
									id="modalDeptShortName"
									bind:value={departmentForm.shortName}
									placeholder="e.g., CSC"
								/>
							</div>
							<div class="space-y-2">
								<Label for="modalDeptCode">Code</Label>
								<Input
									class="h-12 text-base"
									id="modalDeptCode"
									bind:value={departmentForm.code}
									placeholder="e.g., CSC"
								/>
							</div>
							<div class="space-y-2">
								<Label for="modalDeptEmail">Email</Label>
								<Input
									class="h-12 text-base"
									id="modalDeptEmail"
									type="email"
									bind:value={departmentForm.email}
									placeholder="dept@university.edu.ng"
								/>
							</div>
							<div class="space-y-2">
								<Label for="modalDeptPhone">Phone</Label>
								<Input
									class="h-12 text-base"
									id="modalDeptPhone"
									bind:value={departmentForm.phone}
									placeholder="+2348000000000"
								/>
							</div>
						</div>
						<div class="flex justify-end pt-2">
							<Button onclick={createDepartment} disabled={isSubmitting} class="h-12 w-full text-base">
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
							<Check class="mx-auto size-6 mb-2" />
							<p class="text-sm text-muted-foreground">Courses already configured</p>
						</div>
					{:else if canCreateCourse}
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
							<div class="space-y-2">
								<Label>Department *</Label>
								<Popover open={departmentSearchOpen} onOpenChange={departmentSearchOpen}>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											role="combobox"
											aria-expanded={departmentSearchOpen}
											class="h-12 w-full justify-between text-base font-normal"
										>
											<span class="truncate">{selectedDepartmentName}</span>
											<ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
										</Button>
									</PopoverTrigger>
									<PopoverContent class="w-[--radix-popover-trigger-width] max-h-[300px] p-0">
										<Command>
											<CommandInput placeholder="Search departments..." />
											<CommandList>
												<CommandEmpty>No department found.</CommandEmpty>
												<CommandGroup>
													{#each departments as dept}
														<CommandItem
															value={dept.name}
															onselect={() => {
																courseForm.departmentId = dept.id;
																departmentSearchOpen = false;
															}}
															class="cursor-pointer"
														>
															<Check
																class={cn(
																	"mr-2 size-4",
																	courseForm.departmentId === dept.id ? "opacity-100" : "opacity-0"
																)}
															/>
															{dept.name}
														</CommandItem>
													{/each}
												</CommandGroup>
											</CommandList>
										</Command>
									</PopoverContent>
								</Popover>
							</div>
							<div class="space-y-2">
								<Label>Level *</Label>
								<Popover open={levelSearchOpen} onOpenChange={levelSearchOpen}>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											role="combobox"
											aria-expanded={levelSearchOpen}
											class="h-12 w-full justify-between text-base font-normal"
										>
											<span class="truncate">{selectedLevelLabel}</span>
											<ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
										</Button>
									</PopoverTrigger>
									<PopoverContent class="w-[--radix-popover-trigger-width] max-h-[300px] p-0">
										<Command>
											<CommandInput placeholder="Search levels..." />
											<CommandList>
												<CommandEmpty>No level found.</CommandEmpty>
												<CommandGroup>
													{#each levels as level}
														<CommandItem
															value={level.label}
															onselect={() => {
																courseForm.levelId = level.id;
																levelSearchOpen = false;
															}}
															class="cursor-pointer"
														>
															<Check
																class={cn(
																	"mr-2 size-4",
																	courseForm.levelId === level.id ? "opacity-100" : "opacity-0"
																)}
															/>
															{level.label}
														</CommandItem>
													{/each}
												</CommandGroup>
											</CommandList>
										</Command>
									</PopoverContent>
								</Popover>
							</div>
							<div class="space-y-2">
								<Label for="modalCourseCode">Course Code *</Label>
								<Input
									class="h-12 text-base"
									id="modalCourseCode"
									bind:value={courseForm.code}
									placeholder="e.g., CSC301"
								/>
							</div>
							<div class="space-y-2">
								<Label for="modalCourseTitle">Course Title *</Label>
								<Input
									class="h-12 text-base"
									id="modalCourseTitle"
									bind:value={courseForm.title}
									placeholder="e.g., Database Management Systems"
								/>
							</div>
							<div class="space-y-2">
								<Label for="modalCourseCredits">Credit Units</Label>
								<Input
									class="h-12 text-base"
									id="modalCourseCredits"
									type="number"
									bind:value={courseForm.creditUnits}
									min="1"
									max="6"
								/>
							</div>
							<div class="space-y-2">
								<Label>Type</Label>
								<Popover open={typeSearchOpen} onOpenChange={typeSearchOpen}>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											role="combobox"
											aria-expanded={typeSearchOpen}
											class="h-12 w-full justify-between text-base font-normal"
										>
											<span class="truncate">{courseForm.type}</span>
											<ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
										</Button>
									</PopoverTrigger>
									<PopoverContent class="w-[--radix-popover-trigger-width] max-h-[300px] p-0">
										<Command>
											<CommandInput placeholder="Search types..." />
											<CommandList>
												<CommandEmpty>No type found.</CommandEmpty>
												<CommandGroup>
													<CommandItem
														value="COMPULSORY"
														onselect={() => {
															courseForm.type = 'COMPULSORY';
															typeSearchOpen = false;
														}}
														class="cursor-pointer"
													>
														<Check
															class={cn(
																"mr-2 size-4",
																courseForm.type === 'COMPULSORY' ? "opacity-100" : "opacity-0"
															)}
														/>
														Compulsory
													</CommandItem>
													<CommandItem
														value="ELECTIVE"
														onselect={() => {
															courseForm.type = 'ELECTIVE';
															typeSearchOpen = false;
														}}
														class="cursor-pointer"
													>
														<Check
															class={cn(
																"mr-2 size-4",
																courseForm.type === 'ELECTIVE' ? "opacity-100" : "opacity-0"
															)}
														/>
														Elective
													</CommandItem>
													<CommandItem
														value="GENERAL_STUDIES"
														onselect={() => {
															courseForm.type = 'GENERAL_STUDIES';
															typeSearchOpen = false;
														}}
														class="cursor-pointer"
													>
														<Check
															class={cn(
																"mr-2 size-4",
																courseForm.type === 'GENERAL_STUDIES' ? "opacity-100" : "opacity-0"
															)}
														/>
														General Studies
													</CommandItem>
												</CommandGroup>
											</CommandList>
										</Command>
									</PopoverContent>
								</Popover>
							</div>
							<div class="space-y-2 sm:col-span-2">
								<Label for="modalCourseDescription">Description</Label>
								<Textarea
									class="min-h-32 py-3 text-base"
									id="modalCourseDescription"
									bind:value={courseForm.description}
									placeholder="Course description..."
									rows={2}
								/>
							</div>
						</div>
						<div class="flex justify-end pt-2">
							<Button onclick={createCourse} disabled={isSubmitting} class="h-12 w-full text-base">
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
			<Button variant="outline" onclick={() => onOpenChange(false)} class="h-12 w-full sm:w-40 text-base">
				{#if hasCollege && hasDepartment && hasCourse}
					Done
				{:else}
					Close
				{/if}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>