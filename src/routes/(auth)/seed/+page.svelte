<!-- src/routes/(auth)/seed/+page.svelte -->
<script lang="ts">
    import { Button } from '$lib/components/ui/button/index.js';
    import { Badge } from '$lib/components/ui/badge/index.js';
    import LoaderIcon from '@lucide/svelte/icons/loader';
    import CheckIcon from '@lucide/svelte/icons/check';
    import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
    import DownloadIcon from '@lucide/svelte/icons/download';
    import CopyIcon from '@lucide/svelte/icons/copy';
    import EyeIcon from '@lucide/svelte/icons/eye';
    import EyeOffIcon from '@lucide/svelte/icons/eye-off';
    import DatabaseIcon from '@lucide/svelte/icons/database';
    import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';

    // ── Types ──────────────────────────────────────────────────────────────

    type ResultBlock = { created: number; skipped: number; total: number };

    type Credential = {
        type:       'staff' | 'student';
        identifier: string;
        role:       string;
        email:      string;
        password:   string;
    };

    type SeedResults = {
        systemFlags:         ResultBlock;
        university:          { created: boolean; skipped: boolean };
        colleges:            ResultBlock;
        departments:         ResultBlock;
        levels:              ResultBlock;
        programmes:          ResultBlock;
        session:             { created: boolean; skipped: boolean };
        semesters:           ResultBlock;
        courses:             ResultBlock;
        offerings:           ResultBlock;
        gradeScale:          ResultBlock;
        roles:               ResultBlock;
        staff:               ResultBlock;
        students:            ResultBlock;
        lecturerAssignments: ResultBlock;
        credentials:         Credential[];
        totalCreated:        number;
        totalSkipped:        number;
    };

    // ── Pipeline steps (mirrors server steps 0–14) ─────────────────────────

    const PIPELINE = [
        { label: 'System flags',          detail: 'maintenance · shutdown' },
        { label: 'University',            detail: 'MOUAU root record' },
        { label: 'Colleges',              detail: '12 colleges' },
        { label: 'Departments',           detail: '65+ departments' },
        { label: 'Levels',                detail: '100 L – 700 L' },
        { label: 'Programmes',            detail: '3 per department' },
        { label: 'Academic session',      detail: 'current session' },
        { label: 'Semesters',             detail: 'first · second' },
        { label: 'Courses',               detail: 'course catalogue' },
        { label: 'Course offerings',      detail: 'current semester' },
        { label: 'Grade scale',           detail: 'A – F tiers' },
        { label: 'Roles',                 detail: '14 system roles' },
        { label: 'Staff accounts',        detail: 'default Admin123' },
        { label: 'Lecturer assignments',  detail: 'offering ↔ lecturer' },
        { label: 'Student accounts',      detail: 'default Student123' },
    ];

    const RESULT_KEYS: { key: keyof SeedResults; label: string }[] = [
        { key: 'systemFlags',        label: 'System flags' },
        { key: 'colleges',           label: 'Colleges' },
        { key: 'departments',        label: 'Departments' },
        { key: 'levels',             label: 'Levels' },
        { key: 'programmes',         label: 'Programmes' },
        { key: 'semesters',          label: 'Semesters' },
        { key: 'courses',            label: 'Courses' },
        { key: 'offerings',          label: 'Course offerings' },
        { key: 'gradeScale',         label: 'Grade scale' },
        { key: 'roles',              label: 'Roles' },
        { key: 'staff',              label: 'Staff accounts' },
        { key: 'students',           label: 'Student accounts' },
        { key: 'lecturerAssignments',label: 'Lecturer assignments' },
    ];

    // ── State ──────────────────────────────────────────────────────────────

    type Phase = 'idle' | 'running' | 'done' | 'error';

    let phase           = $state<Phase>('idle');
    let errorMsg        = $state<string | null>(null);
    let results         = $state<SeedResults | null>(null);
    let activeStep      = $state(-1);         // which pipeline step is "running"
    let showPasswords   = $state(false);
    let copied          = $state(false);
    let credFilter      = $state<'all' | 'staff' | 'student'>('all');

    const filteredCreds = $derived(
        results?.credentials.filter((c) => credFilter === 'all' || c.type === credFilter) ?? []
    );
    const staffCount   = $derived(results?.credentials.filter((c) => c.type === 'staff').length   ?? 0);
    const studentCount = $derived(results?.credentials.filter((c) => c.type === 'student').length ?? 0);

    // ── Credential export ──────────────────────────────────────────────────

    function credsToText(list: Credential[]): string {
        return [
            'MOUAU e-Test — Seeded Login Credentials',
            `Generated : ${new Date().toISOString()}`,
            '─'.repeat(60),
            '',
            ...list.map((c) =>
                `Type      : ${c.type === 'staff' ? 'Staff' : 'Student'}\n` +
                `${c.type === 'staff' ? 'Staff No.' : 'Matric   '} : ${c.identifier}\n` +
                `Role      : ${c.role}\n` +
                `Email     : ${c.email}\n` +
                `Password  : ${c.password}\n` +
                '─'.repeat(60)
            ),
            '',
            'Note: mustChangePassword is set — each account will be prompted',
            'to choose a new password on first login.',
        ].join('\n');
    }

    function downloadCreds() {
        if (!filteredCreds.length) return;
        const blob = new Blob([credsToText(filteredCreds)], { type: 'text/plain;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const a    = Object.assign(document.createElement('a'), {
            href:     url,
            download: `mouau-etest-credentials-${credFilter}-${new Date().toISOString().slice(0, 10)}.txt`,
        });
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    async function copyCreds() {
        if (!filteredCreds.length) return;
        try {
            await navigator.clipboard.writeText(credsToText(filteredCreds));
            copied = true;
            setTimeout(() => (copied = false), 1800);
        } catch { /* clipboard unavailable — silent */ }
    }

    // ── Seed action ────────────────────────────────────────────────────────

    async function seed() {
        phase        = 'running';
        errorMsg     = null;
        results      = null;
        activeStep   = 0;
        showPasswords = false;
        credFilter   = 'all';

        // Animate through pipeline steps while the real request runs
        const stepInterval = setInterval(() => {
            activeStep = Math.min(activeStep + 1, PIPELINE.length - 1);
        }, 600);

        try {
            const res  = await fetch('/api/admin/seed-missing', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Seed request failed');
            results   = data.results;
            activeStep = PIPELINE.length; // all done
            phase     = 'done';
        } catch (err) {
            errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
            phase    = 'error';
            activeStep = -1;
        } finally {
            clearInterval(stepInterval);
        }
    }
</script>

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- Layout: left pipeline rail + right content panel                       -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

<div class="min-h-screen bg-background">
    <div class="mx-auto max-w-5xl px-6 py-12">

        <!-- Page header -->
        <div class="mb-10">
            <div class="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                <DatabaseIcon class="h-3.5 w-3.5" />
                Administration
            </div>
            <h1 class="text-3xl font-bold tracking-tight text-foreground">Seed Database</h1>
            <p class="mt-2 text-sm text-muted-foreground">
                Populates the full academic structure — colleges, departments, courses, staff, and students.
                Existing records are detected and skipped; safe to re-run.
            </p>
        </div>

        <div class="grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">

            <!-- ── Left: pipeline step rail ─────────────────────────────── -->
            <div class="hidden lg:block">
                <div class="sticky top-8">
                    <p class="mb-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Pipeline
                    </p>
                    <ol class="space-y-0">
                        {#each PIPELINE as step, i}
                            {@const isDone    = phase === 'done' || (phase === 'running' && i < activeStep)}
                            {@const isActive  = phase === 'running' && i === activeStep}
                            {@const isPending = phase === 'idle'    || (phase === 'running' && i > activeStep)}

                            <li class="relative flex gap-3 pb-5 last:pb-0">
                                <!-- connector line -->
                                {#if i < PIPELINE.length - 1}
                                    <div class="absolute left-[11px] top-6 h-full w-px {isDone ? 'bg-foreground/20' : 'bg-border'}"></div>
                                {/if}

                                <!-- step dot -->
                                <div class="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-all duration-300
                                    {isDone   ? 'border-foreground/30 bg-foreground text-background'         : ''}
                                    {isActive ? 'border-foreground bg-background text-foreground shadow-sm'  : ''}
                                    {isPending && phase !== 'idle' ? 'border-border bg-background text-muted-foreground/40' : ''}
                                    {phase === 'idle' ? 'border-border bg-background text-muted-foreground/50' : ''}
                                ">
                                    {#if isDone}
                                        <CheckIcon class="h-3 w-3" />
                                    {:else if isActive}
                                        <LoaderIcon class="h-3 w-3 animate-spin" />
                                    {:else}
                                        {i + 1}
                                    {/if}
                                </div>

                                <!-- step label -->
                                <div class="pt-0.5">
                                    <p class="text-xs font-medium leading-tight transition-colors
                                        {isDone   ? 'text-foreground'              : ''}
                                        {isActive ? 'text-foreground'              : ''}
                                        {isPending && phase !== 'idle' ? 'text-muted-foreground/40' : ''}
                                        {phase === 'idle' ? 'text-muted-foreground' : ''}
                                    ">{step.label}</p>
                                    <p class="mt-0.5 text-[10px] text-muted-foreground/60">{step.detail}</p>
                                </div>
                            </li>
                        {/each}
                    </ol>
                </div>
            </div>

            <!-- ── Right: main content ───────────────────────────────────── -->
            <div class="min-w-0 space-y-5">

                <!-- ── IDLE state ─────────────────────────────────────────── -->
                {#if phase === 'idle'}
                    <div class="rounded-2xl border border-border bg-muted/30 p-6">
                        <h2 class="mb-1 text-sm font-semibold text-foreground">Ready to seed</h2>
                        <p class="text-xs text-muted-foreground">
                            15 steps will run in sequence. The whole operation takes 5–20 seconds depending on database latency.
                        </p>

                        <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {#each [
                                ['65+', 'Departments'],
                                ['14',  'System roles'],
                                ['33',  'Sample courses'],
                                ['3',   'Programmes/dept'],
                                ['2',   'Semesters'],
                                ['2/dept', 'Students'],
                            ] as [n, label]}
                                <div class="rounded-xl border border-border bg-background px-4 py-3">
                                    <p class="text-xl font-bold tabular-nums text-foreground">{n}</p>
                                    <p class="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
                                </div>
                            {/each}
                        </div>

                        <div class="mt-5 flex items-start gap-2 rounded-xl border border-border bg-background px-4 py-3 text-xs text-muted-foreground">
                            <span class="mt-0.5 shrink-0 font-mono font-bold text-foreground">!</span>
                            <span>
                                Staff default password <span class="font-mono font-medium text-foreground">Admin123</span> ·
                                Student default password <span class="font-mono font-medium text-foreground">Student123</span>.
                                All accounts have <span class="font-mono text-foreground">mustChangePassword</span> enabled.
                            </span>
                        </div>

                        <Button onclick={seed} class="mt-6 w-full" size="lg">
                            <DatabaseIcon class="mr-2 h-4 w-4" />
                            Seed database
                        </Button>
                    </div>
                {/if}

                <!-- ── RUNNING state ──────────────────────────────────────── -->
                {#if phase === 'running'}
                    <div class="rounded-2xl border border-border bg-muted/30 p-6">
                        <div class="flex items-center gap-3">
                            <LoaderIcon class="h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
                            <div>
                                <p class="text-sm font-semibold text-foreground">
                                    {activeStep >= 0 && activeStep < PIPELINE.length
                                        ? PIPELINE[activeStep].label
                                        : 'Preparing…'}
                                </p>
                                <p class="text-xs text-muted-foreground">
                                    Step {Math.min(activeStep + 1, PIPELINE.length)} of {PIPELINE.length}
                                </p>
                            </div>
                        </div>

                        <!-- Progress bar -->
                        <div class="mt-5 h-1 w-full overflow-hidden rounded-full bg-border">
                            <div
                                class="h-full rounded-full bg-foreground transition-all duration-500"
                                style="width: {Math.round(((activeStep + 1) / PIPELINE.length) * 100)}%"
                            ></div>
                        </div>

                        <!-- Mobile step list (pipeline rail hidden on mobile) -->
                        <div class="mt-4 flex flex-wrap gap-1.5 lg:hidden">
                            {#each PIPELINE as step, i}
                                <span class="rounded-full px-2 py-0.5 text-[10px] font-medium
                                    {i < activeStep  ? 'bg-foreground text-background'         : ''}
                                    {i === activeStep ? 'bg-muted text-foreground ring-1 ring-border' : ''}
                                    {i > activeStep  ? 'bg-muted/50 text-muted-foreground/50'  : ''}
                                ">{step.label}</span>
                            {/each}
                        </div>
                    </div>
                {/if}

                <!-- ── ERROR state ────────────────────────────────────────── -->
                {#if phase === 'error'}
                    <div class="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
                        <div class="flex items-start gap-3">
                            <AlertCircleIcon class="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                            <div class="min-w-0">
                                <p class="text-sm font-semibold text-destructive">Seed failed</p>
                                <p class="mt-1 break-words text-xs text-destructive/80">{errorMsg}</p>
                            </div>
                        </div>
                        <Button onclick={seed} variant="outline" class="mt-5 w-full">
                            Try again
                        </Button>
                    </div>
                {/if}

                <!-- ── DONE state ─────────────────────────────────────────── -->
                {#if phase === 'done' && results}
                    <!-- Summary bar -->
                    <div class="flex items-center justify-between rounded-2xl border border-border bg-muted/30 px-5 py-4">
                        <div class="flex items-center gap-3">
                            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-foreground">
                                <CheckIcon class="h-4 w-4 text-background" />
                            </div>
                            <div>
                                <p class="text-sm font-semibold text-foreground">Seed complete</p>
                                <p class="text-xs text-muted-foreground">
                                    {results.totalCreated} created · {results.totalSkipped} already existed
                                </p>
                            </div>
                        </div>
                        <Button onclick={seed} variant="outline" size="sm" class="shrink-0">
                            <ChevronRightIcon class="mr-1.5 h-3.5 w-3.5" />
                            Re-run
                        </Button>
                    </div>

                    <!-- Breakdown table -->
                    <div class="rounded-2xl border border-border bg-background overflow-hidden">
                        <div class="border-b border-border px-5 py-3">
                            <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Breakdown</p>
                        </div>

                        <div class="divide-y divide-border/60">
                            <!-- University (bool) -->
                            <div class="flex items-center justify-between px-5 py-2.5 text-sm">
                                <span class="text-muted-foreground">University</span>
                                {#if results.university.created}
                                    <span class="font-mono text-xs font-medium text-foreground">+1</span>
                                {:else}
                                    <span class="text-xs text-muted-foreground/60">existed</span>
                                {/if}
                            </div>

                            <!-- Session (bool) -->
                            <div class="flex items-center justify-between px-5 py-2.5 text-sm">
                                <span class="text-muted-foreground">Academic session</span>
                                {#if results.session.created}
                                    <span class="font-mono text-xs font-medium text-foreground">+1</span>
                                {:else}
                                    <span class="text-xs text-muted-foreground/60">existed</span>
                                {/if}
                            </div>

                            {#each RESULT_KEYS as { key, label }}
                                {@const block = results[key] as ResultBlock}
                                {#if block && block.total > 0}
                                    <div class="flex items-center justify-between px-5 py-2.5 text-sm">
                                        <span class="text-muted-foreground">{label}</span>
                                        <div class="flex items-center gap-3">
                                            {#if block.created > 0}
                                                <span class="font-mono text-xs font-semibold text-foreground">+{block.created}</span>
                                            {/if}
                                            {#if block.skipped > 0}
                                                <span class="font-mono text-xs text-muted-foreground/50">{block.skipped} existed</span>
                                            {/if}
                                        </div>
                                    </div>
                                {/if}
                            {/each}
                        </div>
                    </div>

                    <!-- Credentials panel -->
                    {#if results.credentials?.length}
                        <div class="rounded-2xl border border-border bg-background overflow-hidden">
                            <!-- Panel header -->
                            <div class="border-b border-border px-5 py-4">
                                <div class="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                            Login credentials
                                        </p>
                                        <p class="mt-1 text-xs text-muted-foreground">
                                            {staffCount} staff · {studentCount} student{studentCount === 1 ? '' : 's'}
                                        </p>
                                    </div>

                                    <!-- Actions -->
                                    <div class="flex shrink-0 flex-wrap items-center gap-2">
                                        <button
                                            onclick={() => (showPasswords = !showPasswords)}
                                            class="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                                        >
                                            {#if showPasswords}
                                                <EyeOffIcon class="h-3.5 w-3.5" /> Hide
                                            {:else}
                                                <EyeIcon class="h-3.5 w-3.5" /> Reveal
                                            {/if}
                                        </button>
                                        <button
                                            onclick={copyCreds}
                                            class="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                                        >
                                            {#if copied}
                                                <CheckIcon class="h-3.5 w-3.5 text-foreground" /> Copied
                                            {:else}
                                                <CopyIcon class="h-3.5 w-3.5" /> Copy
                                            {/if}
                                        </button>
                                        <button
                                            onclick={downloadCreds}
                                            class="flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-90"
                                        >
                                            <DownloadIcon class="h-3.5 w-3.5" /> Download .txt
                                        </button>
                                    </div>
                                </div>

                                <!-- Filter pills -->
                                <div class="mt-4 flex gap-1.5">
                                    {#each [['all', `All (${results.credentials.length})`], ['staff', `Staff (${staffCount})`], ['student', `Students (${studentCount})`]] as [val, lbl]}
                                        <button
                                            onclick={() => (credFilter = val as typeof credFilter)}
                                            class="rounded-full px-3 py-1 text-xs font-medium transition-colors
                                                {credFilter === val
                                                    ? 'bg-foreground text-background'
                                                    : 'bg-muted text-muted-foreground hover:text-foreground'}"
                                        >
                                            {lbl}
                                        </button>
                                    {/each}
                                </div>
                            </div>

                            <!-- Table -->
                            <div class="max-h-96 overflow-auto">
                                <table class="w-full text-xs">
                                    <thead class="sticky top-0 bg-muted/80 backdrop-blur-sm">
                                        <tr class="text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                            <th class="px-5 py-2.5">Type</th>
                                            <th class="px-4 py-2.5">ID</th>
                                            <th class="px-4 py-2.5">Role</th>
                                            <th class="px-4 py-2.5">Email</th>
                                            <th class="px-4 py-2.5">Password</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-border/40">
                                        {#each filteredCreds as cred}
                                            <tr class="transition-colors hover:bg-muted/30">
                                                <td class="whitespace-nowrap px-5 py-2.5">
                                                    <span class="rounded-md border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                                        {cred.type}
                                                    </span>
                                                </td>
                                                <td class="whitespace-nowrap px-4 py-2.5 font-mono font-medium text-foreground">
                                                    {cred.identifier}
                                                </td>
                                                <td class="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                                                    {cred.role}
                                                </td>
                                                <td class="whitespace-nowrap px-4 py-2.5 font-mono text-muted-foreground">
                                                    {cred.email}
                                                </td>
                                                <td class="whitespace-nowrap px-4 py-2.5 font-mono">
                                                    {showPasswords ? cred.password : '••••••••'}
                                                </td>
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    {/if}
                {/if}

            </div><!-- /right panel -->
        </div><!-- /grid -->
    </div>
</div>