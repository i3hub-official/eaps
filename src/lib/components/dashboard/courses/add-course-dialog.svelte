<!-- src/lib/components/dashboard/courses/add-course-dialog.svelte -->
<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog/index.js'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Badge } from '$lib/components/ui/badge/index.js'
  import { enhance } from '$app/forms'
  import Plus from '@lucide/svelte/icons/plus'
  import Search from '@lucide/svelte/icons/search'
  import Star from '@lucide/svelte/icons/star'
  import X from '@lucide/svelte/icons/x'
  import BookOpen from '@lucide/svelte/icons/book-open'
  import ShoppingCart from '@lucide/svelte/icons/shopping-cart'
  import ChevronDown from '@lucide/svelte/icons/chevron-down'

  type Course = {
    id: string
    code: string
    title: string
    creditUnits: number
    type: string
    departmentId: string
    departmentName: string
    collegeId: string
    collegeName: string
    isRecommended: boolean
  }

  type Department = { id: string; name: string }
  type College = { id: string; name: string; departments: Department[] }

  let {
    availableCourses = [],
    colleges = [],
    errorMessage = '',
  }: {
    availableCourses: Course[]
    colleges: College[]
    errorMessage: string
  } = $props()

  let open = $state(false)
  let search = $state('')
  let selectedCollegeId = $state('all')
  let selectedDeptId = $state('all')
  let activeTab = $state<'mine' | 'all'>('mine')
  let selected = $state<Set<string>>(new Set())
  let submitting = $state(false)
  let mobileCartOpen = $state(false)

  const departments = $derived(
    selectedCollegeId === 'all'
      ? colleges.flatMap((c) => c.departments)
      : (colleges.find((c) => c.id === selectedCollegeId)?.departments ?? [])
  )

  const filtered = $derived.by(() => {
    let list = availableCourses
    if (activeTab === 'mine') list = list.filter((c) => c.isRecommended)
    if (selectedCollegeId !== 'all') list = list.filter((c) => c.collegeId === selectedCollegeId)
    if (selectedDeptId !== 'all') list = list.filter((c) => c.departmentId === selectedDeptId)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.departmentName.toLowerCase().includes(q),
      )
    }
    return list
  })

  const selectedCourses = $derived(availableCourses.filter((c) => selected.has(c.id)))
  const selectedCredits = $derived(selectedCourses.reduce((sum, c) => sum + c.creditUnits, 0))
  const recommendedCount = $derived(availableCourses.filter((c) => c.isRecommended).length)

  function toggle(id: string) {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    selected = next
  }

  function remove(id: string) {
    const next = new Set(selected)
    next.delete(id)
    selected = next
  }

  function selectAllFiltered() {
    selected = new Set([...selected, ...filtered.map((c) => c.id)])
  }

  function clearAll() {
    selected = new Set()
    mobileCartOpen = false
  }

  function onCollegeChange(id: string) {
    selectedCollegeId = id
    selectedDeptId = 'all'
  }

  function onTabChange(tab: 'mine' | 'all') {
    activeTab = tab
    if (tab === 'mine') {
      selectedCollegeId = 'all'
      selectedDeptId = 'all'
    }
  }

  function onOpen(v: boolean) {
    open = v
    if (!v) {
      search = ''
      selectedCollegeId = 'all'
      selectedDeptId = 'all'
      activeTab = 'mine'
      selected = new Set()
      mobileCartOpen = false
    }
  }
</script>

<Dialog.Root {open} onOpenChange={onOpen}>
  <Dialog.Trigger>
    {#snippet child({ props })}
      <Button {...props} size="sm">
        <Plus class="size-4" />
        Add Courses
      </Button>
    {/snippet}
  </Dialog.Trigger>

  <Dialog.Content
    class="flex max-h-[92vh] w-full flex-col gap-0 overflow-hidden p-0
           sm:max-w-[95vw] lg:max-w-5xl xl:max-w-6xl"
  >
    <!-- Header -->
    <Dialog.Header class="shrink-0 border-b px-5 py-4 sm:px-6 sm:py-5">
      <Dialog.Title>Add courses</Dialog.Title>
      <Dialog.Description>
        Browse and select courses to register for this semester. Recommended courses match your
        department.
      </Dialog.Description>
    </Dialog.Header>

    {#if errorMessage}
      <div
        class="mx-4 mt-3 shrink-0 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:mx-6"
      >
        {errorMessage}
      </div>
    {/if}

    <!-- Two-panel body: stacked on mobile, side-by-side on lg+ -->
    <div class="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[1fr_300px] lg:overflow-hidden">

      <!-- LEFT: filters + list -->
      <div class="flex min-h-0 flex-col lg:border-r">

        <!-- Tabs -->
        <div class="flex shrink-0 border-b px-4 sm:px-6">
          <button
            onclick={() => onTabChange('mine')}
            class="flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors
                   {activeTab === 'mine'
                     ? 'border-primary text-primary'
                     : 'border-transparent text-muted-foreground hover:text-foreground'}"
          >
            <Star class="size-3" />
            Recommended
            <span class="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              {recommendedCount}
            </span>
          </button>
          <button
            onclick={() => onTabChange('all')}
            class="flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors
                   {activeTab === 'all'
                     ? 'border-primary text-primary'
                     : 'border-transparent text-muted-foreground hover:text-foreground'}"
          >
            All courses
            <span class="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {availableCourses.length}
            </span>
          </button>
        </div>

        <!-- College / dept filters — All tab only -->
        {#if activeTab === 'all'}
          <div class="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2.5 sm:px-6">
            <select
              value={selectedCollegeId}
              onchange={(e) => onCollegeChange((e.target as HTMLSelectElement).value)}
              class="h-8 rounded-md border bg-background px-2 text-xs text-foreground"
            >
              <option value="all">All colleges</option>
              {#each colleges as col (col.id)}
                <option value={col.id}>{col.name}</option>
              {/each}
            </select>

            <select
              bind:value={selectedDeptId}
              disabled={departments.length === 0}
              class="h-8 rounded-md border bg-background px-2 text-xs text-foreground disabled:opacity-50"
            >
              <option value="all">All departments</option>
              {#each departments as dept (dept.id)}
                <option value={dept.id}>{dept.name}</option>
              {/each}
            </select>
          </div>
        {/if}

        <!-- Search -->
        <div class="relative shrink-0 border-b px-4 py-2 sm:px-6">
          <Search
            class="pointer-events-none absolute top-1/2 left-7 size-3.5 -translate-y-1/2 text-muted-foreground sm:left-9"
          />
          <input
            bind:value={search}
            placeholder="Search by code or title…"
            class="h-8 w-full rounded-md border bg-muted/40 pl-8 pr-3 text-sm outline-none
                   ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
        </div>

        <!-- Bulk actions -->
        <div class="flex shrink-0 items-center justify-between border-b px-4 py-1.5 sm:px-6">
          <span class="text-xs text-muted-foreground">
            {filtered.length} course{filtered.length === 1 ? '' : 's'}
          </span>
          <div class="flex items-center gap-3">
            {#if filtered.length > 0}
              <button onclick={selectAllFiltered} class="text-xs text-primary hover:underline">
                Select all shown
              </button>
            {/if}
            {#if selected.size > 0}
              <span class="text-muted-foreground/40">·</span>
              <button onclick={clearAll} class="text-xs text-destructive hover:underline">
                Clear all
              </button>
            {/if}
          </div>
        </div>

        <!-- Course list -->
        <div class="min-h-0 flex-1 overflow-y-auto">
          {#if filtered.length === 0}
            <div class="flex flex-col items-center gap-2 py-14 text-center">
              <BookOpen class="size-8 text-muted-foreground/40" />
              <p class="text-sm text-muted-foreground">
                {activeTab === 'mine'
                  ? 'No recommended courses. Switch to "All courses" to browse.'
                  : 'No courses match your filters.'}
              </p>
            </div>
          {:else}
            {#each filtered as course (course.id)}
              {@const checked = selected.has(course.id)}
              <label
                class="flex cursor-pointer items-start gap-3 border-b px-4 py-3 transition-colors
                       sm:px-6 {checked ? 'bg-primary/5' : 'hover:bg-muted/40'}"
              >
                <input
                  type="checkbox"
                  {checked}
                  onchange={() => toggle(course.id)}
                  class="mt-0.5 size-3.5 shrink-0 accent-primary"
                />
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span class="text-xs font-semibold text-foreground">{course.code}</span>
                    {#if course.isRecommended}
                      <span
                        class="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium
                               text-emerald-600 dark:text-emerald-400"
                      >
                        Recommended
                      </span>
                    {/if}
                    <Badge variant="outline" class="py-0 text-[10px]">{course.type}</Badge>
                  </div>
                  <p class="mt-0.5 text-xs text-muted-foreground">{course.title}</p>
                  <p class="mt-0.5 text-[11px] text-muted-foreground/60">
                    {course.departmentName} · {course.creditUnits} unit{course.creditUnits === 1 ? '' : 's'}
                  </p>
                </div>
              </label>
            {/each}
          {/if}
        </div>

        <!-- Mobile cart drawer (lg+ uses the side panel instead) -->
        {#if selected.size > 0}
          <div class="shrink-0 border-t lg:hidden">
            <button
              onclick={() => (mobileCartOpen = !mobileCartOpen)}
              class="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
            >
              <span class="flex items-center gap-2">
                <ShoppingCart class="size-4 text-primary" />
                <span>{selected.size} selected · {selectedCredits} units</span>
              </span>
              <ChevronDown
                class="size-4 text-muted-foreground transition-transform {mobileCartOpen
                  ? 'rotate-180'
                  : ''}"
              />
            </button>

            {#if mobileCartOpen}
              <div class="max-h-48 overflow-y-auto border-t bg-muted/30 px-4 pb-3">
                <div class="flex flex-col gap-2 pt-3">
                  {#each selectedCourses as course (course.id)}
                    <div
                      class="flex items-start justify-between gap-2 rounded-md border bg-background p-2.5"
                    >
                      <div class="min-w-0">
                        <p class="text-xs font-semibold text-foreground">{course.code}</p>
                        <p class="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {course.title}
                        </p>
                        <p class="mt-0.5 text-[10px] text-muted-foreground/60">
                          {course.creditUnits} unit{course.creditUnits === 1 ? '' : 's'}
                        </p>
                      </div>
                      <button
                        onclick={() => remove(course.id)}
                        class="mt-0.5 shrink-0 text-muted-foreground/50 transition-colors hover:text-destructive"
                        aria-label="Remove {course.code}"
                      >
                        <X class="size-3.5" />
                      </button>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- RIGHT: selection summary — desktop only -->
      <div class="hidden min-h-0 flex-col bg-muted/30 lg:flex">
        <div class="shrink-0 border-b px-4 py-3">
          <p class="text-xs font-semibold text-foreground">Selected courses</p>
          <p class="mt-0.5 text-[11px] text-muted-foreground">
            {selectedCourses.length} course{selectedCourses.length === 1 ? '' : 's'}
            · {selectedCredits} unit{selectedCredits === 1 ? '' : 's'}
          </p>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto p-3">
          {#if selectedCourses.length === 0}
            <div class="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
              <BookOpen class="size-7 text-muted-foreground/30" />
              <p class="text-xs text-muted-foreground/60">
                Tick courses on the left to add them here.
              </p>
            </div>
          {:else}
            <div class="flex flex-col gap-2">
              {#each selectedCourses as course (course.id)}
                <div
                  class="flex items-start justify-between gap-2 rounded-md border bg-background p-2.5"
                >
                  <div class="min-w-0">
                    <p class="text-xs font-semibold text-foreground">{course.code}</p>
                    <p class="mt-0.5 truncate text-[11px] text-muted-foreground">{course.title}</p>
                    <p class="mt-0.5 text-[10px] text-muted-foreground/60">
                      {course.creditUnits} unit{course.creditUnits === 1 ? '' : 's'}
                    </p>
                  </div>
                  <button
                    onclick={() => remove(course.id)}
                    class="mt-0.5 shrink-0 text-muted-foreground/50 transition-colors hover:text-destructive"
                    aria-label="Remove {course.code}"
                  >
                    <X class="size-3.5" />
                  </button>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        {#if selectedCourses.length > 0}
          <div class="shrink-0 border-t p-3">
            <div
              class="flex items-center justify-between rounded-md border bg-background px-3 py-2"
            >
              <span class="text-xs text-muted-foreground">Total credit units</span>
              <span class="text-sm font-semibold text-foreground">{selectedCredits}</span>
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- Footer -->
    <div class="flex shrink-0 items-center justify-between border-t bg-muted/20 px-4 py-3 sm:px-6">
      <span class="text-sm text-muted-foreground">
        {#if selected.size > 0}
          <span class="font-medium text-foreground">{selected.size}</span> selected ·
          <span class="font-medium text-foreground">{selectedCredits}</span>
          unit{selectedCredits === 1 ? '' : 's'}
        {:else}
          No courses selected
        {/if}
      </span>

      <form
        method="POST"
        action="?/register"
        use:enhance={() => {
          submitting = true
          return async ({ update }) => {
            await update()
            submitting = false
            if (!errorMessage) open = false
          }
        }}
      >
        {#each [...selected] as id (id)}
          <input type="hidden" name="courseIds" value={id} />
        {/each}
        <Button type="submit" size="sm" disabled={selected.size === 0 || submitting}>
          {submitting
            ? 'Registering…'
            : selected.size > 0
              ? `Register ${selected.size} course${selected.size === 1 ? '' : 's'}`
              : 'Register courses'}
        </Button>
      </form>
    </div>
  </Dialog.Content>
</Dialog.Root>