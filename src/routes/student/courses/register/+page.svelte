<!-- src/routes/(student)/student/courses/register/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import {
    BookOpen, Plus, Trash2, CheckCircle2, AlertCircle,
    Clock, GraduationCap, Building2, Hash, Loader2,
    RefreshCw, ArrowRightLeft, AlertTriangle, Info,
    Search, X, ChevronDown, ChevronRight, Filter,
    LayoutGrid, List, School, Layers, CalendarDays,
  } from 'lucide-svelte';
  import { fly, slide } from 'svelte/transition';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type Tab = 'registered' | 'normal' | 'carryOver' | 'borrowed' | 'browse';
  let activeTab     = $state<Tab>('registered');
  let registeringId = $state<string | null>(null);
  let droppingId    = $state<string | null>(null);

  // Semester selection state (from URL or default to 1)
  const currentSemester = $derived(data.stats.currentSemester);

  function switchSemester(sem: 1 | 2) {
    const url = new URL($page.url);
    url.searchParams.set('semester', String(sem));
    goto(url.toString(), { replaceState: true, invalidateAll: true });
  }

  // Search/filter state
  let normalSearch    = $state('');
  let carrySearch     = $state('');
  let borrowSearch    = $state('');
  let browseSearch    = $state('');
  let normalDeptFilter  = $state('');
  let carryDeptFilter   = $state('');
  let carryLevelFilter  = $state<number | ''>('');
  let browseCollegeFilter = $state('');
  let browseDeptFilter    = $state('');
  let browseLevelFilter   = $state<number | ''>('');

  let groupByDept = $state(true);
  let browseView  = $state<'grid' | 'list'>('grid');

  const registeredIds = $derived(
    new Set(data.registrations.map(r => r.courseId))
  );

  const isRegistered = (courseId: string) => registeredIds.has(courseId);

  const creditPct = $derived(
    Math.min((data.stats.totalCreditUnits / data.stats.maxCreditUnits) * 100, 100)
  );
  const creditColor = $derived(
    creditPct >= 90 ? '#ef4444' : creditPct >= 75 ? '#f59e0b' : '#16a34a'
  );
  const canRegister = $derived(data.stats.totalCreditUnits < data.stats.maxCreditUnits);
  const canCarry    = $derived(data.stats.studentLevel >= 200 && data.stats.carryOverCount < data.stats.maxCarryOver);
  const canBorrow   = $derived(data.stats.borrowedCount < data.stats.maxBorrowed);

  const normalFiltered = $derived(() => {
    let list = data.available.normal as any[];
    if (normalDeptFilter) list = list.filter(c => c.department.id === normalDeptFilter);
    if (normalSearch.trim()) {
      const q = normalSearch.toLowerCase();
      list = list.filter(c => c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q));
    }
    return list;
  });

  const normalDepts = $derived(
    [...new Map((data.available.normal as any[]).map(c => [c.department.id, c.department])).values()]
  );

  const normalGrouped = $derived(() => {
    const groups: Record<string, { dept: any; courses: any[] }> = {};
    for (const c of normalFiltered()) {
      if (!groups[c.department.id]) groups[c.department.id] = { dept: c.department, courses: [] };
      groups[c.department.id].courses.push(c);
    }
    return Object.values(groups);
  });

  const carryFiltered = $derived(() => {
    let list = data.available.carryOver as any[];
    if (carryDeptFilter) list = list.filter(c => c.department.id === carryDeptFilter);
    if (carryLevelFilter !== '') list = list.filter(c => c.level === Number(carryLevelFilter));
    if (carrySearch.trim()) {
      const q = carrySearch.toLowerCase();
      list = list.filter(c => c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q));
    }
    return list;
  });

  const carryDepts = $derived(
    [...new Map((data.available.carryOver as any[]).map(c => [c.department.id, c.department])).values()]
  );

  const carryLevels = $derived(
    [...new Set((data.available.carryOver as any[]).map(c => c.level))].sort((a, b) => a - b)
  );

  const carryGrouped = $derived(() => {
    const groups: Record<string, { dept: any; courses: any[] }> = {};
    for (const c of carryFiltered()) {
      if (!groups[c.department.id]) groups[c.department.id] = { dept: c.department, courses: [] };
      groups[c.department.id].courses.push(c);
    }
    return Object.values(groups);
  });

  const borrowFiltered = $derived(() => {
    let list = data.available.borrowed as any[];
    if (borrowSearch.trim()) {
      const q = borrowSearch.toLowerCase();
      list = list.filter(c => c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) ||
        c.department.name.toLowerCase().includes(q) ||
        (c.department.college?.name ?? '').toLowerCase().includes(q));
    }
    return list;
  });

  const borrowGrouped = $derived(() => {
    const groups: Record<string, { college: any; courses: any[] }> = {};
    for (const c of borrowFiltered()) {
      const collegeId = c.department.college?.id ?? 'unknown';
      if (!groups[collegeId]) groups[collegeId] = { college: c.department.college, courses: [] };
      groups[collegeId].courses.push(c);
    }
    return Object.values(groups);
  });

  const browseFiltered = $derived(() => {
    let list = data.available.browseAll as any[];
    if (browseCollegeFilter) {
      list = list.filter(c => c.department.collegeId === browseCollegeFilter);
    }
    if (browseDeptFilter) {
      list = list.filter(c => c.department.id === browseDeptFilter);
    }
    if (browseLevelFilter !== '') {
      list = list.filter(c => c.level === Number(browseLevelFilter));
    }
    if (browseSearch.trim()) {
      const q = browseSearch.toLowerCase();
      list = list.filter(c =>
        c.code.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.department.name.toLowerCase().includes(q) ||
        (c.department.college?.name ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  });

  const browseColleges = $derived(
    [...new Map((data.available.browseAll as any[]).map(c => [c.department.collegeId, c.department.college])).values()]
      .filter(Boolean).sort((a: any, b: any) => a.name.localeCompare(b.name))
  );

  const browseDepts = $derived(() => {
    let list = data.available.browseAll as any[];
    if (browseCollegeFilter) list = list.filter(c => c.department.collegeId === browseCollegeFilter);
    return [...new Map(list.map(c => [c.department.id, c.department])).values()];
  });

  const browseLevels = $derived(
    [...new Set((data.available.browseAll as any[]).map(c => c.level))].filter(Boolean).sort((a, b) => a - b)
  );

  function inferRegType(course: any): { type: 'normal' | 'carry_over' | 'borrowed'; disabled: boolean; reason?: string } {
    if (isRegistered(course.id)) {
      return { type: 'normal', disabled: true, reason: 'Already registered' };
    }
    const sameCollege = course.department.collegeId === data.student.collegeId;
    if (sameCollege) {
      if (course.level === data.stats.studentLevel) {
        return { type: 'normal', disabled: !canRegister };
      }
      if (course.level < data.stats.studentLevel) {
        if (data.stats.studentLevel < 200) {
          return { type: 'carry_over', disabled: true, reason: 'Not available at 100 Level' };
        }
        return { type: 'carry_over', disabled: !canCarry || !canRegister };
      }
    } else {
      if (course.level !== data.stats.studentLevel) {
        return { type: 'borrowed', disabled: true, reason: 'Must be at your current level' };
      }
      return { type: 'borrowed', disabled: !canBorrow || !canRegister };
    }
    return { type: 'normal', disabled: true, reason: 'Cannot register' };
  }

  const regByType = $derived(() => {
    const normal    = (data.registrations as any[]).filter(r => r.registrationType === 'normal');
    const carryOver = (data.registrations as any[]).filter(r => r.registrationType === 'carry_over');
    const borrowed  = (data.registrations as any[]).filter(r => r.registrationType === 'borrowed');
    return { normal, carryOver, borrowed };
  });

  function setRegistering(id: string | null) {
    registeringId = id;
  }
</script>

<svelte:head><title>Course Registration — MOUAU eTest</title></svelte:head>

<div class="page">

  <div class="top-bar">
    <div class="top-bar-left">
      <div class="page-icon"><BookOpen size={20} /></div>
      <div>
        <h1>Course Registration</h1>
        <p class="meta">{data.stats.currentSession} · {data.stats.studentLevel} Level · {data.student.collegeName}</p>
      </div>
    </div>

    <!-- Semester Selector -->
    <div class="semester-picker">
      <span class="sem-label"><CalendarDays size={13} /> Semester</span>
      <div class="sem-toggle">
        <button class="sem-btn" class:active={currentSemester === 1} onclick={() => switchSemester(1)}>
          First
        </button>
        <button class="sem-btn" class:active={currentSemester === 2} onclick={() => switchSemester(2)}>
          Second
        </button>
      </div>
    </div>

    <div class="credit-gauge">
      <div class="gauge-top">
        <span class="gauge-label">Credits Used</span>
        <span class="gauge-value" style="color:{creditColor}">
          {data.stats.totalCreditUnits}<span class="gauge-max">/{data.stats.maxCreditUnits}</span>
        </span>
      </div>
      <div class="gauge-track">
        <div class="gauge-fill" style="width:{creditPct}%;background:{creditColor}"></div>
      </div>
      <div class="gauge-chips">
        <span class="g-chip" class:warn={data.stats.carryOverCount >= data.stats.maxCarryOver}>
          <RefreshCw size={11} /> {data.stats.carryOverCount}/{data.stats.maxCarryOver} carry-over
        </span>
        <span class="g-chip" class:warn={data.stats.borrowedCount >= data.stats.maxBorrowed}>
          <ArrowRightLeft size={11} /> {data.stats.borrowedCount}/{data.stats.maxBorrowed} borrowed
        </span>
      </div>
    </div>
  </div>

  {#if form?.message}
    <div class="alert" class:ok={form?.success} class:bad={!form?.success} transition:slide={{ duration: 180 }}>
      {#if form?.success}<CheckCircle2 size={15} />{:else}<AlertCircle size={15} />{/if}
      {form.message}
    </div>
  {/if}

  <nav class="tab-nav">
    <button class="tab" class:active={activeTab === 'registered'} onclick={() => activeTab = 'registered'}>
      <CheckCircle2 size={15} />
      <span>Registered</span>
      {#if data.registrations.length > 0}
        <span class="tab-pill registered-pill">{data.registrations.length}</span>
      {/if}
    </button>
    <button class="tab" class:active={activeTab === 'normal'} onclick={() => activeTab = 'normal'}>
      <BookOpen size={15} />
      <span>Normal</span>
      {#if data.available.normal.length > 0}
        <span class="tab-pill">{data.available.normal.length}</span>
      {/if}
    </button>
    {#if data.stats.studentLevel >= 200}
      <button class="tab" class:active={activeTab === 'carryOver'} onclick={() => activeTab = 'carryOver'}>
        <RefreshCw size={15} />
        <span>Carry-over</span>
        {#if data.available.carryOver.length > 0}
          <span class="tab-pill carry-pill">{data.available.carryOver.length}</span>
        {/if}
      </button>
    {/if}
    <button class="tab" class:active={activeTab === 'borrowed'} onclick={() => activeTab = 'borrowed'}>
      <ArrowRightLeft size={15} />
      <span>Borrowed</span>
      {#if data.available.borrowed.length > 0}
        <span class="tab-pill borrow-pill">{data.available.borrowed.length}</span>
      {/if}
    </button>
    <button class="tab" class:active={activeTab === 'browse'} onclick={() => activeTab = 'browse'}>
      <LayoutGrid size={15} />
      <span>Browse All</span>
      {#if data.available.browseAll.length > 0}
        <span class="tab-pill">{data.available.browseAll.length}</span>
      {/if}
    </button>
  </nav>

  {#if activeTab === 'registered'}
    <div class="panel" in:fly={{ y: 8, duration: 180 }}>
      {#if data.registrations.length === 0}
        <div class="empty">
          <div class="empty-icon"><BookOpen size={28} /></div>
          <h3>No courses registered yet for Semester {currentSemester}</h3>
          <p>Use the Normal, Carry-over, or Borrowed tabs to register courses.</p>
        </div>
      {:else}
        <div class="reg-strip">
          <div class="reg-strip-stat">
            <span class="rss-n">{data.registrations.length}</span>
            <span class="rss-l">Courses</span>
          </div>
          <div class="rss-div"></div>
          <div class="reg-strip-stat">
            <span class="rss-n">{data.stats.totalCreditUnits}</span>
            <span class="rss-l">Credits</span>
          </div>
          <div class="rss-div"></div>
          <div class="reg-strip-stat">
            <span class="rss-n" style="color:#16a34a">{regByType().normal.length}</span>
            <span class="rss-l">Normal</span>
          </div>
          {#if regByType().carryOver.length > 0}
            <div class="rss-div"></div>
            <div class="reg-strip-stat">
              <span class="rss-n" style="color:#f59e0b">{regByType().carryOver.length}</span>
              <span class="rss-l">Carry-over</span>
            </div>
          {/if}
          {#if regByType().borrowed.length > 0}
            <div class="rss-div"></div>
            <div class="reg-strip-stat">
              <span class="rss-n" style="color:#8b5cf6">{regByType().borrowed.length}</span>
              <span class="rss-l">Borrowed</span>
            </div>
          {/if}
        </div>

        {#each [
          { key: 'normal',    label: 'Normal Courses',    color: '#16a34a', icon: BookOpen,        list: regByType().normal },
          { key: 'carry_over', label: 'Carry-over Courses', color: '#f59e0b', icon: RefreshCw,       list: regByType().carryOver },
          { key: 'borrowed',  label: 'Borrowed Courses',  color: '#8b5cf6', icon: ArrowRightLeft,  list: regByType().borrowed },
        ] as grp}
          {#if grp.list.length > 0}
            <div class="reg-group">
              <div class="reg-group-header" style="--gc:{grp.color}">
                <svelte:component this={grp.icon} size={14} />
                <span>{grp.label}</span>
                <span class="rg-count">{grp.list.length}</span>
              </div>
              <div class="reg-list">
                {#each grp.list as reg (reg.id)}
                  <div class="reg-row">
                    <div class="reg-row-left">
                      <span class="reg-code" style="color:{grp.color};background:{grp.color}18">{reg.course.code}</span>
                      <div class="reg-info">
                        <span class="reg-title">{reg.course.title}</span>
                        <span class="reg-sub">
                          <Building2 size={11} /> {reg.course.department.code}
                          · <Hash size={11} /> {reg.course.creditUnits} CR
                          · <Clock size={11} /> {new Date(reg.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <form method="POST" action="?/drop&semester={currentSemester}" use:enhance={() => {
                      droppingId = reg.id;
                      return async ({ update }) => { droppingId = null; update(); };
                    }}>
                      <input type="hidden" name="registrationId" value={reg.id} />
                      <button type="submit" class="drop-btn" disabled={droppingId === reg.id} title="Drop course">
                        {#if droppingId === reg.id}
                          <Loader2 size={13} class="spin" />
                        {:else}
                          <Trash2 size={13} />
                        {/if}
                      </button>
                    </form>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        {/each}
      {/if}
    </div>

  {:else if activeTab === 'normal'}
    <div class="panel" in:fly={{ y: 8, duration: 180 }}>
      <div class="panel-info">
        <Info size={14} />
        <span>Courses from <strong>{data.student.collegeName}</strong> at your current level ({data.stats.studentLevel} Level) — <strong>Semester {currentSemester}</strong>.</span>
      </div>

      <div class="toolbar">
        <div class="search-box">
          <Search size={13} class="sb-icon" />
          <input type="text" placeholder="Search courses…" bind:value={normalSearch} />
          {#if normalSearch}<button class="sb-clear" onclick={() => normalSearch = ''}><X size={12}/></button>{/if}
        </div>
        <select class="filter-sel" bind:value={normalDeptFilter}>
          <option value="">All Departments</option>
          {#each normalDepts as d}
            <option value={d.id}>{d.name} ({d.code})</option>
          {/each}
        </select>
        <button
          class="group-toggle"
          class:on={groupByDept}
          onclick={() => groupByDept = !groupByDept}
          title="Group by department"
        >
          <Building2 size={13} /> Group
        </button>
        <span class="result-label">{normalFiltered().length} course{normalFiltered().length !== 1 ? 's' : ''}</span>
      </div>

      {#if data.available.normal.length === 0}
        <div class="empty">
          <div class="empty-icon"><CheckCircle2 size={28} /></div>
          <h3>No normal courses for Semester {currentSemester}</h3>
          <p>Switch to the other semester or all courses may already be registered.</p>
        </div>
      {:else if normalFiltered().length === 0}
        <div class="empty small">
          <Search size={24} />
          <p>No courses match your search.</p>
        </div>
      {:else if groupByDept}
        {#each normalGrouped() as grp}
          <div class="dept-group">
            <div class="dept-group-header">
              <Building2 size={13} />
              <span>{grp.dept.name}</span>
              <span class="dept-code">({grp.dept.code})</span>
              <span class="dept-count">{grp.courses.length}</span>
            </div>
            <div class="course-grid">
              {#each grp.courses as course (course.id)}
                <div class="course-card green-card">
                  <div class="cc-head">
                    <span class="cc-code green">{course.code}</span>
                    <span class="cc-cr">{course.creditUnits} CR</span>
                  </div>
                  <p class="cc-title">{course.title}</p>
                  <p class="cc-meta"><Building2 size={11} /> {course.department.name}</p>
                  <p class="cc-enroll"><Info size={11} /> {course._count.registrations} enrolled</p>
                  <form method="POST" action="?/register&semester={currentSemester}" use:enhance={() => {
                    setRegistering(course.id);
                    return async ({ update }) => { setRegistering(null); update(); };
                  }}>
                    <input type="hidden" name="courseId" value={course.id} />
                    <input type="hidden" name="registrationType" value="normal" />
                    <button type="submit" class="reg-btn green" disabled={!canRegister || registeringId === course.id}>
                      {#if registeringId === course.id}
                        <Loader2 size={13} class="spin" /> Registering…
                      {:else}
                        <Plus size={13} /> Register
                      {/if}
                    </button>
                  </form>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      {:else}
        <div class="course-grid">
          {#each normalFiltered() as course (course.id)}
            <div class="course-card green-card">
              <div class="cc-head">
                <span class="cc-code green">{course.code}</span>
                <span class="cc-cr">{course.creditUnits} CR</span>
              </div>
              <p class="cc-title">{course.title}</p>
              <p class="cc-meta"><Building2 size={11} /> {course.department.name}</p>
              <p class="cc-enroll"><Info size={11} /> {course._count.registrations} enrolled</p>
              <form method="POST" action="?/register&semester={currentSemester}" use:enhance={() => {
                setRegistering(course.id);
                return async ({ update }) => { setRegistering(null); update(); };
              }}>
                <input type="hidden" name="courseId" value={course.id} />
                <input type="hidden" name="registrationType" value="normal" />
                <button type="submit" class="reg-btn green" disabled={!canRegister || registeringId === course.id}>
                  {#if registeringId === course.id}
                    <Loader2 size={13} class="spin" /> Registering…
                  {:else}
                    <Plus size={13} /> Register
                  {/if}
                </button>
              </form>
            </div>
          {/each}
        </div>
      {/if}
    </div>

  {:else if activeTab === 'carryOver'}
    <div class="panel" in:fly={{ y: 8, duration: 180 }}>
      {#if data.stats.studentLevel < 200}
        <div class="empty warning">
          <div class="empty-icon warn"><AlertTriangle size={28} /></div>
          <h3>Not available at 100 Level</h3>
          <p>Carry-over registration opens from 200 Level.</p>
        </div>
      {:else if data.stats.carryOverCount >= data.stats.maxCarryOver}
        <div class="empty warning">
          <div class="empty-icon warn"><AlertTriangle size={28} /></div>
          <h3>Carry-over limit reached</h3>
          <p>You've used all {data.stats.maxCarryOver} carry-over slots.</p>
        </div>
      {:else}
        <div class="panel-info amber">
          <RefreshCw size={14} />
          <span>
            Courses from <strong>{data.student.collegeName}</strong> below your level — <strong>Semester {currentSemester}</strong>.
            <strong>{data.stats.carryOverCount}/{data.stats.maxCarryOver}</strong> slots used.
          </span>
        </div>

        <div class="toolbar">
          <div class="search-box">
            <Search size={13} class="sb-icon" />
            <input type="text" placeholder="Search…" bind:value={carrySearch} />
            {#if carrySearch}<button class="sb-clear" onclick={() => carrySearch = ''}><X size={12}/></button>{/if}
          </div>
          <select class="filter-sel" bind:value={carryDeptFilter}>
            <option value="">All Departments</option>
            {#each carryDepts as d}
              <option value={d.id}>{d.name} ({d.code})</option>
            {/each}
          </select>
          <select class="filter-sel" bind:value={carryLevelFilter}>
            <option value="">All Levels</option>
            {#each carryLevels as lvl}
              <option value={lvl}>{lvl} Level</option>
            {/each}
          </select>
          <button
            class="group-toggle"
            class:on={groupByDept}
            onclick={() => groupByDept = !groupByDept}
            title="Group by department"
          >
            <Building2 size={13} /> Group
          </button>
          <span class="result-label">{carryFiltered().length} course{carryFiltered().length !== 1 ? 's' : ''}</span>
        </div>

        {#if data.available.carryOver.length === 0}
          <div class="empty">
            <div class="empty-icon"><CheckCircle2 size={28} /></div>
            <h3>No carry-over courses for Semester {currentSemester}</h3>
            <p>No courses below your level remain unregistered for this semester.</p>
          </div>
        {:else if carryFiltered().length === 0}
          <div class="empty small"><Search size={24} /><p>No courses match.</p></div>
        {:else if groupByDept}
          {#each carryGrouped() as grp}
            <div class="dept-group">
              <div class="dept-group-header">
                <Building2 size={13} />
                <span>{grp.dept.name}</span>
                <span class="dept-code">({grp.dept.code})</span>
                <span class="dept-count">{grp.courses.length}</span>
              </div>
              <div class="course-grid">
                {#each grp.courses as course (course.id)}
                  <div class="course-card amber-card">
                    <div class="cc-head">
                      <span class="cc-code amber">{course.code}</span>
                      <div style="display:flex;gap:0.3rem;align-items:center">
                        <span class="level-pill">{course.level}L</span>
                        <span class="cc-cr">{course.creditUnits} CR</span>
                      </div>
                    </div>
                    <p class="cc-title">{course.title}</p>
                    <p class="cc-meta"><Building2 size={11} /> {course.department.name}</p>
                    <p class="cc-enroll"><Info size={11} /> {course._count.registrations} enrolled</p>
                    <form method="POST" action="?/register&semester={currentSemester}" use:enhance={() => {
                      setRegistering(course.id);
                      return async ({ update }) => { setRegistering(null); update(); };
                    }}>
                      <input type="hidden" name="courseId" value={course.id} />
                      <input type="hidden" name="registrationType" value="carry_over" />
                      <button type="submit" class="reg-btn amber" disabled={!canCarry || !canRegister || registeringId === course.id}>
                        {#if registeringId === course.id}
                          <Loader2 size={13} class="spin" /> Registering…
                        {:else}
                          <RefreshCw size={13} /> Register Carry-over
                        {/if}
                      </button>
                    </form>
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        {:else}
          <div class="course-grid">
            {#each carryFiltered() as course (course.id)}
              <div class="course-card amber-card">
                <div class="cc-head">
                  <span class="cc-code amber">{course.code}</span>
                  <div style="display:flex;gap:0.3rem;align-items:center">
                    <span class="level-pill">{course.level}L</span>
                    <span class="cc-cr">{course.creditUnits} CR</span>
                  </div>
                </div>
                <p class="cc-title">{course.title}</p>
                <p class="cc-meta"><Building2 size={11} /> {course.department.name}</p>
                <p class="cc-enroll"><Info size={11} /> {course._count.registrations} enrolled</p>
                <form method="POST" action="?/register&semester={currentSemester}" use:enhance={() => {
                  setRegistering(course.id);
                  return async ({ update }) => { setRegistering(null); update(); };
                }}>
                  <input type="hidden" name="courseId" value={course.id} />
                  <input type="hidden" name="registrationType" value="carry_over" />
                  <button type="submit" class="reg-btn amber" disabled={!canCarry || !canRegister || registeringId === course.id}>
                    {#if registeringId === course.id}
                      <Loader2 size={13} class="spin" /> Registering…
                    {:else}
                      <RefreshCw size={13} /> Register Carry-over
                    {/if}
                  </button>
                </form>
              </div>
            {/each}
          </div>
        {/if}
      {/if}
    </div>

  {:else if activeTab === 'borrowed'}
    <div class="panel" in:fly={{ y: 8, duration: 180 }}>
      {#if data.stats.borrowedCount >= data.stats.maxBorrowed}
        <div class="empty warning">
          <div class="empty-icon warn"><AlertTriangle size={28} /></div>
          <h3>Borrow limit reached</h3>
          <p>You've used all {data.stats.maxBorrowed} borrowed course slots.</p>
        </div>
      {:else}
        <div class="panel-info purple">
          <ArrowRightLeft size={14} />
          <span>
            Courses from <strong>outside {data.student.collegeName}</strong> at your level — <strong>Semester {currentSemester}</strong>.
            <strong>{data.stats.borrowedCount}/{data.stats.maxBorrowed}</strong> slots used.
          </span>
        </div>

        <div class="toolbar">
          <div class="search-box">
            <Search size={13} class="sb-icon" />
            <input type="text" placeholder="Search by code, title, dept, or college…" bind:value={borrowSearch} />
            {#if borrowSearch}<button class="sb-clear" onclick={() => borrowSearch = ''}><X size={12}/></button>{/if}
          </div>
          <span class="result-label">{borrowFiltered().length} course{borrowFiltered().length !== 1 ? 's' : ''}</span>
        </div>

        {#if data.available.borrowed.length === 0}
          <div class="empty">
            <div class="empty-icon"><ArrowRightLeft size={28} /></div>
            <h3>No borrowed courses for Semester {currentSemester}</h3>
            <p>No courses from other colleges match your level for this semester.</p>
          </div>
        {:else if borrowFiltered().length === 0}
          <div class="empty small"><Search size={24} /><p>No courses match.</p></div>
        {:else}
          {#each borrowGrouped() as grp}
            <div class="college-group">
              <div class="college-group-header">
                <School size={13} />
                <span>{grp.college?.name ?? 'Unknown College'}</span>
                <span class="college-count">{grp.courses.length}</span>
              </div>
              <div class="course-grid">
                {#each grp.courses as course (course.id)}
                  <div class="course-card purple-card">
                    <div class="cc-head">
                      <span class="cc-code purple">{course.code}</span>
                      <span class="cc-cr">{course.creditUnits} CR</span>
                    </div>
                    <p class="cc-title">{course.title}</p>
                    <div class="cc-meta-stack">
                      <span class="cc-meta"><Building2 size={11} /> {course.department.name}</span>
                      {#if course.department.college}
                        <span class="cc-college">{course.department.college.name}</span>
                      {/if}
                    </div>
                    <p class="cc-enroll"><Info size={11} /> {course._count.registrations} enrolled</p>
                    <form method="POST" action="?/register&semester={currentSemester}" use:enhance={() => {
                      setRegistering(course.id);
                      return async ({ update }) => { setRegistering(null); update(); };
                    }}>
                      <input type="hidden" name="courseId" value={course.id} />
                      <input type="hidden" name="registrationType" value="borrowed" />
                      <button type="submit" class="reg-btn purple" disabled={!canBorrow || !canRegister || registeringId === course.id}>
                        {#if registeringId === course.id}
                          <Loader2 size={13} class="spin" /> Registering…
                        {:else}
                          <ArrowRightLeft size={13} /> Borrow Course
                        {/if}
                      </button>
                    </form>
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        {/if}
      {/if}
    </div>

  {:else if activeTab === 'browse'}
    <div class="panel" in:fly={{ y: 8, duration: 180 }}>
      <div class="panel-info blue">
        <LayoutGrid size={14} />
        <span>
          Browse all courses up to <strong>{data.stats.studentLevel} Level</strong> — <strong>Semester {currentSemester}</strong>.
          Registration type is inferred automatically.
        </span>
      </div>

      <div class="toolbar">
        <div class="search-box">
          <Search size={13} class="sb-icon" />
          <input type="text" placeholder="Search courses, departments, colleges…" bind:value={browseSearch} />
          {#if browseSearch}<button class="sb-clear" onclick={() => browseSearch = ''}><X size={12}/></button>{/if}
        </div>
        <select class="filter-sel" bind:value={browseCollegeFilter}>
          <option value="">All Colleges</option>
          {#each browseColleges as c}
            <option value={c.id}>{c.name}</option>
          {/each}
        </select>
        <select class="filter-sel" bind:value={browseDeptFilter}>
          <option value="">All Departments</option>
          {#each browseDepts() as d}
            <option value={d.id}>{d.name} ({d.code})</option>
          {/each}
        </select>
        <select class="filter-sel" bind:value={browseLevelFilter}>
          <option value="">All Levels</option>
          {#each browseLevels as lvl}
            <option value={lvl}>{lvl} Level</option>
          {/each}
        </select>
        <div class="view-toggle">
          <button class="view-btn" class:active={browseView === 'grid'} onclick={() => browseView = 'grid'} title="Grid view">
            <LayoutGrid size={13} />
          </button>
          <button class="view-btn" class:active={browseView === 'list'} onclick={() => browseView = 'list'} title="List view">
            <List size={13} />
          </button>
        </div>
        <span class="result-label">{browseFiltered().length} course{browseFiltered().length !== 1 ? 's' : ''}</span>
      </div>

      {#if data.available.browseAll.length === 0}
        <div class="empty">
          <div class="empty-icon"><BookOpen size={28} /></div>
          <h3>No courses available for Semester {currentSemester}</h3>
        </div>
      {:else if browseFiltered().length === 0}
        <div class="empty small"><Search size={24} /><p>No courses match your filters.</p></div>
      {:else if browseView === 'grid'}
        <div class="course-grid">
          {#each browseFiltered() as course (course.id)}
            {@const inferred = inferRegType(course)}
            <div class="course-card {inferred.type === 'normal' ? 'green-card' : inferred.type === 'carry_over' ? 'amber-card' : 'purple-card'}" class:registered={isRegistered(course.id)}>
              <div class="cc-head">
                <span class="cc-code {inferred.type === 'normal' ? 'green' : inferred.type === 'carry_over' ? 'amber' : 'purple'}">{course.code}</span>
                <div style="display:flex;gap:0.3rem;align-items:center">
                  <span class="level-pill">{course.level}L</span>
                  <span class="cc-cr">{course.creditUnits} CR</span>
                </div>
              </div>
              <p class="cc-title">{course.title}</p>
              <div class="cc-meta-stack">
                <span class="cc-meta"><Building2 size={11} /> {course.department.name}</span>
                {#if course.department.college}
                  <span class="cc-college">{course.department.college.name}</span>
                {/if}
              </div>
              <p class="cc-enroll"><Info size={11} /> {course._count.registrations} enrolled</p>
              {#if isRegistered(course.id)}
                <div class="registered-badge">
                  <CheckCircle2 size={13} /> Registered
                </div>
              {:else}
                <form method="POST" action="?/register&semester={currentSemester}" use:enhance={() => {
                  setRegistering(course.id);
                  return async ({ update }) => { setRegistering(null); update(); };
                }}>
                  <input type="hidden" name="courseId" value={course.id} />
                  <input type="hidden" name="registrationType" value={inferred.type} />
                  <button type="submit" class="reg-btn {inferred.type === 'normal' ? 'green' : inferred.type === 'carry_over' ? 'amber' : 'purple'}" disabled={inferred.disabled || registeringId === course.id} title={inferred.reason}>
                    {#if registeringId === course.id}
                      <Loader2 size={13} class="spin" /> Registering…
                    {:else}
                      {#if inferred.type === 'normal'}<Plus size={13} />
                      {:else if inferred.type === 'carry_over'}<RefreshCw size={13} />
                      {:else}<ArrowRightLeft size={13} />{/if}
                      {inferred.type === 'normal' ? 'Register' : inferred.type === 'carry_over' ? 'Carry-over' : 'Borrow'}
                    {/if}
                  </button>
                </form>
              {/if}
            </div>
          {/each}
        </div>
      {:else}
        <div class="browse-list">
          {#each browseFiltered() as course (course.id)}
            {@const inferred = inferRegType(course)}
            <div class="browse-row" class:registered={isRegistered(course.id)}>
              <div class="br-left">
                <span class="br-code {inferred.type === 'normal' ? 'green' : inferred.type === 'carry_over' ? 'amber' : 'purple'}">{course.code}</span>
                <div class="br-info">
                  <span class="br-title">{course.title}</span>
                  <span class="br-sub">
                    <School size={10} /> {course.department.college?.name ?? '—'}
                    · <Building2 size={10} /> {course.department.name}
                    · <Layers size={10} /> {course.level}L
                    · {course.creditUnits} CR
                  </span>
                </div>
              </div>
              <div class="br-right">
                {#if isRegistered(course.id)}
                  <span class="br-badge ok"><CheckCircle2 size={12} /> Registered</span>
                {:else}
                  <form method="POST" action="?/register&semester={currentSemester}" use:enhance={() => {
                    setRegistering(course.id);
                    return async ({ update }) => { setRegistering(null); update(); };
                  }}>
                    <input type="hidden" name="courseId" value={course.id} />
                    <input type="hidden" name="registrationType" value={inferred.type} />
                    <button type="submit" class="br-btn {inferred.type === 'normal' ? 'green' : inferred.type === 'carry_over' ? 'amber' : 'purple'}" disabled={inferred.disabled || registeringId === course.id} title={inferred.reason}>
                      {#if registeringId === course.id}
                        <Loader2 size={12} class="spin" />
                      {:else}
                        {#if inferred.type === 'normal'}<Plus size={12} />
                        {:else if inferred.type === 'carry_over'}<RefreshCw size={12} />
                        {:else}<ArrowRightLeft size={12} />{/if}
                        {inferred.type === 'normal' ? 'Register' : inferred.type === 'carry_over' ? 'Carry-over' : 'Borrow'}
                      {/if}
                    </button>
                  </form>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

</div>

<style>
  .page {
    max-width: 1100px; margin: 0 auto; padding: 1.5rem;
    display: flex; flex-direction: column; gap: 1rem;
  }

  .top-bar {
    display: flex; justify-content: space-between; align-items: flex-start;
    gap: 1.25rem; flex-wrap: wrap;
  }
  .top-bar-left { display: flex; align-items: center; gap: 0.875rem; }
  .page-icon {
    width: 44px; height: 44px; border-radius: 0.75rem; flex-shrink: 0;
    background: linear-gradient(135deg, #15803d, #16a34a);
    display: flex; align-items: center; justify-content: center; color: white;
  }
  h1 { font-size: 1.4rem; font-weight: 800; color: var(--color-text); margin: 0; letter-spacing: -0.02em; }
  .meta { font-size: 0.78rem; color: var(--color-muted); margin: 0.15rem 0 0; }

  /* Semester Picker */
  .semester-picker {
    display: flex; flex-direction: column; align-items: center; gap: 0.35rem;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.875rem; padding: 0.625rem 1rem;
  }
  .sem-label {
    font-size: 0.65rem; font-weight: 700; color: var(--color-muted);
    text-transform: uppercase; letter-spacing: 0.06em;
    display: flex; align-items: center; gap: 0.3rem;
  }
  .sem-toggle {
    display: flex; gap: 0.15rem;
    background: var(--color-bg); border-radius: 0.5rem;
    padding: 0.2rem;
  }
  .sem-btn {
    padding: 0.4rem 1rem; border-radius: 0.4rem; border: none;
    background: none; color: var(--color-muted);
    font-size: 0.8rem; font-weight: 700; cursor: pointer;
    transition: all 0.15s; font-family: inherit;
  }
  .sem-btn:hover { color: var(--color-text); }
  .sem-btn.active {
    background: var(--color-text); color: var(--color-surface);
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .credit-gauge {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.875rem; padding: 0.875rem 1.125rem;
    display: flex; flex-direction: column; gap: 0.5rem; min-width: 240px;
  }
  .gauge-top { display: flex; justify-content: space-between; align-items: baseline; }
  .gauge-label { font-size: 0.72rem; font-weight: 600; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.04em; }
  .gauge-value { font-size: 1.35rem; font-weight: 800; line-height: 1; }
  .gauge-max { font-size: 0.75rem; font-weight: 500; color: var(--color-muted); }
  .gauge-track { height: 5px; background: var(--color-border); border-radius: 3px; overflow: hidden; }
  .gauge-fill { height: 100%; border-radius: 3px; transition: width 0.4s ease; }
  .gauge-chips { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .g-chip {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.68rem; font-weight: 600; color: var(--color-muted);
    padding: 0.15rem 0.5rem; background: var(--color-bg);
    border: 1px solid var(--color-border); border-radius: 999px;
    transition: all 0.2s;
  }
  .g-chip.warn { color: #ef4444; border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.05); }

  .alert {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.75rem 1rem; border-radius: 0.625rem;
    font-size: 0.85rem; font-weight: 500;
  }
  .alert.ok  { background: rgba(22,163,74,0.08); color: #16a34a; border: 1px solid rgba(22,163,74,0.2); }
  .alert.bad { background: rgba(239,68,68,0.08); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }

  .tab-nav {
    display: flex; gap: 0.125rem;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; padding: 0.3rem; width: fit-content; flex-wrap: wrap;
  }
  .tab {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.5rem 1rem; border-radius: 0.55rem; border: none;
    background: none; color: var(--color-muted);
    font-size: 0.83rem; font-weight: 600; cursor: pointer; transition: all 0.15s;
    font-family: inherit;
  }
  .tab:hover { color: var(--color-text); background: var(--color-bg); }
  .tab.active { background: var(--color-text); color: var(--color-surface); }
  .tab-pill {
    min-width: 18px; height: 18px; padding: 0 0.3rem;
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--color-border); border-radius: 999px;
    font-size: 0.65rem; font-weight: 800;
  }
  .tab.active .tab-pill { background: rgba(255,255,255,0.2); }
  .registered-pill { background: rgba(22,163,74,0.15); color: #16a34a; }
  .carry-pill  { background: rgba(245,158,11,0.15); color: #d97706; }
  .borrow-pill { background: rgba(139,92,246,0.15); color: #7c3aed; }
  .tab.active .registered-pill,
  .tab.active .carry-pill,
  .tab.active .borrow-pill { background: rgba(255,255,255,0.25); color: inherit; }

  .panel { display: flex; flex-direction: column; gap: 1rem; }

  .panel-info {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.75rem 1rem; border-radius: 0.625rem;
    font-size: 0.83rem; color: #1d4ed8;
    background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.15);
  }
  .panel-info.amber { color: #92400e; background: rgba(245,158,11,0.07); border-color: rgba(245,158,11,0.2); }
  .panel-info.purple { color: #5b21b6; background: rgba(139,92,246,0.07); border-color: rgba(139,92,246,0.2); }
  .panel-info.blue { color: #1e40af; background: rgba(59,130,246,0.06); border-color: rgba(59,130,246,0.15); }

  .reg-strip {
    display: flex; align-items: center; flex-wrap: wrap;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; padding: 0 0.75rem; overflow-x: auto;
  }
  .reg-strip-stat {
    display: flex; flex-direction: column; align-items: center;
    padding: 0.875rem 1.25rem;
  }
  .rss-n { font-size: 1.3rem; font-weight: 800; line-height: 1; color: var(--color-text); }
  .rss-l { font-size: 0.62rem; font-weight: 600; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0.15rem; }
  .rss-div { width: 1px; height: 26px; background: var(--color-border); flex-shrink: 0; }

  .reg-group {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; overflow: hidden;
  }
  .reg-group-header {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.625rem 1rem;
    background: color-mix(in srgb, var(--gc) 6%, var(--color-bg));
    border-bottom: 1px solid var(--color-border);
    font-size: 0.8rem; font-weight: 700; color: var(--gc);
  }
  .rg-count {
    margin-left: auto; font-size: 0.68rem; font-weight: 800;
    background: color-mix(in srgb, var(--gc) 12%, transparent);
    padding: 0.1rem 0.45rem; border-radius: 999px;
  }

  .reg-list { display: flex; flex-direction: column; }
  .reg-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 0.75rem; padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border);
    transition: background 0.1s;
  }
  .reg-row:last-child { border-bottom: none; }
  .reg-row:hover { background: var(--color-bg); }
  .reg-row-left { display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 0; }
  .reg-code {
    font-size: 0.75rem; font-weight: 800; font-family: monospace;
    padding: 0.25rem 0.625rem; border-radius: 0.35rem; flex-shrink: 0;
    white-space: nowrap;
  }
  .reg-info { min-width: 0; }
  .reg-title { font-size: 0.875rem; font-weight: 600; color: var(--color-text); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .reg-sub {
    display: flex; align-items: center; gap: 0.3rem; flex-wrap: wrap;
    font-size: 0.72rem; color: var(--color-muted); margin-top: 0.15rem;
  }

  .drop-btn {
    width: 30px; height: 30px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: none; border: 1px solid transparent; border-radius: 0.4rem;
    color: var(--color-muted); cursor: pointer; transition: all 0.15s;
  }
  .drop-btn:hover:not(:disabled) { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.2); color: #ef4444; }
  .drop-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .toolbar {
    display: flex; align-items: center; gap: 0.625rem; flex-wrap: wrap;
  }
  .search-box {
    position: relative; display: flex; align-items: center; flex: 1; min-width: 180px;
  }
  :global(.sb-icon) { position: absolute; left: 0.625rem; color: var(--color-muted); pointer-events: none; }
  .search-box input {
    width: 100%; padding: 0.5rem 2rem 0.5rem 2rem;
    border: 1px solid var(--color-border); border-radius: 0.5rem;
    background: var(--color-bg); color: var(--color-text);
    font-size: 0.83rem; font-family: inherit; outline: none;
    transition: border-color 0.15s;
  }
  .search-box input:focus { border-color: #16a34a; }
  .sb-clear {
    position: absolute; right: 0.5rem; background: none; border: none;
    color: var(--color-muted); cursor: pointer; display: flex; align-items: center;
  }
  .filter-sel {
    padding: 0.5rem 0.75rem; background: var(--color-bg);
    border: 1px solid var(--color-border); border-radius: 0.5rem;
    color: var(--color-text); font-size: 0.83rem; font-family: inherit; outline: none; cursor: pointer;
    transition: border-color 0.15s;
  }
  .filter-sel:focus { border-color: #16a34a; }
  .group-toggle, .view-toggle {
    display: flex; align-items: center; gap: 0.3rem;
    padding: 0.5rem 0.75rem; border-radius: 0.5rem;
    border: 1px solid var(--color-border); background: none;
    font-size: 0.8rem; font-weight: 600; color: var(--color-muted);
    cursor: pointer; transition: all 0.15s; font-family: inherit;
  }
  .group-toggle.on { border-color: #16a34a; color: #16a34a; background: rgba(22,163,74,0.06); }
  .view-toggle { padding: 0.3rem; gap: 0.15rem; }
  .view-btn {
    display: flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; border-radius: 0.35rem;
    border: none; background: none; color: var(--color-muted);
    cursor: pointer; transition: all 0.15s;
  }
  .view-btn.active { background: var(--color-text); color: var(--color-surface); }
  .result-label { font-size: 0.78rem; color: var(--color-muted); white-space: nowrap; margin-left: auto; }

  .dept-group, .college-group { display: flex; flex-direction: column; gap: 0.75rem; }
  .dept-group-header, .college-group-header {
    display: flex; align-items: center; gap: 0.4rem;
    font-size: 0.78rem; font-weight: 700; color: var(--color-text);
    padding: 0.25rem 0;
  }
  .dept-code, .college-code { color: var(--color-muted); font-weight: 500; }
  .dept-count, .college-count {
    margin-left: auto; font-size: 0.68rem; font-weight: 800;
    background: var(--color-border); padding: 0.1rem 0.45rem;
    border-radius: 999px; color: var(--color-muted);
  }

  .course-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0.75rem;
  }

  .course-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; padding: 1rem;
    display: flex; flex-direction: column; gap: 0.6rem;
    transition: box-shadow 0.15s, transform 0.15s;
  }
  .course-card:hover { box-shadow: 0 3px 10px rgba(0,0,0,0.05); transform: translateY(-1px); }
  .course-card.registered { opacity: 0.7; }
  .green-card { border-top: 2px solid #16a34a; }
  .amber-card { border-top: 2px solid #f59e0b; }
  .purple-card { border-top: 2px solid #8b5cf6; }

  .cc-head { display: flex; justify-content: space-between; align-items: center; }
  .cc-code {
    font-family: monospace; font-size: 0.78rem; font-weight: 800;
    padding: 0.2rem 0.55rem; border-radius: 0.35rem;
  }
  .cc-code.green  { color: #16a34a; background: rgba(22,163,74,0.08); }
  .cc-code.amber  { color: #d97706; background: rgba(245,158,11,0.08); }
  .cc-code.purple { color: #7c3aed; background: rgba(139,92,246,0.08); }
  .cc-cr {
    font-size: 0.68rem; font-weight: 700; color: var(--color-muted);
    background: var(--color-bg); border: 1px solid var(--color-border);
    padding: 0.15rem 0.4rem; border-radius: 0.25rem;
  }
  .cc-title { font-size: 0.875rem; font-weight: 600; color: var(--color-text); margin: 0; line-height: 1.4; }
  .cc-meta, .cc-enroll {
    display: flex; align-items: center; gap: 0.3rem;
    font-size: 0.73rem; color: var(--color-muted); margin: 0;
  }
  .cc-meta-stack { display: flex; flex-direction: column; gap: 0.2rem; }
  .cc-college {
    font-size: 0.68rem; color: var(--color-muted);
    background: var(--color-bg); border: 1px solid var(--color-border);
    padding: 0.1rem 0.4rem; border-radius: 0.25rem; align-self: flex-start;
  }

  .level-pill {
    font-size: 0.65rem; font-weight: 800;
    background: rgba(245,158,11,0.1); color: #d97706;
    padding: 0.15rem 0.4rem; border-radius: 0.25rem;
  }

  .reg-btn {
    display: flex; align-items: center; justify-content: center; gap: 0.375rem;
    width: 100%; padding: 0.55rem; border-radius: 0.5rem;
    font-size: 0.82rem; font-weight: 700; cursor: pointer;
    transition: all 0.15s; border: none; font-family: inherit;
    margin-top: auto;
  }
  .reg-btn.green  { background: #16a34a; color: white; }
  .reg-btn.green:hover:not(:disabled)  { background: #15803d; }
  .reg-btn.amber  { background: #f59e0b; color: white; }
  .reg-btn.amber:hover:not(:disabled)  { background: #d97706; }
  .reg-btn.purple { background: #8b5cf6; color: white; }
  .reg-btn.purple:hover:not(:disabled) { background: #7c3aed; }
  .reg-btn:disabled { opacity: 0.45; cursor: not-allowed; }

  .registered-badge {
    display: flex; align-items: center; justify-content: center; gap: 0.375rem;
    width: 100%; padding: 0.55rem; border-radius: 0.5rem;
    font-size: 0.82rem; font-weight: 700; color: #16a34a;
    background: rgba(22,163,74,0.08); border: 1px solid rgba(22,163,74,0.2);
    margin-top: auto;
  }

  .browse-list {
    display: flex; flex-direction: column; gap: 0.5rem;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; overflow: hidden;
  }
  .browse-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 0.75rem; padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border);
    transition: background 0.1s;
  }
  .browse-row:last-child { border-bottom: none; }
  .browse-row:hover { background: var(--color-bg); }
  .browse-row.registered { background: rgba(22,163,74,0.04); }

  .br-left { display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 0; }
  .br-code {
    font-family: monospace; font-size: 0.75rem; font-weight: 800;
    padding: 0.25rem 0.55rem; border-radius: 0.35rem; flex-shrink: 0;
  }
  .br-info { min-width: 0; }
  .br-title { font-size: 0.875rem; font-weight: 600; color: var(--color-text); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .br-sub {
    display: flex; align-items: center; gap: 0.3rem; flex-wrap: wrap;
    font-size: 0.72rem; color: var(--color-muted); margin-top: 0.15rem;
  }
  .br-right { display: flex; align-items: center; flex-shrink: 0; }
  .br-badge {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.75rem; font-weight: 700; padding: 0.4rem 0.75rem;
    border-radius: 0.4rem; white-space: nowrap;
  }
  .br-badge.ok { color: #16a34a; background: rgba(22,163,74,0.08); border: 1px solid rgba(22,163,74,0.2); }
  .br-btn {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.78rem; font-weight: 700; padding: 0.4rem 0.875rem;
    border-radius: 0.4rem; border: none; cursor: pointer;
    transition: all 0.15s; font-family: inherit; white-space: nowrap;
  }
  .br-btn.green { background: #16a34a; color: white; }
  .br-btn.green:hover:not(:disabled) { background: #15803d; }
  .br-btn.amber { background: #f59e0b; color: white; }
  .br-btn.amber:hover:not(:disabled) { background: #d97706; }
  .br-btn.purple { background: #8b5cf6; color: white; }
  .br-btn.purple:hover:not(:disabled) { background: #7c3aed; }
  .br-btn:disabled { opacity: 0.45; cursor: not-allowed; }

  .empty {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 0.75rem; padding: 3.5rem 2rem; text-align: center; color: var(--color-muted);
  }
  .empty.small { padding: 2rem; }
  .empty.warning { padding: 3rem; }
  .empty-icon {
    width: 56px; height: 56px; border-radius: 50%;
    background: var(--color-bg); border: 1px solid var(--color-border);
    display: flex; align-items: center; justify-content: center; opacity: 0.5;
  }
  .empty-icon.warn { opacity: 1; color: #f59e0b; }
  .empty h3 { font-size: 1rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .empty p  { font-size: 0.83rem; margin: 0; max-width: 360px; }

  :global(.spin) { animation: spin 0.9s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 768px) {
    .page { padding: 1rem; }
    .top-bar { flex-direction: column; }
    .credit-gauge { width: 100%; min-width: unset; }
    .course-grid { grid-template-columns: 1fr; }
    .tab-nav { width: 100%; }
    .tab { flex: 1; justify-content: center; }
    .toolbar { flex-direction: column; align-items: stretch; }
    .search-box, .filter-sel { width: 100%; }
    .result-label { margin-left: 0; }
    .browse-row { flex-direction: column; align-items: flex-start; }
    .br-right { width: 100%; }
    .br-btn, .br-badge { width: 100%; justify-content: center; }
  }
</style>