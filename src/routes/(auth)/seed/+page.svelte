<!-- src/routes/(auth)/seed/+page.svelte -->
<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import Database from '@lucide/svelte/icons/database';
	import Building from '@lucide/svelte/icons/building';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Users from '@lucide/svelte/icons/users';
	import Shield from '@lucide/svelte/icons/shield';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import Layers from '@lucide/svelte/icons/layers';
	import CalendarRange from '@lucide/svelte/icons/calendar-range';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import Mail from '@lucide/svelte/icons/mail';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Download from '@lucide/svelte/icons/download';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import FileQuestion from '@lucide/svelte/icons/file-question';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import Tag from '@lucide/svelte/icons/tag';
	import UserCheck from '@lucide/svelte/icons/user-check';

	type ResultBlock = { created: number; skipped: number; total: number };

	// Matches SeedResults['credentials'] from src/routes/api/admin/seed-missing/+server.ts
	type Credential = {
		type: 'staff' | 'student';
		identifier: string; // staffNumber or matricNumber
		role: string;
		email: string;
		password: string;
	};

	type SeedResults = {
		university: { created: boolean; skipped: boolean };
		colleges: ResultBlock;
		departments: ResultBlock;
		levels: ResultBlock;
		programmes: ResultBlock;
		session: { created: boolean; skipped: boolean };
		semesters: ResultBlock;
		courses: ResultBlock;
		offerings: ResultBlock;
		gradeScale: ResultBlock;
		roles: ResultBlock;
		staff: ResultBlock;
		students: ResultBlock;
		lecturerAssignments: ResultBlock;
		questionTags: ResultBlock;
		questions: ResultBlock;
		assessments: ResultBlock;
		assessmentQuestions: ResultBlock;
		assessmentEligibility: ResultBlock;
		assessmentInvigilators: ResultBlock;
		credentials: Credential[];
		totalCreated: number;
		totalSkipped: number;
	};

	let loading = $state(false);
	let success = $state(false);
	let error = $state<string | null>(null);
	let progress = $state(0);
	let results = $state<SeedResults | null>(null);

	let showPasswords = $state(false);
	let copied = $state(false);
	let credentialFilter = $state<'all' | 'staff' | 'student'>('all');

	const filteredCredentials = $derived(
		results?.credentials.filter((c) => credentialFilter === 'all' || c.type === credentialFilter) ?? [],
	);
	const staffCredCount = $derived(results?.credentials.filter((c) => c.type === 'staff').length ?? 0);
	const studentCredCount = $derived(results?.credentials.filter((c) => c.type === 'student').length ?? 0);

	const seedPlan = [
		{ icon: Building, label: 'Colleges', count: '12', detail: 'All MOUAU colleges' },
		{ icon: Layers, label: 'Departments', count: '65+', detail: 'Across every college' },
		{ icon: GraduationCap, label: 'Levels & Programmes', count: '7 · 3/dept', detail: '100–700L, 3 programmes each' },
		{ icon: CalendarRange, label: 'Session & Semesters', count: '1 · 2', detail: 'Current academic session' },
		{ icon: BookOpen, label: 'Courses', count: '33', detail: 'Sample courses + offerings' },
		{ icon: Shield, label: 'Roles', count: '14', detail: 'System role definitions' },
		{ icon: Users, label: 'Staff Users', count: '10', detail: 'Default password: Admin123' },
		{ icon: GraduationCap, label: 'Students', count: 'Varies', detail: '2 per dept (5 for COLPAS) · Default password: Student123' },
		{ icon: Tag, label: 'Question Tags', count: '1/course', detail: 'One fundamentals tag per course' },
		{ icon: FileQuestion, label: 'Questions', count: '10/course', detail: 'Single-choice, 4 options each' },
		{ icon: ClipboardList, label: 'Assessments', count: '3/course', detail: 'Practice · Test · Examination' },
	];

	const resultMeta: { key: keyof SeedResults; label: string; icon: typeof Building }[] = [
		{ key: 'colleges', label: 'Colleges', icon: Building },
		{ key: 'departments', label: 'Departments', icon: Layers },
		{ key: 'levels', label: 'Levels', icon: GraduationCap },
		{ key: 'programmes', label: 'Programmes', icon: GraduationCap },
		{ key: 'semesters', label: 'Semesters', icon: CalendarRange },
		{ key: 'courses', label: 'Courses', icon: BookOpen },
		{ key: 'offerings', label: 'Course Offerings', icon: BookOpen },
		{ key: 'gradeScale', label: 'Grade Scale', icon: Shield },
		{ key: 'roles', label: 'Roles', icon: Shield },
		{ key: 'staff', label: 'Staff Users', icon: Users },
		{ key: 'students', label: 'Students', icon: GraduationCap },
		{ key: 'lecturerAssignments', label: 'Lecturer Assignments', icon: UserCheck },
		{ key: 'questionTags', label: 'Question Tags', icon: Tag },
		{ key: 'questions', label: 'Questions', icon: FileQuestion },
		{ key: 'assessments', label: 'Assessments', icon: ClipboardList },
		{ key: 'assessmentQuestions', label: 'Assessment Questions', icon: ClipboardList },
		{ key: 'assessmentEligibility', label: 'Assessment Eligibility', icon: UserCheck },
		{ key: 'assessmentInvigilators', label: 'Assessment Invigilators', icon: UserCheck },
	];

	function credentialsAsText(list: Credential[]): string {
		const lines = [
			'MOUAU eTEST — Seeded Login Credentials',
			`Generated: ${new Date().toISOString()}`,
			'='.repeat(60),
			'',
			...list.map(
				(c) =>
					`Type         : ${c.type === 'staff' ? 'Staff' : 'Student'}\n` +
					`${c.type === 'staff' ? 'Staff Number' : 'Matric No.  '} : ${c.identifier}\n` +
					`Role         : ${c.role}\n` +
					`Email        : ${c.email}\n` +
					`Password     : ${c.password}\n` +
					'-'.repeat(60),
			),
			'',
			'Note: mustChangePassword is enabled — each account will be',
			'prompted to set a new password on first login.',
		];
		return lines.join('\n');
	}

	function downloadCredentials() {
		if (!filteredCredentials.length) return;
		const text = credentialsAsText(filteredCredentials);
		const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `mouau-etest-credentials-${credentialFilter}-${new Date().toISOString().slice(0, 10)}.txt`;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	}

	async function copyCredentials() {
		if (!filteredCredentials.length) return;
		try {
			await navigator.clipboard.writeText(credentialsAsText(filteredCredentials));
			copied = true;
			setTimeout(() => (copied = false), 1800);
		} catch {
			// clipboard API unavailable — silently ignore, download still works
		}
	}

	async function seedDatabase() {
		loading = true;
		error = null;
		success = false;
		results = null;
		progress = 0;
		showPasswords = false;
		credentialFilter = 'all';

		const progressInterval = setInterval(() => {
			progress = Math.min(progress + 5, 90);
		}, 200);

		try {
			const response = await fetch('/api/admin/seed-missing', {
				method: 'POST',
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to seed database');
			}

			results = data.results;
			progress = 100;
			success = true;
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred';
			progress = 0;
		} finally {
			clearInterval(progressInterval);
			loading = false;
		}
	}
</script>

<div class="container max-w-3xl py-10">
	<!-- ── Header ─────────────────────────────────────────────────────────── -->
	<div class="mb-8 flex items-start gap-4">
		<div class="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border bg-primary/10">
			<Database class="size-6 text-primary" />
		</div>
		<div class="min-w-0">
			<h1 class="text-2xl font-bold tracking-tight">Seed Database</h1>
			<p class="mt-0.5 text-sm text-muted-foreground">
				Populate the academic structure, courses, roles, staff/student accounts, and sample assessments.
			</p>
		</div>
	</div>

	{#if !success}
		<!-- ── Pre-run plan ────────────────────────────────────────────────── -->
		<Card class="overflow-hidden">
			<CardHeader class="pb-3">
				<CardTitle class="text-base">What will be created</CardTitle>
				<CardDescription>Existing records are detected and skipped automatically — this is safe to re-run.</CardDescription>
			</CardHeader>
			<CardContent class="p-0">
				<div class="divide-y divide-border/60">
					{#each seedPlan as item}
						<div class="flex items-center gap-3 px-6 py-3">
							<div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
								<item.icon class="size-4 text-muted-foreground" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium leading-none">{item.label}</p>
								<p class="mt-1 text-xs text-muted-foreground">{item.detail}</p>
							</div>
							<Badge variant="outline" class="shrink-0 font-mono text-xs">{item.count}</Badge>
						</div>
					{/each}
				</div>
			</CardContent>
		</Card>

		<div class="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
			<KeyRound class="mt-0.5 size-3.5 shrink-0" />
			<span
				>Staff accounts use the default password <strong class="font-mono">Admin123</strong>, students use
				<strong class="font-mono">Student123</strong> — both with <code class="rounded bg-amber-500/15 px-1 py-0.5"
					>mustChangePassword</code
				> enabled. You'll be able to view or download the full login list after seeding.</span
			>
		</div>

		{#if loading}
			<div class="mt-6 space-y-2">
				<div class="flex items-center justify-between text-sm">
					<span class="flex items-center gap-2 text-muted-foreground">
						<Loader2 class="size-3.5 animate-spin" />
						Seeding in progress…
					</span>
					<span class="font-medium tabular-nums">{Math.round(progress)}%</span>
				</div>
				<Progress value={progress} class="h-1.5" />
			</div>
		{/if}

		<Button onclick={seedDatabase} disabled={loading} class="mt-6 w-full" size="lg">
			{#if loading}
				<Loader2 class="mr-2 size-4 animate-spin" />
				Seeding database…
			{:else}
				<Database class="mr-2 size-4" />
				Seed All Data
			{/if}
		</Button>
	{/if}

	{#if error}
		<Alert class="mt-6" variant="destructive">
			<AlertCircle class="size-4" />
			<AlertDescription>{error}</AlertDescription>
		</Alert>
		<Button onclick={seedDatabase} variant="outline" class="mt-3 w-full">
			Try again
		</Button>
	{/if}

	<!-- ── Success state ────────────────────────────────────────────────── -->
	{#if success && results}
		<div class="space-y-4">
			<div class="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
				<div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
					<CheckCircle2 class="size-5 text-emerald-600 dark:text-emerald-400" />
				</div>
				<div class="min-w-0 flex-1">
					<p class="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Database seeded successfully</p>
					<p class="mt-0.5 text-xs text-emerald-700/70 dark:text-emerald-400/70">
						{results.totalCreated} created · {results.totalSkipped} skipped
					</p>
				</div>
			</div>

			<Card>
				<CardHeader class="pb-3">
					<CardTitle class="text-base">Breakdown</CardTitle>
				</CardHeader>
				<CardContent class="p-0">
					<div class="divide-y divide-border/60">
						{#if results.university.created || results.university.skipped}
							<div class="flex items-center justify-between px-6 py-2.5 text-sm">
								<span class="flex items-center gap-2 text-muted-foreground">
									<Building class="size-4" /> University
								</span>
								{#if results.university.created}
									<Badge class="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400">created</Badge>
								{:else}
									<Badge variant="secondary">already exists</Badge>
								{/if}
							</div>
						{/if}

						{#if results.session.created || results.session.skipped}
							<div class="flex items-center justify-between px-6 py-2.5 text-sm">
								<span class="flex items-center gap-2 text-muted-foreground">
									<CalendarRange class="size-4" /> Academic Session
								</span>
								{#if results.session.created}
									<Badge class="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400">created</Badge>
								{:else}
									<Badge variant="secondary">already exists</Badge>
								{/if}
							</div>
						{/if}

						{#each resultMeta as meta}
							{@const block = results[meta.key] as ResultBlock}
							{#if block.total > 0}
								<div class="flex items-center justify-between gap-3 px-6 py-2.5 text-sm">
									<span class="flex items-center gap-2 text-muted-foreground">
										<meta.icon class="size-4" /> {meta.label}
									</span>
									<div class="flex shrink-0 items-center gap-1.5">
										{#if block.created > 0}
											<Badge class="bg-emerald-500/15 font-mono text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400">
												+{block.created}
											</Badge>
										{/if}
										{#if block.skipped > 0}
											<Badge variant="secondary" class="font-mono">
												{block.skipped} existing
											</Badge>
										{/if}
									</div>
								</div>
							{/if}
						{/each}
					</div>
				</CardContent>
			</Card>

			<!-- ── Login credentials ───────────────────────────────────────── -->
			{#if results.credentials?.length}
				<Card class="border-blue-500/30 bg-blue-500/5">
					<CardHeader class="pb-3">
						<div class="flex flex-wrap items-center justify-between gap-3">
							<div>
								<CardTitle class="flex items-center gap-2 text-base">
									<KeyRound class="size-4" />
									Login Credentials
								</CardTitle>
								<CardDescription class="mt-1">
									{staffCredCount} staff · {studentCredCount} student{studentCredCount === 1 ? '' : 's'} — default passwords
									<span class="font-mono">Admin123</span> / <span class="font-mono">Student123</span>
								</CardDescription>
							</div>
							<div class="flex shrink-0 flex-wrap gap-2">
								<Button variant="outline" size="sm" onclick={() => (showPasswords = !showPasswords)}>
									{#if showPasswords}
										<EyeOff class="mr-1.5 size-3.5" /> Hide
									{:else}
										<Eye class="mr-1.5 size-3.5" /> Reveal
									{/if}
								</Button>
								<Button variant="outline" size="sm" onclick={copyCredentials}>
									{#if copied}
										<Check class="mr-1.5 size-3.5 text-emerald-600" /> Copied
									{:else}
										<Copy class="mr-1.5 size-3.5" /> Copy
									{/if}
								</Button>
								<Button size="sm" onclick={downloadCredentials}>
									<Download class="mr-1.5 size-3.5" /> .txt
								</Button>
							</div>
						</div>

						<div class="mt-3 flex gap-1.5">
							<Button
								variant={credentialFilter === 'all' ? 'default' : 'outline'}
								size="sm"
								class="h-7 px-2.5 text-xs"
								onclick={() => (credentialFilter = 'all')}
							>
								All ({results.credentials.length})
							</Button>
							<Button
								variant={credentialFilter === 'staff' ? 'default' : 'outline'}
								size="sm"
								class="h-7 px-2.5 text-xs"
								onclick={() => (credentialFilter = 'staff')}
							>
								Staff ({staffCredCount})
							</Button>
							<Button
								variant={credentialFilter === 'student' ? 'default' : 'outline'}
								size="sm"
								class="h-7 px-2.5 text-xs"
								onclick={() => (credentialFilter = 'student')}
							>
								Students ({studentCredCount})
							</Button>
						</div>
					</CardHeader>
					<CardContent class="p-0">
						<div class="max-h-80 overflow-y-auto">
							<table class="w-full text-sm">
								<thead class="sticky top-0 bg-blue-500/10 text-xs uppercase text-muted-foreground backdrop-blur">
									<tr>
										<th class="px-4 py-2 text-left font-medium">Type</th>
										<th class="px-4 py-2 text-left font-medium">ID</th>
										<th class="px-4 py-2 text-left font-medium">Role</th>
										<th class="px-4 py-2 text-left font-medium">Email</th>
										<th class="px-4 py-2 text-left font-medium">Password</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-border/50">
									{#each filteredCredentials as cred}
										<tr class="hover:bg-muted/40">
											<td class="whitespace-nowrap px-4 py-2 text-xs">
												<Badge variant={cred.type === 'staff' ? 'outline' : 'secondary'} class="text-[10px]">
													{cred.type === 'staff' ? 'Staff' : 'Student'}
												</Badge>
											</td>
											<td class="whitespace-nowrap px-4 py-2 font-mono text-xs">{cred.identifier}</td>
											<td class="whitespace-nowrap px-4 py-2 text-xs text-muted-foreground">{cred.role}</td>
											<td class="whitespace-nowrap px-4 py-2 font-mono text-xs">{cred.email}</td>
											<td class="whitespace-nowrap px-4 py-2 font-mono text-xs">
												{showPasswords ? cred.password : '••••••••'}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</CardContent>
				</Card>
			{/if}

			<Button onclick={seedDatabase} variant="outline" class="w-full" disabled={loading}>
				{#if loading}
					<Loader2 class="mr-2 size-4 animate-spin" />
					Re-running…
				{:else}
					<ChevronRight class="mr-2 size-4" />
					Run again
				{/if}
			</Button>
		</div>
	{/if}
</div>