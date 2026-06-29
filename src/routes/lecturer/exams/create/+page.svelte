<!-- src/routes/lecturer/exams/create/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import {
    ChevronLeft, BookOpen, Clock, Settings,
    AlertCircle, Info, Users, ChevronDown, Check,
    Calendar, Search, X, GraduationCap, Building2,
    FileText, Timer, BarChart3, ShieldAlert, Layers,
    Shuffle, Eye, LogIn, AlertTriangle, Zap,
    TrendingUp, Scale, Award,
  } from '@lucide/svelte';
  import { fly, fade, scale } from 'svelte/transition';
  import { flip } from 'svelte/animate';

  let { data, form }: {
    data: PageData & {
      departments: Array<{ id: string; name: string; code: string }>;
      levels: Array<{ id: string; name: string; value: number }>;
      sessions: Array<{ id: string; session: string }>;
      courses: Array<{ id: string; code: string; title: string }>;
      examTotal: number;
      caTotal: number;
      totalMarks: number;
    };
    form: ActionData;
  } = $props();

  // ── Toast system ──────────────────────────────────────────────────────────
  type Toast = { id: number; message: string; type: 'info' | 'warn' };
  let toasts = $state<Toast[]>([]);
  let toastId = 0;

  function toast(message: string, type: Toast['type'] = 'info', duration = 2600) {
    const id = ++toastId;
    toasts = [...toasts, { id, message, type }];
    setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, duration);
  }

  // ── Levels ────────────────────────────────────────────────────────────────
  const LEVELS = $derived(
    (data.levels ?? []).map(l => l.value).sort((a, b) => a - b)
  );
  let selectedLevels = $state<Set<number>>(new Set());
  const allLevels = $derived(selectedLevels.size === LEVELS.length && LEVELS.length > 0);

  function toggleLevel(level: number) {
    const next = new Set(selectedLevels);
    if (next.has(level)) { next.delete(level); toast(`${level} Level removed`); }
    else                 { next.add(level);    toast(`${level} Level added`); }
    selectedLevels = next;
  }

  function toggleAll() {
    if (allLevels) { selectedLevels = new Set(); toast('All levels cleared'); }
    else           { selectedLevels = new Set(LEVELS); toast('All levels selected'); }
  }

  // ── Departments ───────────────────────────────────────────────────────────
  let selectedDepartments = $state<Set<string>>(new Set());
  let deptOpen   = $state(false);
  let deptSearch = $state('');

  const filteredDepts = $derived(
    data.departments.filter(d =>
      d.name.toLowerCase().includes(deptSearch.toLowerCase()) ||
      (d.code?.toLowerCase() ?? '').includes(deptSearch.toLowerCase())
    )
  );

  function toggleDept(id: string) {
    const dept = data.departments.find(d => d.id === id);
    const next = new Set(selectedDepartments);
    if (next.has(id)) { next.delete(id); toast(`${dept?.code ?? 'Dept'} removed`); }
    else              { next.add(id);    toast(`${dept?.code ?? 'Dept'} added`); }
    selectedDepartments = next;
  }

  function removeDept(id: string) {
    const dept = data.departments.find(d => d.id === id);
    const next = new Set(selectedDepartments);
    next.delete(id);
    selectedDepartments = next;
    toast(`${dept?.code ?? 'Dept'} removed`);
  }

  // ── Course ────────────────────────────────────────────────────────────────
  let selectedCourse = $state('');
  let courseOpen   = $state(false);
  let courseSearch = $state('');

  const filteredCourses = $derived(
    (data.courses ?? []).filter((c: any) =>
      c.code.toLowerCase().includes(courseSearch.toLowerCase()) ||
      c.title.toLowerCase().includes(courseSearch.toLowerCase())
    )
  );
  const selectedCourseObj = $derived((data.courses ?? []).find((c: any) => c.id === selectedCourse));

  // ── Semester ──────────────────────────────────────────────────────────────
  const SEMESTERS = [
    { value: '1', label: 'First Semester' },
    { value: '2', label: 'Second Semester' },
  ];
  let selectedSemester = $state(String(data.defaultSemester ?? 1));
  let semesterOpen = $state(false);
  const selectedSemesterLabel = $derived(
    SEMESTERS.find(s => s.value === selectedSemester)?.label ?? ''
  );

  // ── Session ───────────────────────────────────────────────────────────────
  let selectedSession = $state(data.defaultSession ?? '');
  let sessionOpen = $state(false);
  let sessionSearch = $state('');

  const filteredSessions = $derived(
    (data.sessions ?? []).filter((s: any) =>
      s.session.toLowerCase().includes(sessionSearch.toLowerCase())
    )
  );

  // ── Scoring ───────────────────────────────────────────────────────────────
  let durationMinutes    = $state<number>(Number(form?.values?.durationMinutes ?? 60));
  // FIXED: Exam is ALWAYS 70 marks at MOUAU
  const totalMarks       = 70;
  let passMark           = $state<number>(Number(form?.values?.passMark ?? 28));
  let maxViolations      = $state<number>(Number(form?.values?.maxViolations ?? 5));
  let questionsToPresent = $state<number>(Number(form?.values?.questionsToPresent ?? 35));

  // CA weight is ALWAYS 30 at MOUAU
  const caWeight = 30;

  // Calculate marks per question
  const marksPerQuestion = $derived(
    questionsToPresent > 0 ? totalMarks / questionsToPresent : 0
  );

  const passPercent = $derived(totalMarks > 0 ? Math.round((passMark / totalMarks) * 100) : 0);

  const passMarkWarning = $derived(
    passMark > totalMarks
      ? `Pass mark (${passMark}) exceeds exam weight (${totalMarks})`
      : passMark > totalMarks * 0.75
      ? `High pass mark — ${Math.round((passMark / totalMarks) * 100)}% of exam required`
      : null
  );

  const durationWarning = $derived(
    durationMinutes > 180 ? 'Very long exam — consider splitting into sections'
    : durationMinutes < 10 ? 'Very short — students may not have enough time'
    : null
  );

  // ── Toggles ───────────────────────────────────────────────────────────────
  let randomizeQuestions = $state(true);
  let randomizeOptions   = $state(true);
  let showResultAfter    = $state(false);
  let allowLateEntry     = $state(true);
  let lateEntryMinutes   = $state(30);

  function onToggleChange(
    field: 'randomizeQuestions' | 'randomizeOptions' | 'showResultAfter' | 'allowLateEntry',
    newValue: boolean,
    onMsg: string,
    offMsg: string
  ) {
    toast(newValue ? onMsg : offMsg);
  }

  // ── Date/time ─────────────────────────────────────────────────────────────
  let startDate = $state('');
  let startTime = $state('09:00');
  let endDate   = $state('');
  let endTime   = $state('11:00');
  let startOpen = $state(false);
  let endOpen   = $state(false);

  let startCalYear  = $state(new Date().getFullYear());
  let startCalMonth = $state(new Date().getMonth());
  let endCalYear    = $state(new Date().getFullYear());
  let endCalMonth   = $state(new Date().getMonth());

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DAY_NAMES   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  function calDays(year: number, month: number) {
    const first = new Date(year, month, 1).getDay();
    const total = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = Array(first).fill(null);
    for (let i = 1; i <= total; i++) days.push(i);
    return days;
  }

  function fmtDate(y: number, m: number, d: number) {
    return `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  const todayStr = $derived(fmtDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()));

  function selectStartDay(day: number) {
    startDate = fmtDate(startCalYear, startCalMonth, day);
    toast(`Start: ${MONTH_SHORT[startCalMonth]} ${day}, ${startCalYear}`);
    if (endDate && new Date(`${endDate}T${endTime}`) <= new Date(`${startDate}T${startTime}`)) {
      const startDt = new Date(`${startDate}T${startTime}`);
      const endDt   = new Date(startDt.getTime() + 2 * 60 * 60 * 1000);
      endDate = fmtDate(endDt.getFullYear(), endDt.getMonth(), endDt.getDate());
      endTime = `${String(endDt.getHours()).padStart(2,'0')}:${String(endDt.getMinutes()).padStart(2,'0')}`;
      endCalYear  = endDt.getFullYear();
      endCalMonth = endDt.getMonth();
      toast('End time auto-adjusted to be after start');
    }
  }

  function selectEndDay(day: number) {
    const candidate = fmtDate(endCalYear, endCalMonth, day);
    if (startDate) {
      const startDt     = new Date(`${startDate}T${startTime}`);
      const candidateDt = new Date(`${candidate}T${endTime}`);
      if (candidateDt <= startDt) {
        toast('End date must be after start date', 'warn');
        return;
      }
    }
    endDate = candidate;
    toast(`End: ${MONTH_SHORT[endCalMonth]} ${day}, ${endCalYear}`);
  }

  const startValue    = $derived(startDate ? `${startDate}T${startTime}` : '');
  const endValue      = $derived(endDate   ? `${endDate}T${endTime}`     : '');
  const dateRangeWarn = $derived(
    startDate && endDate && new Date(endValue) <= new Date(startValue)
      ? 'End time must be after start time' : null
  );

  function fmtDisplay(date: string, time: string) {
    if (!date) return '';
    const [y, m, d] = date.split('-').map(Number);
    return `${MONTH_SHORT[m-1]} ${d}, ${y} · ${time}`;
  }

  const TIME_OPTIONS: string[] = [];
  for (let h = 0; h < 24; h++)
    for (const m of [0, 15, 30, 45])
      TIME_OPTIONS.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);

  // ── Click outside ─────────────────────────────────────────────────────────
  function clickOutside(node: HTMLElement, handler: () => void) {
    const handle = (e: MouseEvent) => { if (!node.contains(e.target as Node)) handler(); };
    document.addEventListener('mousedown', handle, true);
    return { destroy() { document.removeEventListener('mousedown', handle, true); } };
  }

  function closeAll() { courseOpen = deptOpen = semesterOpen = startOpen = endOpen = sessionOpen = false; }

  // ── Preview ───────────────────────────────────────────────────────────────
  const levelPreview = $derived(
    allLevels ? 'All levels'
    : selectedLevels.size > 0 ? [...selectedLevels].sort((a,b)=>a-b).map(l=>`${l}L`).join(', ')
    : 'All levels (default)'
  );
  const deptPreview = $derived(
    selectedDepartments.size === 0 ? 'All departments'
    : selectedDepartments.size === 1
      ? data.departments.find(d => selectedDepartments.has(d.id))?.name ?? '1 selected'
    : `${selectedDepartments.size} departments`
  );

  // ── Pulse row on change ───────────────────────────────────────────────────
  let changedRow = $state<string | null>(null);
  function pulseRow(key: string) { changedRow = key; setTimeout(() => { changedRow = null; }, 700); }

  $effect(() => { void selectedCourseObj;         pulseRow('course'); });
  $effect(() => { void selectedLevels.size;        pulseRow('levels'); });
  $effect(() => { void selectedDepartments.size;   pulseRow('depts'); });
  $effect(() => { void selectedSemester;           pulseRow('semester'); });
  $effect(() => { void selectedSession;            pulseRow('session'); });
  $effect(() => { void startDate; void startTime;  pulseRow('start'); });
  $effect(() => { void endDate; void endTime;       pulseRow('end'); });
  $effect(() => { void allowLateEntry; void lateEntryMinutes; pulseRow('late'); });
  $effect(() => { void questionsToPresent;         pulseRow('pool'); });
</script>

<svelte:head><title>Create Exam — MOUAU eTest</title></svelte:head>

<!-- ── Toast stack ─────────────────────────────────────────────────────────── -->
<div class="toast-stack" aria-live="polite">
  {#each toasts as t (t.id)}
    <div class="toast toast-{t.type}"
      in:fly={{ y: 10, duration: 200 }}
      out:fly={{ y: -6, duration: 160 }}>
      {#if t.type === 'warn'}<AlertTriangle size={13} />
      {:else}<Zap size={13} />{/if}
      {t.message}
    </div>
  {/each}
</div>

<div class="page">
  <div class="page-header">
    <a href="/lecturer" class="back-link">
      <ChevronLeft size={14} strokeWidth={2.5} /> Back to Dashboard
    </a>
    <div class="page-header-main">
      <div>
        <h1>Create New Exam</h1>
        <p>Configure and schedule an examination for your students</p>
      </div>
      <div class="header-actions">
        <a href="/lecturer" class="btn ghost">Cancel</a>
        <button type="submit" form="exam-form" class="btn primary">
          Create Exam &amp; Add Questions &rarr;
        </button>
      </div>
    </div>
  </div>

  {#if form?.error}
    <div class="alert-error" transition:fly={{ y: -6, duration: 180 }}>
      <AlertCircle size={15} /> {form.error}
    </div>
  {/if}

  <form method="POST" id="exam-form" class="exam-grid">

    <!-- ══ COLUMN 1 ════════════════════════════════════════════════════════ -->
    <div class="col">

      <!-- Basic Information -->
      <div class="card">
        <div class="card-header">
          <span class="card-icon"><BookOpen size={16} /></span>
          <div><h2>Basic Information</h2><p>Name the exam and link it to a course</p></div>
        </div>
        <div class="card-body">

          <div class="field">
            <label for="title">Exam Title <span class="req">*</span></label>
            <input id="title" name="title" type="text" required
              placeholder="e.g. CSC301 First Semester Examination 2025/2026"
              value={form?.values?.title ?? ''} />
            {#if form?.errors?.title}<span class="field-error">{form.errors.title}</span>{/if}
          </div>

          <div class="field">
            <label>Course <span class="req">*</span>
              {#if (data.courses ?? []).length === 0}
                <span class="field-hint-inline">— No courses assigned yet</span>
              {:else}
                <span class="field-hint-inline muted">{(data.courses ?? []).length} course{(data.courses ?? []).length !== 1 ? 's' : ''} available</span>
              {/if}
            </label>
            <input type="hidden" name="courseId" value={selectedCourse} />
            <div class="dd-wrap" use:clickOutside={() => { courseOpen = false; courseSearch = ''; }}>
              <button type="button" class="dd-trigger" class:open={courseOpen}
                onclick={() => { closeAll(); courseOpen = true; }}>
                {#if selectedCourseObj}
                  <span class="dd-badge">{selectedCourseObj.code}</span>
                  <span class="dd-val">{selectedCourseObj.title}</span>
                {:else}
                  <span class="dd-placeholder">
                    {(data.courses ?? []).length === 0 ? 'No courses assigned — contact admin' : 'Select a course…'}
                  </span>
                {/if}
                <ChevronDown size={15} class="dd-chevron" />
              </button>
              {#if courseOpen && (data.courses ?? []).length > 0}
                <div class="dd-panel" transition:fade={{ duration: 100 }}>
                  <div class="dd-search">
                    <Search size={13} />
                    <input type="text" placeholder="Search by code or name…"
                      bind:value={courseSearch} autofocus />
                  </div>
                  <div class="dd-list">
                    {#if filteredCourses.length === 0}
                      <div class="dd-empty">No courses match your search</div>
                    {:else}
                      {#each filteredCourses as c}
                        <button type="button" class="dd-item" class:active={selectedCourse === c.id}
                          onclick={() => {
                            const prev = selectedCourse;
                            selectedCourse = c.id;
                            courseOpen = false; courseSearch = '';
                            if (prev !== c.id) toast(`Course set to ${c.code}`);
                          }}>
                          <span class="item-code">{c.code}</span>
                          <span class="item-label">{c.title}</span>
                          {#if selectedCourse === c.id}<Check size={13} class="item-check" />{/if}
                        </button>
                      {/each}
                    {/if}
                  </div>
                </div>
              {/if}
            </div>
            {#if form?.errors?.courseId}<span class="field-error">{form.errors.courseId}</span>{/if}
          </div>

          <div class="field">
            <label for="instructions">Instructions <span class="opt">Optional</span></label>
            <textarea id="instructions" name="instructions" rows="3"
              placeholder="Answer all questions. No external resources allowed."
            >{form?.values?.instructions ?? ''}</textarea>
          </div>
        </div>
      </div>

      <!-- Exam Scope -->
      <div class="card">
        <div class="card-header">
          <span class="card-icon"><Users size={16} /></span>
          <div><h2>Exam Scope</h2><p>Define which students may sit this exam</p></div>
        </div>
        <div class="card-body">

          <div class="scope-section">
            <div class="scope-row">
              <div class="scope-label-group">
                <GraduationCap size={14} />
                <span>Student Levels</span>
                {#if selectedLevels.size > 0}
                  <span class="count-badge" in:scale={{ duration: 160 }}>{selectedLevels.size}</span>
                {/if}
              </div>
              <button type="button" class="pill-btn" class:active={allLevels} onclick={toggleAll}>
                {allLevels ? '✓ All' : 'Select All'}
              </button>
            </div>

            <div class="level-grid">
              {#each LEVELS as level}
                <button type="button" class="level-chip" class:selected={selectedLevels.has(level)}
                  onclick={() => toggleLevel(level)}>
                  <span class="level-num">{level}</span>
                  <span class="level-lbl">Level</span>
                  {#if selectedLevels.has(level)}
                    <span class="level-check" in:scale={{ duration: 140 }}><Check size={10} strokeWidth={3} /></span>
                  {/if}
                </button>
              {/each}
            </div>

            {#each [...selectedLevels] as level}
              <input type="hidden" name="levels" value={level} />
            {/each}

            <div class="scope-note" class:active={selectedLevels.size > 0 || allLevels}>
              {#if allLevels}✓ All levels ({LEVELS.join('–')}) can sit this exam.
              {:else if selectedLevels.size > 0}✓ {[...selectedLevels].sort((a,b)=>a-b).map(l=>`${l}L`).join(', ')} students eligible.
              {:else}No level selected — all levels allowed by default.{/if}
            </div>
          </div>

          <div class="divider"></div>

          <div class="scope-section">
            <div class="scope-row">
              <div class="scope-label-group">
                <Building2 size={14} />
                <span>Departments</span>
                {#if selectedDepartments.size > 0}
                  <span class="count-badge" in:scale={{ duration: 160 }}>{selectedDepartments.size}</span>
                {/if}
              </div>
              <span class="opt-badge">Optional</span>
            </div>

            {#each [...selectedDepartments] as id}
              <input type="hidden" name="departments" value={id} />
            {/each}

            <div class="dd-wrap" use:clickOutside={() => { deptOpen = false; deptSearch = ''; }}>
              <button type="button" class="dd-trigger multi" class:open={deptOpen}
                onclick={() => { closeAll(); deptOpen = true; }}>
                {#if selectedDepartments.size === 0}
                  <span class="dd-placeholder">All departments (no restriction)…</span>
                {:else}
                  <div class="tag-row">
                    {#each [...selectedDepartments] as id (id)}
                      {@const d = data.departments.find((dept: any) => dept.id === id)}
                      <div animate:flip={{ duration: 180 }}>
                        {#if d}
                          <span class="tag">
                            {d.code}
                            <button type="button" class="tag-x"
                              onclick={(e) => { e.stopPropagation(); removeDept(id); }}>
                              <X size={9} strokeWidth={3} />
                            </button>
                          </span>
                        {/if}
                      </div>
                    {/each}
                  </div>
                {/if}
                <ChevronDown size={15} class="dd-chevron" />
              </button>
              {#if deptOpen}
                <div class="dd-panel" transition:fade={{ duration: 100 }}>
                  <div class="dd-search">
                    <Search size={13} />
                    <input type="text" placeholder="Search departments…" bind:value={deptSearch} autofocus />
                  </div>
                  <div class="dd-list">
                    {#if filteredDepts.length === 0}
                      <div class="dd-empty">No departments found</div>
                    {:else}
                      {#each filteredDepts as d}
                        <button type="button" class="dd-item" class:active={selectedDepartments.has(d.id)}
                          onclick={() => toggleDept(d.id)}>
                          <span class="item-code">{d.code}</span>
                          <span class="item-label">{d.name}</span>
                          {#if selectedDepartments.has(d.id)}<Check size={13} class="item-check" />{/if}
                        </button>
                      {/each}
                    {/if}
                  </div>
                </div>
              {/if}
            </div>
            <p class="field-hint">Leave empty to allow all departments.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ COLUMN 2 ════════════════════════════════════════════════════════ -->
    <div class="col">

      <div class="card">
        <div class="card-header">
          <span class="card-icon"><Clock size={16} /></span>
          <div><h2>Schedule &amp; Timing</h2><p>Set when the exam runs and how long students have</p></div>
        </div>
        <div class="card-body">
          <input type="hidden" name="scheduledStart" value={startValue} />
          <input type="hidden" name="scheduledEnd"   value={endValue} />

          <!-- Start -->
          <div class="field">
            <label>Scheduled Start</label>
            <div class="dd-wrap" use:clickOutside={() => startOpen = false}>
              <button type="button" class="dd-trigger" class:open={startOpen} class:has-val={!!startDate}
                onclick={() => { closeAll(); startOpen = true; }}>
                <Calendar size={14} class="dt-cal-icon" />
                {#if startDate}<span class="dd-val">{fmtDisplay(startDate, startTime)}</span>
                {:else}<span class="dd-placeholder">Pick date &amp; time…</span>{/if}
                <ChevronDown size={15} class="dd-chevron" />
              </button>
              {#if startOpen}
                <div class="dd-panel dt-panel" transition:fade={{ duration: 100 }}>
                  <div class="cal-nav">
                    <button type="button" class="cal-arr" onclick={() => { if (startCalMonth === 0) { startCalMonth = 11; startCalYear--; } else startCalMonth--; }}>&lsaquo;</button>
                    <span class="cal-month-lbl">{MONTH_NAMES[startCalMonth]} {startCalYear}</span>
                    <button type="button" class="cal-arr" onclick={() => { if (startCalMonth === 11) { startCalMonth = 0; startCalYear++; } else startCalMonth++; }}>&rsaquo;</button>
                  </div>
                  <div class="cal-grid">
                    {#each DAY_NAMES as dn}<span class="cal-dn">{dn}</span>{/each}
                    {#each calDays(startCalYear, startCalMonth) as day}
                      {#if day === null}<span></span>
                      {:else}
                        <button type="button" class="cal-day"
                          class:today={fmtDate(startCalYear, startCalMonth, day) === todayStr}
                          class:selected={startDate === fmtDate(startCalYear, startCalMonth, day)}
                          onclick={() => selectStartDay(day)}>{day}</button>
                      {/if}
                    {/each}
                  </div>
                  <div class="time-row">
                    <Clock size={13} />
                    <select class="time-sel" bind:value={startTime}
                      onchange={() => startDate && toast(`Start time → ${startTime}`)}>
                      {#each TIME_OPTIONS as t}<option value={t}>{t}</option>{/each}
                    </select>
                    {#if startDate}<button type="button" class="dt-done-btn" onclick={() => startOpen = false}>Done</button>{/if}
                  </div>
                </div>
              {/if}
            </div>
          </div>

          <!-- End -->
          <div class="field">
            <label>Scheduled End</label>
            <div class="dd-wrap" use:clickOutside={() => endOpen = false}>
              <button type="button" class="dd-trigger" class:open={endOpen} class:has-val={!!endDate}
                onclick={() => { closeAll(); endOpen = true; }}>
                <Calendar size={14} class="dt-cal-icon" />
                {#if endDate}<span class="dd-val">{fmtDisplay(endDate, endTime)}</span>
                {:else}<span class="dd-placeholder">Pick date &amp; time…</span>{/if}
                <ChevronDown size={15} class="dd-chevron" />
              </button>
              {#if endOpen}
                <div class="dd-panel dt-panel" transition:fade={{ duration: 100 }}>
                  <div class="cal-nav">
                    <button type="button" class="cal-arr" onclick={() => { if (endCalMonth === 0) { endCalMonth = 11; endCalYear--; } else endCalMonth--; }}>&lsaquo;</button>
                    <span class="cal-month-lbl">{MONTH_NAMES[endCalMonth]} {endCalYear}</span>
                    <button type="button" class="cal-arr" onclick={() => { if (endCalMonth === 11) { endCalMonth = 0; endCalYear++; } else endCalMonth++; }}>&rsaquo;</button>
                  </div>
                  <div class="cal-grid">
                    {#each DAY_NAMES as dn}<span class="cal-dn">{dn}</span>{/each}
                    {#each calDays(endCalYear, endCalMonth) as day}
                      {#if day === null}<span></span>
                      {:else}
                        <button type="button" class="cal-day"
                          class:today={fmtDate(endCalYear, endCalMonth, day) === todayStr}
                          class:selected={endDate === fmtDate(endCalYear, endCalMonth, day)}
                          class:disabled={startDate ? new Date(`${fmtDate(endCalYear, endCalMonth, day)}T${endTime}`) <= new Date(`${startDate}T${startTime}`) : false}
                          onclick={() => selectEndDay(day)}>{day}</button>
                      {/if}
                    {/each}
                  </div>
                  <div class="time-row">
                    <Clock size={13} />
                    <select class="time-sel" bind:value={endTime}
                      onchange={() => {
                        if (endDate && startDate) {
                          const endDt   = new Date(`${endDate}T${endTime}`);
                          const startDt = new Date(`${startDate}T${startTime}`);
                          if (endDt <= startDt) toast('End time must be after start time', 'warn');
                          else toast(`End time → ${endTime}`);
                        }
                      }}>
                      {#each TIME_OPTIONS as t}<option value={t}>{t}</option>{/each}
                    </select>
                    {#if endDate}<button type="button" class="dt-done-btn" onclick={() => endOpen = false}>Done</button>{/if}
                  </div>
                </div>
              {/if}
            </div>
            {#if dateRangeWarn}
              <span class="field-error" transition:fly={{ y: -4, duration: 140 }}>
                <AlertTriangle size={11} /> {dateRangeWarn}
              </span>
            {:else if form?.errors?.scheduledEnd}
              <span class="field-error">{form.errors.scheduledEnd}</span>
            {/if}
          </div>

          <div class="two-col">
            <!-- Session dropdown -->
            <div class="field">
              <label>Academic Session <span class="req">*</span></label>
              <input type="hidden" name="session" value={selectedSession} />
              <div class="dd-wrap" use:clickOutside={() => { sessionOpen = false; sessionSearch = ''; }}>
                <button type="button" class="dd-trigger" class:open={sessionOpen} class:has-val={!!selectedSession}
                  onclick={() => { closeAll(); sessionOpen = true; }}>
                  {#if selectedSession}
                    <span class="dd-val">{selectedSession}</span>
                  {:else}
                    <span class="dd-placeholder">Select session…</span>
                  {/if}
                  <ChevronDown size={15} class="dd-chevron" />
                </button>
                {#if sessionOpen}
                  <div class="dd-panel" transition:fade={{ duration: 100 }}>
                    <div class="dd-search">
                      <Search size={13} />
                      <input type="text" placeholder="Search sessions…" bind:value={sessionSearch} autofocus />
                    </div>
                    <div class="dd-list">
                      {#if filteredSessions.length === 0}
                        <div class="dd-empty">No sessions found</div>
                      {:else}
                        {#each filteredSessions as s}
                          <button type="button" class="dd-item" class:active={selectedSession === s.session}
                            onclick={() => {
                              const prev = selectedSession;
                              selectedSession = s.session;
                              sessionOpen = false; sessionSearch = '';
                              if (prev !== s.session) toast(`Session set to ${s.session}`);
                            }}>
                            <span class="item-label">{s.session}</span>
                            {#if selectedSession === s.session}<Check size={13} class="item-check" />{/if}
                          </button>
                        {/each}
                      {/if}
                    </div>
                  </div>
                {/if}
              </div>
              {#if form?.errors?.session}<span class="field-error">{form.errors.session}</span>{/if}
            </div>

            <!-- Semester dropdown -->
            <div class="field">
              <label>Semester <span class="req">*</span></label>
              <input type="hidden" name="semester" value={selectedSemester} />
              <div class="dd-wrap" use:clickOutside={() => semesterOpen = false}>
                <button type="button" class="dd-trigger" class:open={semesterOpen} class:has-val={true}
                  onclick={() => { closeAll(); semesterOpen = true; }}>
                  <span class="dd-val">{selectedSemesterLabel}</span>
                  <ChevronDown size={15} class="dd-chevron" />
                </button>
                {#if semesterOpen}
                  <div class="dd-panel" transition:fade={{ duration: 100 }}>
                    <div class="dd-list">
                      {#each SEMESTERS as s}
                        <button type="button" class="dd-item" class:active={selectedSemester === s.value}
                          onclick={() => {
                            const prev = selectedSemester;
                            selectedSemester = s.value; semesterOpen = false;
                            if (prev !== s.value) toast(`${s.label} selected`);
                          }}>
                          <span class="item-label">{s.label}</span>
                          {#if selectedSemester === s.value}<Check size={13} class="item-check" />{/if}
                        </button>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
              {#if form?.errors?.semester}<span class="field-error">{form.errors.semester}</span>{/if}
            </div>
          </div>
        </div>
      </div>

      <!-- ── Scoring ──────────────────────────────────────────────────────── -->
      <div class="card">
        <div class="card-header">
          <span class="card-icon"><BarChart3 size={16} /></span>
          <div><h2>Scoring</h2><p>MOUAU Standard: Exam = 70 marks, CA = 30 marks</p></div>
        </div>
        <div class="card-body">
          <div class="score-grid">

            <!-- Duration -->
            <div class="score-field">
              <label for="durationMinutes"><Timer size={13} /> Duration</label>
              <div class="score-input-wrap">
                <input id="durationMinutes" name="durationMinutes" type="number"
                  bind:value={durationMinutes} min="5" max="300" required />
                <span class="score-unit">min</span>
              </div>
              {#if durationWarning}
                <span class="field-warn" transition:fly={{ y: -4, duration: 140 }}>
                  <AlertTriangle size={10} /> {durationWarning}
                </span>
              {/if}
            </div>

            <!-- Exam Weight - FIXED at 70 (display only) -->
            <div class="score-field">
              <label>
                <FileText size={13} /> Exam Weight
                <span class="label-sub">(Fixed)</span>
              </label>
              <div class="exam-weight-display">
                <span class="exam-weight-value">70</span>
                <span class="exam-weight-label">marks</span>
                <div class="exam-weight-badge">MOUAU Standard</div>
              </div>
              <input type="hidden" name="totalMarks" value="70" />
              <p class="field-hint">Fixed at 70 marks as per MOUAU grading policy</p>
            </div>

            <!-- CA Weight - FIXED at 30 (display only) -->
            <div class="score-field">
              <label>
                <Scale size={13} /> CA Weight
                <span class="label-sub">(Fixed)</span>
              </label>
              <div class="exam-weight-display ca">
                <span class="exam-weight-value">30</span>
                <span class="exam-weight-label">marks</span>
                <div class="exam-weight-badge ca">Continuous Assessment</div>
              </div>
              <p class="field-hint">Fixed at 30 marks as per MOUAU grading policy</p>
            </div>

            <!-- Total Display -->
            <div class="score-field total-display">
              <label><Award size={13} /> Total Available</label>
              <div class="total-display-value">100 marks</div>
              <p class="field-hint">Exam (70) + CA (30) = 100</p>
            </div>

            <!-- Pass Mark -->
            <div class="score-field">
              <label for="passMark"><Check size={13} strokeWidth={2.5} /> Pass Mark (Exam)</label>
              <div class="score-input-wrap">
                <input id="passMark" name="passMark" type="number"
                  bind:value={passMark} min="1" max="70" required
                  class:input-warn={!!passMarkWarning} />
                <span class="score-unit">/70</span>
              </div>
              {#if totalMarks > 0 && passMark > 0}
                <div class="pass-bar-wrap">
                  <div class="pass-bar-track">
                    <div class="pass-bar-fill"
                      class:bar-ok={passPercent <= 60}
                      class:bar-high={passPercent > 60 && passPercent <= 80}
                      class:bar-warn={passPercent > 80}
                      style="width:{Math.min(passPercent,100)}%"></div>
                  </div>
                  <span class="pass-pct">{passPercent}% of exam</span>
                </div>
              {/if}
              <p class="field-hint">Minimum 40% of exam weight (28 marks) as per MOUAU policy</p>
              {#if passMarkWarning}
                <span class="field-warn" transition:fly={{ y: -4, duration: 140 }}>
                  <AlertTriangle size={10} /> {passMarkWarning}
                </span>
              {/if}
            </div>

            <!-- Max Violations -->
            <div class="score-field">
              <label for="maxViolations"><ShieldAlert size={13} /> Max Violations</label>
              <div class="score-input-wrap">
                <input id="maxViolations" name="maxViolations" type="number"
                  bind:value={maxViolations} min="1" max="20" />
                <span class="score-unit">&times;</span>
              </div>
              {#if maxViolations <= 2}
                <span class="field-warn" transition:fly={{ y: -4, duration: 140 }}>
                  <AlertTriangle size={10} /> Very strict — only {maxViolations} chance{maxViolations > 1 ? 's' : ''}
                </span>
              {/if}
            </div>

          </div>

          <!-- Questions Per Student & Mark Distribution -->
          <div class="qtp-wrap">
            <div class="qtp-header">
              <div class="qtp-label-group"><Layers size={14} /><span>Questions Per Student</span></div>
              <span class="opt-badge">Auto-scoring</span>
            </div>
            <div class="qtp-row">
              <div class="score-input-wrap qtp-input-wrap">
                <input name="questionsToPresent" type="number"
                  bind:value={questionsToPresent} min="1" placeholder="35" />
                <span class="score-unit">Qs</span>
              </div>
              <div class="qtp-hint-bubble" class:active={questionsToPresent > 0}>
                {#if questionsToPresent > 0}
                  Each student gets <strong>{questionsToPresent}</strong> questions
                  &middot; <strong>{marksPerQuestion.toFixed(2)}</strong> marks each
                  = <strong>{totalMarks}</strong> exam marks total
                {:else}
                  <span class="muted">Set questions to calculate marks distribution</span>
                {/if}
              </div>
            </div>
            <p class="field-hint">
              Total exam marks is always <strong>{totalMarks}</strong>. Marks per question = {totalMarks} ÷ number of questions.
              {#if questionsToPresent > 0}
                Current: <strong>{marksPerQuestion.toFixed(2)}</strong> marks per question
              {/if}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ COLUMN 3 ════════════════════════════════════════════════════════ -->
    <div class="col">

      <!-- Options -->
      <div class="card">
        <div class="card-header">
          <span class="card-icon"><Settings size={16} /></span>
          <div><h2>Exam Options</h2><p>Behaviour and results settings</p></div>
        </div>
        <div class="toggles">

          <label class="toggle-row">
            <div class="toggle-text">
              <span class="toggle-icon-wrap"><Shuffle size={14} /></span>
              <div>
                <span class="toggle-label">Randomize Questions</span>
                <span class="toggle-desc">
                  {randomizeQuestions ? 'Shuffled per student' : 'Fixed order for all'}
                </span>
              </div>
            </div>
            <div class="toggle-track" class:on={randomizeQuestions}>
              <input type="checkbox" name="randomizeQuestions"
                bind:checked={randomizeQuestions}
                oninput={() => onToggleChange('randomizeQuestions', randomizeQuestions,
                  'Questions will be shuffled', 'Questions in fixed order')}
                class="toggle-cb" />
              <span class="toggle-knob"></span>
            </div>
          </label>

          <label class="toggle-row">
            <div class="toggle-text">
              <span class="toggle-icon-wrap"><TrendingUp size={14} /></span>
              <div>
                <span class="toggle-label">Randomize Options</span>
                <span class="toggle-desc">
                  {randomizeOptions ? 'MCQ choices shuffled' : 'Choices in fixed order'}
                </span>
              </div>
            </div>
            <div class="toggle-track" class:on={randomizeOptions}>
              <input type="checkbox" name="randomizeOptions"
                bind:checked={randomizeOptions}
                oninput={() => onToggleChange('randomizeOptions', randomizeOptions,
                  'MCQ choices will be shuffled', 'MCQ choices in fixed order')}
                class="toggle-cb" />
              <span class="toggle-knob"></span>
            </div>
          </label>

          <label class="toggle-row">
            <div class="toggle-text">
              <span class="toggle-icon-wrap"><Eye size={14} /></span>
              <div>
                <span class="toggle-label">Show Result Immediately</span>
                <span class="toggle-desc">
                  {showResultAfter ? 'Results hidden until released':'Score shown after submission'}
                </span>
              </div>
            </div>
            <div class="toggle-track" class:on={showResultAfter}>
              <input type="checkbox" name="showResultAfter"
                bind:checked={showResultAfter}
                oninput={() => onToggleChange('showResultAfter', showResultAfter,
                  'Results hidden until you release them','Students will see their score immediately')}
                class="toggle-cb" />
              <span class="toggle-knob"></span>
            </div>
          </label>

          <label class="toggle-row">
            <div class="toggle-text">
              <span class="toggle-icon-wrap"><LogIn size={14} /></span>
              <div>
                <span class="toggle-label">Allow Late Entry</span>
                <span class="toggle-desc">
                  {allowLateEntry ? `${lateEntryMinutes} min grace period` : 'Must join on time'}
                </span>
              </div>
            </div>
            <div class="toggle-track" class:on={allowLateEntry}>
              <input type="checkbox" name="allowLateEntry"
                bind:checked={allowLateEntry}
                oninput={() => onToggleChange('allowLateEntry', allowLateEntry,
                  'Late entry enabled', 'Late entry disabled')}
                class="toggle-cb" />
              <span class="toggle-knob"></span>
            </div>
          </label>

        </div>

        {#if allowLateEntry}
          <div class="late-entry-field" transition:fly={{ y: -8, duration: 180 }}>
            <label for="lateEntryMinutes">Grace period after start</label>
            <div class="late-row">
              <div class="score-input-wrap" style="width:120px">
                <input id="lateEntryMinutes" name="lateEntryMinutes" type="number"
                  bind:value={lateEntryMinutes} min="1" max="60" />
                <span class="score-unit">min</span>
              </div>
              <span class="late-hint">
                Students can join up to {lateEntryMinutes} min after start
              </span>
            </div>
          </div>
        {/if}
      </div>

      <div class="info-box">
        <div class="info-dot"><Info size={15} /></div>
        <div>
          <strong>Next: Question Builder</strong>
          <p>After creating the exam you will be redirected to add MCQ and fill-in-the-blank questions.</p>
        </div>
      </div>

      <!-- Config preview -->
      <div class="summary-card">
        <div class="summary-title">Configuration Preview</div>
        <div class="summary-rows">

          <div class="sum-row" class:sum-row-pulse={changedRow === 'course'}>
            <span>Course</span>
            <span class="sum-val" class:sum-val-set={!!selectedCourseObj}>
              {selectedCourseObj?.code ?? '—'}
            </span>
          </div>
          <div class="sum-row" class:sum-row-pulse={changedRow === 'levels'}>
            <span>Eligible Levels</span>
            <span class="sum-val" class:sum-val-set={selectedLevels.size > 0}>{levelPreview}</span>
          </div>
          <div class="sum-row" class:sum-row-pulse={changedRow === 'depts'}>
            <span>Departments</span>
            <span class="sum-val" class:sum-val-set={selectedDepartments.size > 0}>{deptPreview}</span>
          </div>
          <div class="sum-row" class:sum-row-pulse={changedRow === 'session'}>
            <span>Session</span>
            <span class="sum-val" class:sum-val-set={!!selectedSession}>{selectedSession || '—'}</span>
          </div>
          <div class="sum-row" class:sum-row-pulse={changedRow === 'semester'}>
            <span>Semester</span>
            <span class="sum-val sum-val-set">{selectedSemesterLabel}</span>
          </div>
          <div class="sum-row" class:sum-row-pulse={changedRow === 'start'}>
            <span>Start</span>
            <span class="sum-val" class:sum-val-set={!!startDate}>
              {startDate ? fmtDisplay(startDate, startTime) : '—'}
            </span>
          </div>
          <div class="sum-row" class:sum-row-pulse={changedRow === 'end'}>
            <span>End</span>
            <span class="sum-val" class:sum-val-set={!!endDate}>
              {endDate ? fmtDisplay(endDate, endTime) : '—'}
            </span>
          </div>
          <div class="sum-row">
            <span>Duration</span>
            <span class="sum-val sum-val-set">{durationMinutes} min</span>
          </div>

          <!-- Exam weight + CA weight rows -->
          <div class="sum-row">
            <span>Exam weight</span>
            <span class="sum-val sum-val-set">{totalMarks} / 100</span>
          </div>
          <div class="sum-row">
            <span>CA weight</span>
            <span class="sum-val sum-val-set">{caWeight} / 100</span>
          </div>

          <div class="sum-row">
            <span>Pass threshold</span>
            <span class="sum-val sum-val-set" class:sum-val-warn={!!passMarkWarning}>
              {passMark}/{totalMarks} &middot; {passPercent}% (exam only)
            </span>
          </div>
          <div class="sum-row" class:sum-row-pulse={changedRow === 'late'}>
            <span>Late Entry</span>
            <span class="sum-val" class:sum-val-set={allowLateEntry}>
              {allowLateEntry ? `✓ ${lateEntryMinutes} min` : 'Off'}
            </span>
          </div>
          <div class="sum-row" class:sum-row-pulse={changedRow === 'pool'}>
            <span>Question pool</span>
            <span class="sum-val" class:sum-val-set={questionsToPresent > 0}>
              {questionsToPresent > 0 ? `${questionsToPresent} per student` : 'All questions'}
            </span>
          </div>
          <div class="sum-row">
            <span>Marks per Q</span>
            <span class="sum-val" class:sum-val-set={questionsToPresent > 0}>
              {questionsToPresent > 0 ? `${marksPerQuestion.toFixed(2)}` : '—'}
            </span>
          </div>
          <div class="sum-row">
            <span>Show result</span>
            <span class="sum-val" class:sum-val-set={showResultAfter}>
              {showResultAfter ? '✓ Immediately' : 'After release'}
            </span>
          </div>
          <div class="sum-row">
            <span>Randomize</span>
            <span class="sum-val">
              {randomizeQuestions && randomizeOptions ? 'Questions & options'
              : randomizeQuestions ? 'Questions only'
              : randomizeOptions ? 'Options only'
              : 'Off'}
            </span>
          </div>
          <div class="sum-row">
            <span>Max violations</span>
            <span class="sum-val sum-val-set" class:sum-val-warn={maxViolations <= 2}>
              {maxViolations}
            </span>
          </div>

        </div>
      </div>

      <div class="form-footer">
        <a href="/lecturer" class="btn ghost">Cancel</a>
        <button type="submit" class="btn primary">Create Exam &amp; Add Questions &rarr;</button>
      </div>
    </div>
  </form>
</div>

<style>
  /* ── Toast ───────────────────────────────────────────────────────────────── */
  .toast-stack {
    position: fixed; bottom: 1.5rem; right: 1.5rem;
    z-index: 9999; display: flex; flex-direction: column; gap: .35rem;
    pointer-events: none;
  }
  .toast {
    display: inline-flex; align-items: center; gap: .45rem;
    padding: .5rem .9rem; border-radius: .55rem;
    font-size: .79rem; font-weight: 600; white-space: nowrap;
    box-shadow: 0 4px 14px rgba(0,0,0,.1); max-width: 300px;
  }
  .toast-info { background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); }
  .toast-warn { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }

  /* ── Root ────────────────────────────────────────────────────────────────── */
  .page { padding: 1.75rem 2rem 4rem; max-width: 1400px; margin: 0 auto; }

  /* ── Header ──────────────────────────────────────────────────────────────── */
  .page-header { margin-bottom: 1.75rem; padding-bottom: 1.25rem; border-bottom: 1px solid var(--color-border); }
  .back-link { display: inline-flex; align-items: center; gap: .2rem; font-size: .75rem; font-weight: 600; color: var(--lc-600); text-decoration: none; margin-bottom: .875rem; transition: gap .12s; }
  .back-link:hover { gap: .4rem; }
  .page-header-main { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
  .page-header-main h1 { font-size: 1.85rem; font-weight: 900; letter-spacing: -.04em; color: var(--color-text); margin: 0 0 .2rem; }
  .page-header-main > div > p { font-size: .82rem; color: var(--color-muted); margin: 0; }
  .header-actions { display: flex; gap: .625rem; align-items: center; flex-shrink: 0; }
  .alert-error { display: flex; align-items: center; gap: .6rem; padding: .875rem 1rem; margin-bottom: 1.25rem; background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.25); border-radius: .75rem; font-size: .875rem; color: #dc2626; }

  /* ── Grid ────────────────────────────────────────────────────────────────── */
  .exam-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; align-items: start; }
  @media (max-width: 1100px) {
    .exam-grid { grid-template-columns: 1fr 1fr; }
    .col:nth-child(3) { grid-column: 1 / -1; display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
  }
  @media (max-width: 720px) {
    .exam-grid { grid-template-columns: 1fr; }
    .col:nth-child(3) { grid-column: auto; display: flex; flex-direction: column; }
  }
  .col { display: flex; flex-direction: column; gap: 1.25rem; animation: fadeUp .32s ease both; position: relative; z-index: 0; }
  .col:has(.dd-panel) { z-index: 100; }
  .col:nth-child(2) { animation-delay: .06s; }
  .col:nth-child(3) { animation-delay: .12s; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

  /* ── Cards ───────────────────────────────────────────────────────────────── */
  .card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 1rem; overflow: visible; }
  .card-header { display: flex; align-items: flex-start; gap: .75rem; padding: 1rem 1.25rem .875rem; border-bottom: 1px solid var(--color-border); background: var(--color-bg); border-radius: 1rem 1rem 0 0; }
  .card-icon { width: 32px; height: 32px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: var(--lc-soft); border-radius: .5rem; color: var(--lc-600); }
  .card-header h2 { font-size: .85rem; font-weight: 700; color: var(--color-text); margin: 0 0 .15rem; }
  .card-header p  { font-size: .73rem; color: var(--color-muted); margin: 0; }
  .card-body { padding: 1.125rem 1.25rem; display: flex; flex-direction: column; gap: .875rem; }

  /* ── Fields ──────────────────────────────────────────────────────────────── */
  .field { display: flex; flex-direction: column; gap: .35rem; }
  .field label { font-size: .8rem; font-weight: 600; color: var(--color-text); display: flex; align-items: center; gap: .35rem; flex-wrap: wrap; }
  .label-sub { font-size: .68rem; font-weight: 500; color: var(--color-muted); }
  .req { color: #ef4444; }
  .opt { font-size: .7rem; font-weight: 500; color: var(--color-muted); margin-left: .2rem; }
  .opt-badge { font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--color-muted); background: var(--color-border); padding: .12rem .45rem; border-radius: 999px; }
  .field-hint { font-size: .72rem; color: var(--color-muted); line-height: 1.4; margin: 0; }
  .field-hint-inline { font-size: .72rem; font-weight: 500; }
  .field-hint-inline.muted { color: var(--color-muted); }
  .field-error { font-size: .73rem; color: #dc2626; display: flex; align-items: center; gap: .3rem; }
  .field-warn  { font-size: .73rem; color: #d97706; display: flex; align-items: center; gap: .3rem; }
  .muted { color: var(--color-muted); }

  .field input[type=text],
  .field input[type=number],
  .field textarea {
    padding: .575rem .875rem; border: 1px solid var(--color-border); border-radius: .6rem;
    background: var(--color-bg); color: var(--color-text); font-size: .875rem;
    font-family: inherit; outline: none; width: 100%; box-sizing: border-box; resize: vertical;
    transition: border-color .15s, box-shadow .15s;
  }
  .field input:focus, .field textarea:focus { border-color: var(--lc-600); box-shadow: 0 0 0 3px var(--lc-soft); }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }

  /* ── Count badge ─────────────────────────────────────────────────────────── */
  .count-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 .35rem; background: var(--lc-600); color: white; border-radius: 999px; font-size: .65rem; font-weight: 800; }

  /* ── Dropdown ────────────────────────────────────────────────────────────── */
  .dd-wrap { position: relative; width: 100%; z-index: 10; }
  .dd-wrap:has(.dd-panel) { z-index: 1000; }
  .dd-trigger { width: 100%; display: flex; align-items: center; gap: .5rem; padding: .575rem .875rem; border: 1px solid var(--color-border); border-radius: .6rem; background: var(--color-bg); color: var(--color-text); font-size: .875rem; font-family: inherit; cursor: pointer; text-align: left; outline: none; min-height: 38px; transition: border-color .15s, box-shadow .15s; }
  .dd-trigger:hover { border-color: rgba(79,70,229,.5); }
  .dd-trigger.open, .dd-trigger.has-val { border-color: var(--lc-600); }
  .dd-trigger.open { box-shadow: 0 0 0 3px var(--lc-soft); border-radius: .6rem .6rem 0 0; }
  .dd-placeholder { color: var(--color-muted); flex: 1; font-size: .85rem; }
  .dd-val { flex: 1; font-size: .85rem; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .dd-badge { flex-shrink: 0; font-size: .7rem; font-weight: 800; background: var(--lc-soft); color: var(--lc-600); padding: .1rem .45rem; border-radius: .3rem; }
  :global(.dd-chevron) { margin-left: auto; flex-shrink: 0; color: var(--color-muted); transition: transform .18s; }
  .dd-trigger.open :global(.dd-chevron) { transform: rotate(180deg); }
  .dd-panel { position: absolute; top: 100%; left: 0; right: 0; background: var(--color-surface); border: 1px solid var(--lc-600); border-top: none; border-radius: 0 0 .75rem .75rem; box-shadow: 0 8px 24px rgba(0,0,0,.12); z-index: 1000; overflow: hidden; animation: panelIn .1s ease; }
  @keyframes panelIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
  .dd-search { display: flex; align-items: center; gap: .5rem; padding: .55rem .875rem; border-bottom: 1px solid var(--color-border); color: var(--color-muted); }
  .dd-search input { flex: 1; background: none; border: none; outline: none; font-size: .82rem; color: var(--color-text); font-family: inherit; }
  .dd-list { max-height: 210px; overflow-y: auto; padding: .3rem; }
  .dd-list::-webkit-scrollbar { width: 3px; }
  .dd-list::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }
  .dd-item { width: 100%; display: flex; align-items: center; gap: .5rem; padding: .5rem .75rem; border-radius: .45rem; background: none; border: none; cursor: pointer; text-align: left; font-family: inherit; transition: background .1s; }
  .dd-item:hover { background: var(--lc-soft); }
  .dd-item.active { background: rgba(79,70,229,.1); }
  .item-code { font-size: .7rem; font-weight: 800; color: var(--lc-600); background: var(--lc-soft); padding: .1rem .4rem; border-radius: .3rem; white-space: nowrap; flex-shrink: 0; }
  .item-label { font-size: .83rem; color: var(--color-text); flex: 1; }
  :global(.item-check) { color: var(--lc-600); flex-shrink: 0; margin-left: auto; }
  .dd-empty { text-align: center; padding: 1.25rem; font-size: .82rem; color: var(--color-muted); }
  .dd-trigger.multi { flex-wrap: wrap; height: auto; }

  /* ── Tags ────────────────────────────────────────────────────────────────── */
  .tag-row { display: flex; flex-wrap: wrap; gap: .35rem; flex: 1; }
  .tag { display: inline-flex; align-items: center; gap: .25rem; font-size: .72rem; font-weight: 700; padding: .25rem .35rem .25rem .5rem; background: var(--lc-soft); color: var(--lc-600); border-radius: .35rem; white-space: nowrap; border: 1.5px solid transparent; transition: border-color .15s; }
  .tag:hover { border-color: rgba(79,70,229,.3); }
  .tag-x { background: none; border: none; cursor: pointer; color: var(--lc-600); display: flex; align-items: center; padding: .1rem; border-radius: .2rem; opacity: .6; transition: all .15s; }
  .tag-x:hover { opacity: 1; background: rgba(79,70,229,.15); }

  /* ── DateTime ────────────────────────────────────────────────────────────── */
  :global(.dt-cal-icon) { flex-shrink: 0; color: var(--lc-600); }
  .dt-panel { width: 290px; min-width: unset; }
  .cal-nav { display: flex; align-items: center; justify-content: space-between; padding: .7rem .875rem; border-bottom: 1px solid var(--color-border); }
  .cal-arr { background: none; border: none; cursor: pointer; font-size: 1.1rem; padding: .2rem .45rem; border-radius: .35rem; color: var(--color-text); transition: background .1s; }
  .cal-arr:hover { background: var(--lc-soft); color: var(--lc-600); }
  .cal-month-lbl { font-size: .83rem; font-weight: 700; color: var(--color-text); }
  .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; padding: .625rem; }
  .cal-dn { text-align: center; font-size: .64rem; font-weight: 700; color: var(--color-muted); padding: .15rem 0; text-transform: uppercase; }
  .cal-day { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border-radius: .375rem; background: none; border: none; font-size: .78rem; cursor: pointer; color: var(--color-text); transition: all .1s; font-family: inherit; }
  .cal-day:hover { background: var(--lc-soft); color: var(--lc-600); }
  .cal-day.today { color: var(--lc-600); font-weight: 800; }
  .cal-day.selected { background: var(--lc-600); color: white; font-weight: 700; }
  .cal-day.disabled { opacity: 0.35; cursor: not-allowed; pointer-events: none; }
  .time-row { display: flex; align-items: center; gap: .5rem; padding: .55rem .875rem; border-top: 1px solid var(--color-border); color: var(--color-muted); }
  .time-sel { flex: 1; padding: .3rem .5rem; border: 1px solid var(--color-border); border-radius: .4rem; background: var(--color-bg); color: var(--color-text); font-size: .8rem; font-family: inherit; outline: none; cursor: pointer; }
  .time-sel:focus { border-color: var(--lc-600); }
  .dt-done-btn { padding: .3rem .75rem; background: var(--lc-600); color: white; border: none; border-radius: .4rem; font-size: .75rem; font-weight: 700; cursor: pointer; }

  /* ── Scope ───────────────────────────────────────────────────────────────── */
  .scope-section { display: flex; flex-direction: column; gap: .7rem; }
  .scope-row { display: flex; align-items: center; justify-content: space-between; gap: .5rem; }
  .scope-label-group { display: flex; align-items: center; gap: .4rem; font-size: .8rem; font-weight: 600; color: var(--color-text); }
  .pill-btn { font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; padding: .22rem .6rem; border-radius: 999px; border: 1.5px solid var(--color-border); background: none; color: var(--color-muted); cursor: pointer; transition: all .15s; }
  .pill-btn:hover { border-color: var(--lc-600); color: var(--lc-600); }
  .pill-btn.active { background: var(--lc-600); border-color: var(--lc-600); color: white; }
  .level-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: .45rem; }
  .level-chip { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .05rem; padding: .65rem .5rem; border-radius: .6rem; border: 1.5px solid var(--color-border); background: var(--color-bg); cursor: pointer; transition: all .15s; font-family: inherit; position: relative; }
  .level-chip:hover { border-color: rgba(79,70,229,.5); background: var(--lc-soft); }
  .level-chip.selected { border-color: var(--lc-600); background: rgba(79,70,229,.08); }
  .level-num { font-size: 1.15rem; font-weight: 900; color: var(--color-text); line-height: 1; }
  .level-chip.selected .level-num { color: var(--lc-600); }
  .level-lbl { font-size: .6rem; font-weight: 600; color: var(--color-muted); text-transform: uppercase; letter-spacing: .05em; }
  .level-check { position: absolute; top: 5px; right: 6px; color: var(--lc-600); display: flex; }
  .scope-note { font-size: .75rem; color: var(--color-muted); padding: .5rem .75rem; background: var(--color-bg); border-radius: .5rem; border: 1px solid var(--color-border); line-height: 1.5; transition: all .2s; }
  .scope-note.active { color: var(--lc-600); background: rgba(79,70,229,.05); border-color: rgba(79,70,229,.25); }
  .divider { height: 1px; background: var(--color-border); margin: .25rem 0; }

  /* ── Score ───────────────────────────────────────────────────────────────── */
  .score-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
  .score-field { display: flex; flex-direction: column; gap: .35rem; }
  .score-field label { font-size: .78rem; font-weight: 600; color: var(--color-muted); display: flex; align-items: center; gap: .3rem; }
  .score-input-wrap { position: relative; }
  .score-input-wrap input { width: 100%; padding: .575rem 2rem .575rem .875rem; border: 1px solid var(--color-border); border-radius: .6rem; background: var(--color-bg); color: var(--color-text); font-size: 1rem; font-weight: 700; font-family: inherit; outline: none; box-sizing: border-box; transition: border-color .15s, box-shadow .15s; }
  .score-input-wrap input:focus { border-color: var(--lc-600); box-shadow: 0 0 0 3px var(--lc-soft); }
  .score-input-wrap input.input-warn  { border-color: #f59e0b; }
  .score-input-wrap input.input-error { border-color: #ef4444; }
  .score-unit { position: absolute; right: .75rem; top: 50%; transform: translateY(-50%); font-size: .72rem; font-weight: 700; color: var(--color-muted); pointer-events: none; }

  /* Exam Weight Display */
  .exam-weight-display {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: var(--color-bg);
    border: 2px solid var(--color-border);
    border-radius: 0.75rem;
    transition: border-color 0.15s;
  }
  .exam-weight-display.ca {
    border-color: rgba(79,70,229,0.3);
    background: rgba(79,70,229,0.05);
  }
  .exam-weight-value {
    font-size: 1.5rem;
    font-weight: 900;
    color: var(--lc-600);
    line-height: 1;
  }
  .exam-weight-display.ca .exam-weight-value {
    color: #7c3aed;
  }
  .exam-weight-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-muted);
  }
  .exam-weight-badge {
    font-size: 0.65rem;
    font-weight: 700;
    padding: 0.15rem 0.6rem;
    background: rgba(79,70,229,0.1);
    color: var(--lc-600);
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-left: auto;
  }
  .exam-weight-badge.ca {
    background: rgba(124,58,237,0.1);
    color: #7c3aed;
  }

  .total-display {
    grid-column: 1 / -1;
  }
  .total-display-value {
    font-size: 1.75rem;
    font-weight: 900;
    color: var(--color-text);
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, rgba(79,70,229,0.05), rgba(124,58,237,0.05));
    border: 2px solid rgba(79,70,229,0.15);
    border-radius: 0.75rem;
    text-align: center;
  }

  .pass-bar-wrap { display: flex; align-items: center; gap: .5rem; margin-top: .1rem; }
  .pass-bar-track { flex: 1; height: 4px; background: var(--color-border); border-radius: 2px; overflow: hidden; }
  .pass-bar-fill { height: 100%; border-radius: 2px; transition: width .3s ease, background .3s; }
  .bar-ok   { background: #4f46e5; }
  .bar-high { background: #f59e0b; }
  .bar-warn { background: #ef4444; }
  .pass-pct { font-size: .68rem; font-weight: 700; color: var(--color-muted); flex-shrink: 0; }

  .qtp-wrap { display: flex; flex-direction: column; gap: .5rem; padding: .875rem; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: .75rem; }
  .qtp-header { display: flex; align-items: center; justify-content: space-between; }
  .qtp-label-group { display: flex; align-items: center; gap: .35rem; font-size: .8rem; font-weight: 600; color: var(--color-text); }
  .qtp-row { display: flex; align-items: center; gap: .75rem; }
  .qtp-input-wrap { width: 100px; flex-shrink: 0; }
  .qtp-hint-bubble { flex: 1; font-size: .82rem; font-weight: 600; color: var(--color-muted); padding: .45rem .75rem; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: .5rem; line-height: 1.5; transition: all .2s; }
  .qtp-hint-bubble.active { color: var(--lc-600); background: rgba(79,70,229,.05); border-color: rgba(79,70,229,.25); }
  .qtp-hint-bubble strong { font-weight: 800; color: var(--color-text); }

  /* ── Toggles ─────────────────────────────────────────────────────────────── */
  .toggles { display: flex; flex-direction: column; }
  .toggle-row {
    display: flex; align-items: center; justify-content: space-between; gap: 1rem;
    padding: .875rem 1.25rem; cursor: pointer; border-bottom: 1px solid var(--color-border);
    transition: background .12s; user-select: none;
  }
  .toggle-row:last-child { border-bottom: none; }
  .toggle-row:hover { background: var(--lc-soft); }
  .toggle-text { display: flex; align-items: flex-start; gap: .625rem; }
  .toggle-icon-wrap { width: 28px; height: 28px; border-radius: .4rem; flex-shrink: 0; margin-top: .05rem; display: flex; align-items: center; justify-content: center; background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-muted); transition: all .15s; }
  .toggle-row:hover .toggle-icon-wrap { background: var(--lc-soft); color: var(--lc-600); border-color: rgba(79,70,229,.2); }
  .toggle-label { display: block; font-size: .83rem; font-weight: 600; color: var(--color-text); margin-bottom: .1rem; }
  .toggle-desc  { display: block; font-size: .73rem; color: var(--color-muted); transition: color .2s; }
  .toggle-track { position: relative; width: 40px; height: 22px; flex-shrink: 0; }
  .toggle-cb { position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none; }
  .toggle-knob { position: absolute; inset: 0; background: var(--color-border); border-radius: 999px; transition: background .2s; cursor: pointer; }
  .toggle-knob::after { content: ''; position: absolute; width: 16px; height: 16px; top: 3px; left: 3px; background: white; border-radius: 50%; transition: transform .2s; box-shadow: 0 1px 3px rgba(0,0,0,.2); }
  .toggle-track.on .toggle-knob { background: var(--lc-600); }
  .toggle-track.on .toggle-knob::after { transform: translateX(18px); }

  .late-entry-field { padding: .75rem 1.25rem 1rem; border-top: 1px solid var(--color-border); background: rgba(79,70,229,.03); }
  .late-entry-field label { font-size: .8rem; font-weight: 600; color: var(--color-text); display: block; margin-bottom: .5rem; }
  .late-row { display: flex; align-items: center; gap: .75rem; }
  .late-hint { font-size: .75rem; color: var(--lc-600); font-weight: 600; }

  /* ── Info box ────────────────────────────────────────────────────────────── */
  .info-box { display: flex; gap: .75rem; padding: 1rem 1.125rem; background: var(--lc-soft); border: 1px solid rgba(79,70,229,.2); border-radius: .875rem; }
  .info-dot { color: var(--lc-600); flex-shrink: 0; margin-top: .05rem; }
  .info-box strong { display: block; font-size: .82rem; font-weight: 700; color: var(--color-text); margin-bottom: .3rem; }
  .info-box p { font-size: .76rem; color: var(--color-muted); margin: 0; line-height: 1.55; }

  /* ── Summary ─────────────────────────────────────────────────────────────── */
  .summary-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: .875rem; overflow: hidden; }
  .summary-title { padding: .625rem 1rem; font-size: .72rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--color-muted); background: var(--color-bg); border-bottom: 1px solid var(--color-border); }
  .summary-rows { padding: .5rem; }
  .sum-row { display: flex; align-items: center; justify-content: space-between; padding: .4rem .5rem; border-radius: .4rem; gap: .5rem; }
  .sum-row:hover { background: var(--lc-soft); }
  .sum-row span:first-child { font-size: .77rem; color: var(--color-muted); }
  .sum-val { font-size: .77rem; font-weight: 600; color: var(--color-muted); text-align: right; transition: color .2s; }
  .sum-val-set { color: var(--color-text); }
  .sum-val-warn { color: #d97706 !important; }
  .sum-row-pulse { animation: rowPulse .65s ease; }
  @keyframes rowPulse { 0% { background: rgba(79,70,229,.15); } 100% { background: transparent; } }

  /* ── Buttons ─────────────────────────────────────────────────────────────── */
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: .4rem; padding: .625rem 1.125rem; border-radius: .65rem; font-size: .83rem; font-weight: 700; cursor: pointer; transition: all .15s; text-decoration: none; font-family: inherit; white-space: nowrap; }
  .btn.primary { background: var(--lc-600); border: 1px solid var(--lc-600); color: white; }
  .btn.primary:hover { background: var(--lc-700); border-color: var(--lc-700); }
  .btn.ghost { background: transparent; border: 1px solid var(--color-border); color: var(--color-text); }
  .btn.ghost:hover { border-color: var(--lc-600); color: var(--lc-600); }
  .form-footer { display: flex; flex-direction: column; gap: .5rem; }
  .form-footer .btn { width: 100%; }
  @media (min-width: 721px) { .form-footer { display: none; } }
  @media (max-width: 720px) { .header-actions { display: none; } }
  :global(.dark) .dd-panel { box-shadow: 0 8px 24px rgba(0,0,0,.4); }
  :global(.dark) .toggle-knob::after { background: #e5e5e5; }
</style>