<!-- src/routes/lecturer/exams/create/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import {
    ChevronLeft, BookOpen, Clock, Settings,
    AlertCircle, Info, Users, ChevronDown, Check,
    Calendar, Search, X, GraduationCap, Building2,
    FileText, Timer, BarChart3, ShieldAlert, Layers
  } from 'lucide-svelte';

  let { data, form }: { data: PageData & { departments: Array<{ id: string; name: string; code: string }> }; form: ActionData } = $props();

  // ── Levels ──────────────────────────────────────────────────────────────────
  const LEVELS = [100, 200, 300, 400, 500, 600] as const;
  let selectedLevels = $state<Set<number>>(new Set());
  let allLevels = $derived(selectedLevels.size === LEVELS.length);
  let questionsToPresent = $state(0);


  function toggleLevel(level: number) {
    const next = new Set(selectedLevels);
    next.has(level) ? next.delete(level) : next.add(level);
    selectedLevels = next;
  }
  function toggleAll() {
    selectedLevels = allLevels ? new Set() : new Set(LEVELS);
  }
  const levelsValue = $derived(
    allLevels ? 'all' : [...selectedLevels].sort((a, b) => a - b).join(',')
  );

  // ── Departments ──────────────────────────────────────────────────────────────
  const departments = data.departments;
  let selectedDepartments = $state<Set<string>>(new Set());
  let deptOpen = $state(false);
  let deptSearch = $state('');

  const filteredDepts = $derived(
    departments.filter(d =>
      d.name.toLowerCase().includes(deptSearch.toLowerCase()) ||
      d.code.toLowerCase().includes(deptSearch.toLowerCase())
    )
  );
  function toggleDept(id: string) {
    const next = new Set(selectedDepartments);
    next.has(id) ? next.delete(id) : next.add(id);
    selectedDepartments = next;
  }
  function removeDept(id: string) {
    const next = new Set(selectedDepartments);
    next.delete(id);
    selectedDepartments = next;
  }
  const departmentValue = $derived(
    [...selectedDepartments]
      .map(id => departments.find(d => d.id === id)?.name ?? '')
      .filter(Boolean).join(',')
  );

  // ── Course dropdown ──────────────────────────────────────────────────────────
  let selectedCourse = $state('');
  let courseOpen = $state(false);
  let courseSearch = $state('');
  const filteredCourses = $derived(
    data.courses.filter(c =>
      c.code.toLowerCase().includes(courseSearch.toLowerCase()) ||
      c.title.toLowerCase().includes(courseSearch.toLowerCase())
    )
  );
  const selectedCourseObj = $derived(data.courses.find(c => c.id === selectedCourse));

  // ── Semester dropdown ────────────────────────────────────────────────────────
  const SEMESTERS = [
    { value: '1', label: 'First Semester' },
    { value: '2', label: 'Second Semester' },
  ];
  let selectedSemester = $state('1');
  let semesterOpen = $state(false);
  const selectedSemesterLabel = $derived(
    SEMESTERS.find(s => s.value === selectedSemester)?.label ?? ''
  );

  // ── Questions to present ─────────────────────────────────────────────────────
  // 0 = present all questions (no limit)
  let questionsToPresent = $state(0);

  // ── DateTime picker ──────────────────────────────────────────────────────────
  let startDate = $state('');
  let startTime = $state('09:00');
  let endDate = $state('');
  let endTime = $state('11:00');
  let startOpen = $state(false);
  let endOpen = $state(false);

  let startCalYear = $state(new Date().getFullYear());
  let startCalMonth = $state(new Date().getMonth());
  let endCalYear = $state(new Date().getFullYear());
  let endCalMonth = $state(new Date().getMonth());

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DAY_NAMES = ['Su','Mo','Tu','We','Th','Fr','Sa'];

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

  function selectStartDay(day: number) { startDate = fmtDate(startCalYear, startCalMonth, day); }
  function selectEndDay(day: number)   { endDate   = fmtDate(endCalYear,   endCalMonth,   day); }
  const startValue = $derived(startDate ? `${startDate}T${startTime}` : '');
  const endValue   = $derived(endDate   ? `${endDate}T${endTime}`     : '');

  function fmtDisplay(date: string, time: string) {
    if (!date) return '';
    const [y, m, d] = date.split('-').map(Number);
    return `${MONTH_SHORT[m-1]} ${d}, ${y} · ${time}`;
  }

  const TIME_OPTIONS: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      TIME_OPTIONS.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
    }
  }

  // ── Click outside action ─────────────────────────────────────────────────────
  function clickOutside(node: HTMLElement, handler: () => void) {
    function handle(e: MouseEvent) {
      if (!node.contains(e.target as Node)) handler();
    }
    document.addEventListener('mousedown', handle, true);
    return { destroy() { document.removeEventListener('mousedown', handle, true); } };
  }

  function openCourse()   { courseOpen = true;   deptOpen = false; semesterOpen = false; startOpen = false; endOpen = false; }
  function openDept()     { deptOpen = true;     courseOpen = false; semesterOpen = false; startOpen = false; endOpen = false; }
  function openSemester() { semesterOpen = true; courseOpen = false; deptOpen = false; startOpen = false; endOpen = false; }
  function openStart()    { startOpen = true;    endOpen = false; courseOpen = false; deptOpen = false; semesterOpen = false; }
  function openEnd()      { endOpen = true;      startOpen = false; courseOpen = false; deptOpen = false; semesterOpen = false; }
</script>

<svelte:head><title>Create Exam — MOUAU eTest</title></svelte:head>

<div class="page">

  <!-- Page header -->
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
          Create Exam &amp; Add Questions →
        </button>
      </div>
    </div>
  </div>

  {#if form?.error}
    <div class="alert-error">
      <AlertCircle size={15} /> {form.error}
    </div>
  {/if}

  <form method="POST" id="exam-form" class="exam-grid">

    <!-- ══ COLUMN 1: Basic + Scope ═══════════════════════════════════════════ -->
    <div class="col">

      <!-- Basic Info Card -->
      <div class="card">
        <div class="card-header">
          <span class="card-icon"><BookOpen size={16} strokeWidth={2} /></span>
          <div>
            <h2>Basic Information</h2>
            <p>Name the exam and link it to a course</p>
          </div>
        </div>
        <div class="card-body">

          <div class="field">
            <label for="title">Exam Title <span class="req">*</span></label>
            <input
              id="title" name="title" type="text" required
              placeholder="e.g. CSC301 First Semester Examination 2025/2026"
            />
          </div>

          <!-- Course dropdown -->
          <div class="field">
            <label>Course <span class="req">*</span></label>
            <input type="hidden" name="course_id" value={selectedCourse} />
            <div class="dd-wrap" use:clickOutside={() => { courseOpen = false; courseSearch = ''; }}>
              <button
                type="button" class="dd-trigger" class:open={courseOpen}
                onclick={() => courseOpen ? (courseOpen = false) : openCourse()}
              >
                {#if selectedCourseObj}
                  <span class="dd-badge">{selectedCourseObj.code}</span>
                  <span class="dd-val">{selectedCourseObj.title}</span>
                {:else}
                  <span class="dd-placeholder">Select a course…</span>
                {/if}
                <ChevronDown size={15} class="dd-chevron" />
              </button>
              {#if courseOpen}
                <div class="dd-panel">
                  <div class="dd-search">
                    <Search size={13} />
                    <input type="text" placeholder="Search by code or name…" bind:value={courseSearch} autofocus />
                  </div>
                  <div class="dd-list">
                    {#if filteredCourses.length === 0}
                      <div class="dd-empty">No courses found</div>
                    {:else}
                      {#each filteredCourses as c}
                        <button
                          type="button" class="dd-item" class:active={selectedCourse === c.id}
                          onclick={() => { selectedCourse = c.id; courseOpen = false; courseSearch = ''; }}
                        >
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
          </div>

          <div class="field">
            <label for="instructions">Instructions <span class="opt">Optional</span></label>
            <textarea
              id="instructions" name="instructions" rows="3"
              placeholder="Answer all questions. No external resources allowed. Time shown is exam time."
            ></textarea>
          </div>

        </div>
      </div>

      <!-- Exam Scope Card -->
      <div class="card">
        <div class="card-header">
          <span class="card-icon"><Users size={16} strokeWidth={2} /></span>
          <div>
            <h2>Exam Scope</h2>
            <p>Define which students may sit this exam</p>
          </div>
        </div>
        <div class="card-body">

          <!-- Levels -->
          <div class="scope-section">
            <div class="scope-row">
              <div class="scope-label-group">
                <GraduationCap size={14} />
                <span>Student Levels</span>
              </div>
              <button
                type="button" class="pill-btn" class:active={allLevels} onclick={toggleAll}
              >{allLevels ? '✓ All Selected' : 'Select All'}</button>
            </div>
            <div class="level-grid">
              {#each LEVELS as level}
                <button
                  type="button" class="level-chip" class:selected={selectedLevels.has(level)}
                  onclick={() => toggleLevel(level)} aria-pressed={selectedLevels.has(level)}
                >
                  <span class="level-num">{level}</span>
                  <span class="level-lbl">Level</span>
                  {#if selectedLevels.has(level)}
                    <span class="level-check"><Check size={10} strokeWidth={3} /></span>
                  {/if}
                </button>
              {/each}
            </div>
            <div class="scope-note" class:active={selectedLevels.size > 0 || allLevels}>
              {allLevels
                ? '✓ All levels (100–600) can sit this exam.'
                : selectedLevels.size > 0
                  ? `✓ ${[...selectedLevels].sort((a,b)=>a-b).map(l=>l+'L').join(', ')} students eligible.`
                  : 'No level selected — all levels will be allowed by default.'}
            </div>
            <input type="hidden" name="levels" value={levelsValue} />
          </div>

          <div class="divider"></div>

          <!-- Departments -->
          <div class="scope-section">
            <div class="scope-row">
              <div class="scope-label-group">
                <Building2 size={14} />
                <span>Departments</span>
              </div>
              <span class="opt-badge">Optional</span>
            </div>
            <input type="hidden" name="department" value={departmentValue} />
            <div class="dd-wrap" use:clickOutside={() => { deptOpen = false; deptSearch = ''; }}>
              <button
                type="button" class="dd-trigger multi" class:open={deptOpen}
                onclick={() => deptOpen ? (deptOpen = false) : openDept()}
              >
                {#if selectedDepartments.size === 0}
                  <span class="dd-placeholder">All departments (no restriction)…</span>
                {:else}
                  <div class="tag-row">
                    {#each [...selectedDepartments] as id}
                      {@const d = departments.find(x => x.id === id)}
                      {#if d}
                        <span class="tag">
                          {d.code}
                          <button type="button" class="tag-x"
                            onclick={(e) => { e.stopPropagation(); removeDept(id); }}
                          ><X size={9} strokeWidth={3} /></button>
                        </span>
                      {/if}
                    {/each}
                  </div>
                {/if}
                <ChevronDown size={15} class="dd-chevron" />
              </button>
              {#if deptOpen}
                <div class="dd-panel">
                  <div class="dd-search">
                    <Search size={13} />
                    <input type="text" placeholder="Search departments…" bind:value={deptSearch} autofocus />
                  </div>
                  <div class="dd-list">
                    {#if filteredDepts.length === 0}
                      <div class="dd-empty">No departments found</div>
                    {:else}
                      {#each filteredDepts as d}
                        <button
                          type="button" class="dd-item" class:active={selectedDepartments.has(d.id)}
                          onclick={() => toggleDept(d.id)}
                        >
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

    <!-- ══ COLUMN 2: Timing + Scoring ════════════════════════════════════════ -->
    <div class="col">

      <!-- Timing Card -->
      <div class="card">
        <div class="card-header">
          <span class="card-icon"><Clock size={16} strokeWidth={2} /></span>
          <div>
            <h2>Schedule &amp; Timing</h2>
            <p>Set when the exam runs and how long students have</p>
          </div>
        </div>
        <div class="card-body">

          <input type="hidden" name="scheduled_start" value={startValue} />
          <input type="hidden" name="scheduled_end"   value={endValue}   />

          <!-- Scheduled Start -->
          <div class="field">
            <label>Scheduled Start</label>
            <div class="dd-wrap" use:clickOutside={() => startOpen = false}>
              <button
                type="button" class="dd-trigger" class:open={startOpen} class:has-val={!!startDate}
                onclick={() => startOpen ? (startOpen = false) : openStart()}
              >
                <Calendar size={14} class="dt-cal-icon" />
                {#if startDate}
                  <span class="dd-val">{fmtDisplay(startDate, startTime)}</span>
                {:else}
                  <span class="dd-placeholder">Pick date &amp; time…</span>
                {/if}
                <ChevronDown size={15} class="dd-chevron" />
              </button>
              {#if startOpen}
                <div class="dd-panel dt-panel">
                  <div class="cal-nav">
                    <button type="button" class="cal-arr"
                      onclick={() => { if (startCalMonth === 0) { startCalMonth = 11; startCalYear--; } else startCalMonth--; }}>‹</button>
                    <span class="cal-month-lbl">{MONTH_NAMES[startCalMonth]} {startCalYear}</span>
                    <button type="button" class="cal-arr"
                      onclick={() => { if (startCalMonth === 11) { startCalMonth = 0; startCalYear++; } else startCalMonth++; }}>›</button>
                  </div>
                  <div class="cal-grid">
                    {#each DAY_NAMES as dn}<span class="cal-dn">{dn}</span>{/each}
                    {#each calDays(startCalYear, startCalMonth) as day}
                      {#if day === null}<span></span>
                      {:else}
                        <button type="button" class="cal-day"
                          class:today={fmtDate(startCalYear, startCalMonth, day) === todayStr}
                          class:selected={startDate === fmtDate(startCalYear, startCalMonth, day)}
                          onclick={() => selectStartDay(day)}
                        >{day}</button>
                      {/if}
                    {/each}
                  </div>
                  <div class="time-row">
                    <Clock size={13} />
                    <select class="time-sel" bind:value={startTime}>
                      {#each TIME_OPTIONS as t}<option value={t}>{t}</option>{/each}
                    </select>
                    {#if startDate}
                      <button type="button" class="dt-done-btn" onclick={() => startOpen = false}>Done</button>
                    {/if}
                  </div>
                </div>
              {/if}
            </div>
          </div>

          <!-- Scheduled End -->
          <div class="field">
            <label>Scheduled End</label>
            <div class="dd-wrap" use:clickOutside={() => endOpen = false}>
              <button
                type="button" class="dd-trigger" class:open={endOpen} class:has-val={!!endDate}
                onclick={() => endOpen ? (endOpen = false) : openEnd()}
              >
                <Calendar size={14} class="dt-cal-icon" />
                {#if endDate}
                  <span class="dd-val">{fmtDisplay(endDate, endTime)}</span>
                {:else}
                  <span class="dd-placeholder">Pick date &amp; time…</span>
                {/if}
                <ChevronDown size={15} class="dd-chevron" />
              </button>
              {#if endOpen}
                <div class="dd-panel dt-panel">
                  <div class="cal-nav">
                    <button type="button" class="cal-arr"
                      onclick={() => { if (endCalMonth === 0) { endCalMonth = 11; endCalYear--; } else endCalMonth--; }}>‹</button>
                    <span class="cal-month-lbl">{MONTH_NAMES[endCalMonth]} {endCalYear}</span>
                    <button type="button" class="cal-arr"
                      onclick={() => { if (endCalMonth === 11) { endCalMonth = 0; endCalYear++; } else endCalMonth++; }}>›</button>
                  </div>
                  <div class="cal-grid">
                    {#each DAY_NAMES as dn}<span class="cal-dn">{dn}</span>{/each}
                    {#each calDays(endCalYear, endCalMonth) as day}
                      {#if day === null}<span></span>
                      {:else}
                        <button type="button" class="cal-day"
                          class:today={fmtDate(endCalYear, endCalMonth, day) === todayStr}
                          class:selected={endDate === fmtDate(endCalYear, endCalMonth, day)}
                          onclick={() => selectEndDay(day)}
                        >{day}</button>
                      {/if}
                    {/each}
                  </div>
                  <div class="time-row">
                    <Clock size={13} />
                    <select class="time-sel" bind:value={endTime}>
                      {#each TIME_OPTIONS as t}<option value={t}>{t}</option>{/each}
                    </select>
                    {#if endDate}
                      <button type="button" class="dt-done-btn" onclick={() => endOpen = false}>Done</button>
                    {/if}
                  </div>
                </div>
              {/if}
            </div>
          </div>

          <!-- Session + Semester row -->
          <div class="two-col">
            <div class="field">
              <label for="session">Academic Session <span class="req">*</span></label>
              <input id="session" name="session" type="text" value="2025/2026" required placeholder="2024/2025" />
            </div>
            <div class="field">
              <label>Semester <span class="req">*</span></label>
              <input type="hidden" name="semester" value={selectedSemester} />
              <div class="dd-wrap" use:clickOutside={() => semesterOpen = false}>
                <button
                  type="button" class="dd-trigger" class:open={semesterOpen} class:has-val={true}
                  onclick={() => semesterOpen ? (semesterOpen = false) : openSemester()}
                >
                  <span class="dd-val">{selectedSemesterLabel}</span>
                  <ChevronDown size={15} class="dd-chevron" />
                </button>
                {#if semesterOpen}
                  <div class="dd-panel">
                    <div class="dd-list">
                      {#each SEMESTERS as s}
                        <button
                          type="button" class="dd-item" class:active={selectedSemester === s.value}
                          onclick={() => { selectedSemester = s.value; semesterOpen = false; }}
                        >
                          <span class="item-label">{s.label}</span>
                          {#if selectedSemester === s.value}<Check size={13} class="item-check" />{/if}
                        </button>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Scoring Card -->
      <div class="card">
        <div class="card-header">
          <span class="card-icon"><BarChart3 size={16} strokeWidth={2} /></span>
          <div>
            <h2>Scoring</h2>
            <p>Marks, pass threshold and duration</p>
          </div>
        </div>
        <div class="card-body">
          <div class="score-grid">
            <div class="score-field">
              <label for="duration_minutes">
                <Timer size={13} strokeWidth={2} /> Duration
              </label>
              <div class="score-input-wrap">
                <input id="duration_minutes" name="duration_minutes" type="number" value="60" min="5" max="300" required />
                <span class="score-unit">min</span>
              </div>
            </div>
            <div class="score-field">
              <label for="total_marks">
                <FileText size={13} strokeWidth={2} /> Total Marks
              </label>
              <div class="score-input-wrap">
                <input id="total_marks" name="total_marks" type="number" value="100" min="1" required />
                <span class="score-unit">pts</span>
              </div>
            </div>
            <div class="score-field">
              <label for="pass_mark">
                <Check size={13} strokeWidth={2.5} /> Pass Mark
              </label>
              <div class="score-input-wrap">
                <input id="pass_mark" name="pass_mark" type="number" value="40" min="1" required />
                <span class="score-unit">pts</span>
              </div>
            </div>
           <div class="score-field">
              <label for="max_violations">
                <ShieldAlert size={13} strokeWidth={2} /> Max Violations
              </label>
              <div class="score-input-wrap">
                <input id="max_violations" name="max_violations" type="number" value="5" min="1" max="20" />
                <span class="score-unit">×</span>
              </div>
            </div>
            <!-- NEW -->
            <div class="score-field" style="grid-column: 1 / -1;">
              <label for="questions_to_present">
                <Layers size={13} strokeWidth={2} /> Questions to Present
              </label>
              <div class="score-input-wrap">
                <input
                  id="questions_to_present"
                  name="questions_to_present"
                  type="number"
                  bind:value={questionsToPresent}
                  min="0"
                  max="999"
                  placeholder="0"
                />
                <span class="score-unit">qs</span>
              </div>
              <p class="field-hint" style="margin-top: 0.25rem;">
                {questionsToPresent > 0
                  ? `Each student receives ${questionsToPresent} question${questionsToPresent !== 1 ? 's' : ''} drawn from the full pool.`
                  : 'Set to 0 to present all questions in the pool.'}
              </p>
            </div>
          </div>
          </div>

          <!-- ── Questions to present ─────────────────────────────────────── -->
          <div class="qtp-wrap">
            <div class="qtp-header">
              <div class="qtp-label-group">
                <Layers size={14} />
                <span>Questions Per Student</span>
              </div>
              <span class="opt-badge">Optional</span>
            </div>

            <div class="qtp-row">
              <div class="score-input-wrap qtp-input-wrap">
                <input
                  id="questions_to_present"
                  name="questions_to_present"
                  type="number"
                  min="0"
                  bind:value={questionsToPresent}
                  placeholder="0"
                />
                <span class="score-unit">Qs</span>
              </div>
              <div class="qtp-hint-bubble" class:active={questionsToPresent > 0}>
                {#if questionsToPresent > 0}
                  Each student gets <strong>{questionsToPresent}</strong> random questions from the pool
                {:else}
                  <span class="muted">0 = present all questions</span>
                {/if}
              </div>
            </div>

            <p class="field-hint">
              Set to 0 to present every question. Set e.g. 40 to randomly sample 40 from your full question pool — each student gets a different subset.
            </p>
          </div>
          <!-- ──────────────────────────────────────────────────────────────── -->

        </div>
      </div>

    </div>

    <!-- ══ COLUMN 3: Options + Info ══════════════════════════════════════════ -->
    <div class="col">

      <!-- Options Card -->
      <div class="card">
        <div class="card-header">
          <span class="card-icon"><Settings size={16} strokeWidth={2} /></span>
          <div>
            <h2>Exam Options</h2>
            <p>Behaviour and results settings</p>
          </div>
        </div>
        <div class="toggles">
          <label class="toggle-row">
            <div>
              <span class="toggle-label">Randomize Questions</span>
              <span class="toggle-desc">Shuffle question order per student</span>
            </div>
            <div class="toggle-track">
              <input type="checkbox" name="randomize_questions" checked class="toggle-cb" />
              <span class="toggle-knob"></span>
            </div>
          </label>
          <label class="toggle-row">
            <div>
              <span class="toggle-label">Randomize Options</span>
              <span class="toggle-desc">Shuffle MCQ choices per student</span>
            </div>
            <div class="toggle-track">
              <input type="checkbox" name="randomize_options" checked class="toggle-cb" />
              <span class="toggle-knob"></span>
            </div>
          </label>
          <label class="toggle-row">
            <div>
              <span class="toggle-label">Show Result Immediately</span>
              <span class="toggle-desc">Display score after submission</span>
            </div>
            <div class="toggle-track">
              <input type="checkbox" name="show_result_after" class="toggle-cb" />
              <span class="toggle-knob"></span>
            </div>
          </label>
        </div>
      </div>

      <!-- Info card -->
      <div class="info-box">
        <div class="info-dot"><Info size={15} /></div>
        <div>
          <strong>Next: Question Builder</strong>
          <p>After creating the exam you'll be redirected to add MCQ and fill-in-the-blank questions with marks per question.</p>
        </div>
      </div>

      <!-- Configuration preview -->
      <div class="summary-card">
        <div class="summary-title">Configuration Preview</div>
        <div class="summary-rows">
          <div class="sum-row">
            <span>Course</span>
            <span class="sum-val">{selectedCourseObj ? selectedCourseObj.code : '—'}</span>
          </div>
          <div class="sum-row">
            <span>Eligible Levels</span>
            <span class="sum-val">
              {allLevels ? 'All' : selectedLevels.size > 0 ? [...selectedLevels].sort((a,b)=>a-b).join(', ') : 'All'}
            </span>
          </div>
          <div class="sum-row">
            <span>Departments</span>
            <span class="sum-val">
              {selectedDepartments.size === 0 ? 'All' : selectedDepartments.size + ' selected'}
            </span>
          </div>
          <div class="sum-row">
            <span>Semester</span>
            <span class="sum-val">{selectedSemesterLabel}</span>
          </div>
          <div class="sum-row">
            <span>Start</span>
            <span class="sum-val">{startDate ? fmtDisplay(startDate, startTime) : '—'}</span>
          </div>
          <div class="sum-row">
            <span>End</span>
            <span class="sum-val">{endDate ? fmtDisplay(endDate, endTime) : '—'}</span>
          </div>
          <!-- ── Questions to present preview row ── -->
        <div class="sum-row">
            <span>Pool size</span>
            <span class="sum-val">
              {questionsToPresent > 0 ? questionsToPresent + ' / pool' : 'All questions'}
            </span>
          </div>
        </div>
      </div>

      <!-- Mobile submit -->
      <div class="form-footer">
        <a href="/lecturer" class="btn ghost">Cancel</a>
        <button type="submit" class="btn primary">Create Exam &amp; Add Questions →</button>
      </div>

    </div>

  </form>
</div>

<style>
  /* ── Root ─────────────────────────────────────────────────────────────── */
  .page { padding: 1.75rem 2rem 4rem; max-width: 1400px; margin: 0 auto; }

  /* ── Page header ──────────────────────────────────────────────────────── */
  .page-header { margin-bottom: 1.75rem; padding-bottom: 1.25rem; border-bottom: 1px solid var(--color-border); }
  .back-link { display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.75rem; font-weight: 600; color: var(--lc-600); text-decoration: none; margin-bottom: 0.875rem; transition: gap 0.12s; }
  .back-link:hover { gap: 0.4rem; }
  .page-header-main { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
  .page-header-main h1 { font-size: 1.85rem; font-weight: 900; letter-spacing: -0.04em; color: var(--color-text); margin: 0 0 0.2rem; line-height: 1; }
  .page-header-main > div > p { font-size: 0.82rem; color: var(--color-muted); margin: 0; }
  .header-actions { display: flex; gap: 0.625rem; align-items: center; flex-shrink: 0; }

  /* ── Alert ────────────────────────────────────────────────────────────── */
  .alert-error { display: flex; align-items: center; gap: 0.6rem; padding: 0.875rem 1rem; margin-bottom: 1.25rem; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25); border-radius: 0.75rem; font-size: 0.875rem; color: #dc2626; }

  /* ── Grid layout ──────────────────────────────────────────────────────── */
  .exam-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; align-items: start; }
  @media (max-width: 1100px) {
    .exam-grid { grid-template-columns: 1fr 1fr; }
    .col:nth-child(3) { grid-column: 1 / -1; display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
  }
  @media (max-width: 720px) {
    .exam-grid { grid-template-columns: 1fr; }
    .col:nth-child(3) { grid-column: auto; display: flex; flex-direction: column; }
  }

  .col { display: flex; flex-direction: column; gap: 1.25rem; animation: fadeUp 0.35s ease both; position: relative; z-index: 0; }
  .col:has(.dd-panel) { z-index: 100; }
  .col:nth-child(2) { animation-delay: 0.06s; }
  .col:nth-child(3) { animation-delay: 0.12s; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

  /* ── Cards ────────────────────────────────────────────────────────────── */
  .card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 1rem; overflow: visible; }
  .card-header { display: flex; align-items: flex-start; gap: 0.75rem; padding: 1rem 1.25rem 0.875rem; border-bottom: 1px solid var(--color-border); background: var(--color-bg); border-radius: 1rem 1rem 0 0; }
  .card-icon { width: 32px; height: 32px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: var(--lc-soft); border-radius: 0.5rem; color: var(--lc-600); }
  .card-header h2 { font-size: 0.85rem; font-weight: 700; color: var(--color-text); margin: 0 0 0.15rem; line-height: 1.2; }
  .card-header p { font-size: 0.73rem; color: var(--color-muted); margin: 0; }
  .card-body { padding: 1.125rem 1.25rem; display: flex; flex-direction: column; gap: 0.875rem; }

  /* ── Fields ───────────────────────────────────────────────────────────── */
  .field { display: flex; flex-direction: column; gap: 0.35rem; }
  .field label { font-size: 0.8rem; font-weight: 600; color: var(--color-text); display: flex; align-items: center; gap: 0.3rem; }
  .req { color: #ef4444; }
  .opt { font-size: 0.7rem; font-weight: 500; color: var(--color-muted); margin-left: 0.25rem; }
  .opt-badge { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-muted); background: var(--color-border); padding: 0.12rem 0.45rem; border-radius: 999px; }
  .field-hint { font-size: 0.72rem; color: var(--color-muted); line-height: 1.4; margin: 0; }
  .muted { color: var(--color-muted); }

  .field input[type=text],
  .field input[type=number],
  .field textarea {
    padding: 0.575rem 0.875rem; border: 1px solid var(--color-border); border-radius: 0.6rem;
    background: var(--color-bg); color: var(--color-text); font-size: 0.875rem;
    font-family: inherit; outline: none; width: 100%; box-sizing: border-box;
    resize: vertical; transition: border-color 0.15s, box-shadow 0.15s;
  }
  .field input[type=text]:focus,
  .field input[type=number]:focus,
  .field textarea:focus { border-color: var(--lc-600); box-shadow: 0 0 0 3px var(--lc-soft); }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }

  /* ── Dropdown system ──────────────────────────────────────────────────── */
  .dd-wrap { position: relative; width: 100%; z-index: 10; }
  .dd-wrap:has(.dd-panel) { z-index: 1000; }
  .dd-trigger { width: 100%; display: flex; align-items: center; gap: 0.5rem; padding: 0.575rem 0.875rem; border: 1px solid var(--color-border); border-radius: 0.6rem; background: var(--color-bg); color: var(--color-text); font-size: 0.875rem; font-family: inherit; cursor: pointer; text-align: left; outline: none; min-height: 38px; transition: border-color 0.15s, box-shadow 0.15s; }
  .dd-trigger:hover { border-color: rgba(79, 70, 229, 0.5); }
  .dd-trigger.open, .dd-trigger.has-val { border-color: var(--lc-600); }
  .dd-trigger.open { box-shadow: 0 0 0 3px var(--lc-soft); border-radius: 0.6rem 0.6rem 0 0; }
  .dd-placeholder { color: var(--color-muted); flex: 1; font-size: 0.85rem; }
  .dd-val { flex: 1; font-size: 0.85rem; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .dd-badge { flex-shrink: 0; font-size: 0.7rem; font-weight: 800; background: var(--lc-soft); color: var(--lc-600); padding: 0.1rem 0.45rem; border-radius: 0.3rem; }
  :global(.dd-chevron) { margin-left: auto; flex-shrink: 0; color: var(--color-muted); transition: transform 0.18s; }
  .dd-trigger.open :global(.dd-chevron) { transform: rotate(180deg); }
  .dd-panel { position: absolute; top: 100%; left: 0; right: 0; background: var(--color-surface); border: 1px solid var(--lc-600); border-top: none; border-radius: 0 0 0.75rem 0.75rem; box-shadow: 0 8px 24px rgba(0,0,0,0.12); z-index: 1000; overflow: hidden; animation: panelIn 0.12s ease; }
  @keyframes panelIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
  .dd-search { display: flex; align-items: center; gap: 0.5rem; padding: 0.55rem 0.875rem; border-bottom: 1px solid var(--color-border); color: var(--color-muted); }
  .dd-search input { flex: 1; background: none; border: none; outline: none; font-size: 0.82rem; color: var(--color-text); font-family: inherit; }
  .dd-list { max-height: 210px; overflow-y: auto; padding: 0.3rem; }
  .dd-list::-webkit-scrollbar { width: 3px; }
  .dd-list::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }
  .dd-item { width: 100%; display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; border-radius: 0.45rem; background: none; border: none; cursor: pointer; text-align: left; font-family: inherit; transition: background 0.1s; }
  .dd-item:hover { background: var(--lc-soft); }
  .dd-item.active { background: rgba(79, 70, 229, 0.1); }
  .item-code { font-size: 0.7rem; font-weight: 800; color: var(--lc-600); background: var(--lc-soft); padding: 0.1rem 0.4rem; border-radius: 0.3rem; white-space: nowrap; flex-shrink: 0; }
  .item-label { font-size: 0.83rem; color: var(--color-text); flex: 1; }
  :global(.item-check) { color: var(--lc-600); flex-shrink: 0; margin-left: auto; }
  .dd-empty { text-align: center; padding: 1.25rem; font-size: 0.82rem; color: var(--color-muted); }
  .dd-trigger.multi { flex-wrap: wrap; height: auto; align-items: center; }
  .tag-row { display: flex; flex-wrap: wrap; gap: 0.25rem; flex: 1; }
  .tag { display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.3rem 0.2rem 0.45rem; background: var(--lc-soft); color: var(--lc-600); border-radius: 0.3rem; white-space: nowrap; }
  .tag-x { background: none; border: none; cursor: pointer; color: var(--lc-600); display: flex; align-items: center; padding: 0; opacity: 0.6; transition: opacity 0.1s; }
  .tag-x:hover { opacity: 1; }

  /* ── DateTime picker ──────────────────────────────────────────────────── */
  :global(.dt-cal-icon) { flex-shrink: 0; color: var(--lc-600); }
  .dt-panel { width: 290px; min-width: unset; }
  .cal-nav { display: flex; align-items: center; justify-content: space-between; padding: 0.7rem 0.875rem; border-bottom: 1px solid var(--color-border); }
  .cal-arr { background: none; border: none; cursor: pointer; font-size: 1.1rem; padding: 0.2rem 0.45rem; border-radius: 0.35rem; color: var(--color-text); transition: background 0.1s; }
  .cal-arr:hover { background: var(--lc-soft); color: var(--lc-600); }
  .cal-month-lbl { font-size: 0.83rem; font-weight: 700; color: var(--color-text); }
  .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; padding: 0.625rem; }
  .cal-dn { text-align: center; font-size: 0.64rem; font-weight: 700; color: var(--color-muted); padding: 0.15rem 0; text-transform: uppercase; }
  .cal-day { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border-radius: 0.375rem; background: none; border: none; font-size: 0.78rem; cursor: pointer; color: var(--color-text); transition: all 0.1s; font-family: inherit; }
  .cal-day:hover { background: var(--lc-soft); color: var(--lc-600); }
  .cal-day.today { color: var(--lc-600); font-weight: 800; }
  .cal-day.selected { background: var(--lc-600); color: white; font-weight: 700; }
  .cal-day.selected.today { background: var(--lc-700); }
  .time-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.55rem 0.875rem; border-top: 1px solid var(--color-border); color: var(--color-muted); }
  .time-sel { flex: 1; padding: 0.3rem 0.5rem; border: 1px solid var(--color-border); border-radius: 0.4rem; background: var(--color-bg); color: var(--color-text); font-size: 0.8rem; font-family: inherit; outline: none; cursor: pointer; }
  .time-sel:focus { border-color: var(--lc-600); }
  .dt-done-btn { padding: 0.3rem 0.75rem; background: var(--lc-600); color: white; border: none; border-radius: 0.4rem; font-size: 0.75rem; font-weight: 700; cursor: pointer; }
  .dt-done-btn:hover { background: var(--lc-700); }

  /* ── Scope section ────────────────────────────────────────────────────── */
  .scope-section { display: flex; flex-direction: column; gap: 0.7rem; }
  .scope-row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
  .scope-label-group { display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; font-weight: 600; color: var(--color-text); }
  .pill-btn { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 0.22rem 0.6rem; border-radius: 999px; border: 1.5px solid var(--color-border); background: none; color: var(--color-muted); cursor: pointer; transition: all 0.15s; }
  .pill-btn:hover { border-color: var(--lc-600); color: var(--lc-600); }
  .pill-btn.active { background: var(--lc-600); border-color: var(--lc-600); color: white; }
  .level-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.45rem; }
  .level-chip { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.05rem; padding: 0.65rem 0.5rem; border-radius: 0.6rem; border: 1.5px solid var(--color-border); background: var(--color-bg); cursor: pointer; transition: all 0.15s; font-family: inherit; position: relative; }
  .level-chip:hover { border-color: rgba(79, 70, 229, 0.5); background: var(--lc-soft); }
  .level-chip.selected { border-color: var(--lc-600); background: rgba(79, 70, 229, 0.08); }
  .level-num { font-size: 1.15rem; font-weight: 900; color: var(--color-text); line-height: 1; font-variant-numeric: tabular-nums; }
  .level-chip.selected .level-num { color: var(--lc-600); }
  .level-lbl { font-size: 0.6rem; font-weight: 600; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .level-check { position: absolute; top: 5px; right: 6px; color: var(--lc-600); display: flex; }
  .scope-note { font-size: 0.75rem; color: var(--color-muted); padding: 0.5rem 0.75rem; background: var(--color-bg); border-radius: 0.5rem; border: 1px solid var(--color-border); line-height: 1.5; transition: all 0.2s; }
  .scope-note.active { color: var(--lc-600); background: rgba(79, 70, 229, 0.05); border-color: rgba(79, 70, 229, 0.25); }
  .divider { height: 1px; background: var(--color-border); margin: 0.25rem 0; }

  /* ── Score grid ───────────────────────────────────────────────────────── */
  .score-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
  .score-field { display: flex; flex-direction: column; gap: 0.35rem; }
  .score-field label { font-size: 0.78rem; font-weight: 600; color: var(--color-muted); display: flex; align-items: center; gap: 0.3rem; }
  .score-input-wrap { position: relative; }
  .score-input-wrap input { width: 100%; padding: 0.575rem 2rem 0.575rem 0.875rem; border: 1px solid var(--color-border); border-radius: 0.6rem; background: var(--color-bg); color: var(--color-text); font-size: 1rem; font-weight: 700; font-family: inherit; outline: none; box-sizing: border-box; transition: border-color 0.15s, box-shadow 0.15s; }
  .score-input-wrap input:focus { border-color: var(--lc-600); box-shadow: 0 0 0 3px var(--lc-soft); }
  .score-unit { position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); font-size: 0.72rem; font-weight: 700; color: var(--color-muted); pointer-events: none; }

  /* ── Questions to present ─────────────────────────────────────────────── */
  .qtp-wrap {
    display: flex; flex-direction: column; gap: 0.5rem;
    padding: 0.875rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
  }
  .qtp-header {
    display: flex; align-items: center; justify-content: space-between;
  }
  .qtp-label-group {
    display: flex; align-items: center; gap: 0.35rem;
    font-size: 0.8rem; font-weight: 600; color: var(--color-text);
  }
  .qtp-row {
    display: flex; align-items: center; gap: 0.75rem;
  }
  .qtp-input-wrap {
    width: 100px; flex-shrink: 0;
  }
  .qtp-hint-bubble {
    flex: 1; font-size: 0.75rem; color: var(--color-muted);
    padding: 0.45rem 0.75rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    line-height: 1.4;
    transition: all 0.2s;
  }
  .qtp-hint-bubble.active {
    color: var(--lc-600);
    background: rgba(79, 70, 229, 0.05);
    border-color: rgba(79, 70, 229, 0.25);
  }
  .qtp-hint-bubble strong { font-weight: 800; }

  /* ── Toggles ──────────────────────────────────────────────────────────── */
  .toggles { display: flex; flex-direction: column; }
  .toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.875rem 1.25rem; cursor: pointer; border-bottom: 1px solid var(--color-border); transition: background 0.12s; }
  .toggle-row:last-child { border-bottom: none; }
  .toggle-row:hover { background: var(--lc-soft); }
  .toggle-label { display: block; font-size: 0.83rem; font-weight: 600; color: var(--color-text); margin-bottom: 0.1rem; }
  .toggle-desc  { display: block; font-size: 0.73rem; color: var(--color-muted); }
  .toggle-track { position: relative; width: 40px; height: 22px; flex-shrink: 0; }
  .toggle-cb { position: absolute; opacity: 0; width: 0; height: 0; }
  .toggle-knob { position: absolute; inset: 0; background: var(--color-border); border-radius: 999px; transition: background 0.2s; cursor: pointer; }
  .toggle-knob::after { content: ''; position: absolute; width: 16px; height: 16px; top: 3px; left: 3px; background: white; border-radius: 50%; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
  .toggle-cb:checked + .toggle-knob { background: var(--lc-600); }
  .toggle-cb:checked + .toggle-knob::after { transform: translateX(18px); }

  /* ── Info box ─────────────────────────────────────────────────────────── */
  .info-box { display: flex; gap: 0.75rem; padding: 1rem 1.125rem; background: var(--lc-soft); border: 1px solid rgba(79, 70, 229, 0.2); border-radius: 0.875rem; }
  .info-dot { color: var(--lc-600); flex-shrink: 0; margin-top: 0.05rem; }
  .info-box strong { display: block; font-size: 0.82rem; font-weight: 700; color: var(--color-text); margin-bottom: 0.3rem; }
  .info-box p { font-size: 0.76rem; color: var(--color-muted); margin: 0; line-height: 1.55; }

  /* ── Summary card ─────────────────────────────────────────────────────── */
  .summary-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.875rem; overflow: hidden; }
  .summary-title { padding: 0.625rem 1rem; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-muted); background: var(--color-bg); border-bottom: 1px solid var(--color-border); }
  .summary-rows { padding: 0.5rem; }
  .sum-row { display: flex; align-items: center; justify-content: space-between; padding: 0.4rem 0.5rem; border-radius: 0.4rem; gap: 0.5rem; }
  .sum-row:hover { background: var(--lc-soft); }
  .sum-row span:first-child { font-size: 0.77rem; color: var(--color-muted); }
  .sum-val { font-size: 0.77rem; font-weight: 600; color: var(--color-text); text-align: right; }
  .sum-val-accent { color: var(--lc-600); }

  /* ── Buttons ──────────────────────────────────────────────────────────── */
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.625rem 1.125rem; border-radius: 0.65rem; font-size: 0.83rem; font-weight: 700; cursor: pointer; transition: all 0.15s; text-decoration: none; font-family: inherit; white-space: nowrap; }
  .btn.primary { background: var(--lc-600); border: 1px solid var(--lc-600); color: white; }
  .btn.primary:hover { background: var(--lc-700); border-color: var(--lc-700); }
  .btn.ghost { background: transparent; border: 1px solid var(--color-border); color: var(--color-text); }
  .btn.ghost:hover { border-color: var(--lc-600); color: var(--lc-600); }

  /* ── Footer ───────────────────────────────────────────────────────────── */
  .form-footer { display: flex; flex-direction: column; gap: 0.5rem; }
  .form-footer .btn { width: 100%; }
  @media (min-width: 721px) { .form-footer { display: none; } }
  @media (max-width: 720px) { .header-actions { display: none; } }

  /* ── Dark mode ────────────────────────────────────────────────────────── */
  :global(.dark) .dd-panel { box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
  :global(.dark) .level-chip.selected { background: rgba(79, 70, 229, 0.14); }
  :global(.dark) .scope-note.active { background: rgba(79, 70, 229, 0.1); }
  :global(.dark) .toggle-knob::after { background: #e5e5e5; }
</style>