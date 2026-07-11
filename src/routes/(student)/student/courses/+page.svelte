<!-- src/routes/student/courses/+page.svelte -->
<script lang="ts">
  import { Topbar } from '$lib/components/dashboard'
  import { Card } from '$lib/components/ui/card/index.js'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Badge } from '$lib/components/ui/badge/index.js'
  import * as Table from '$lib/components/ui/table/index.js'
  import AddCourseDialog from '$lib/components/dashboard/courses/add-course-dialog.svelte'
  import { enhance } from '$app/forms'
  import BookOpen from '@lucide/svelte/icons/book-open'
  import X from '@lucide/svelte/icons/x'
  import AlertCircle from '@lucide/svelte/icons/alert-circle'
  import CheckCircle2 from '@lucide/svelte/icons/check-circle-2'
  import Lock from '@lucide/svelte/icons/lock'

  const MAX_EDITS = 3

  let { data, form } = $props()

  let successMessage = $state('')
  let dropError = $state('')
  let droppingId = $state<string | null>(null)

  $effect(() => {
    if (!form) return
    if (form.registerSuccess) successMessage = form.registerMessage ?? ''
    if (form.dropSuccess) successMessage = form.dropMessage ?? ''
    if (form.dropError) dropError = form.dropError
  })

  const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    PENDING: 'secondary',
    APPROVED: 'default',
    REJECTED: 'destructive',
    CANCELLED: 'outline',
  }

  function formatSemester(type: string | undefined) {
    if (!type) return ''
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()
  }
</script>

<Topbar title="Courses" />

<main class="flex flex-1 flex-col gap-6 p-6">
  {#if data.noActiveSession}
    <Card class="flex flex-col items-center gap-3 border-dashed p-12 text-center">
      <div class="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <BookOpen class="size-5" />
      </div>
      <div>
        <p class="text-base font-semibold">No active semester</p>
        <p class="mt-1 text-sm text-muted-foreground">
          Course registration will open once the current session and semester are set.
        </p>
      </div>
    </Card>
  {:else}
    {#if successMessage}
      <div
        class="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary"
        role="alert"
      >
        <CheckCircle2 class="mt-0.5 size-4 shrink-0" />
        <span>{successMessage}</span>
      </div>
    {/if}

    {#if dropError}
      <div
        class="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        role="alert"
      >
        <AlertCircle class="mt-0.5 size-4 shrink-0" />
        <span>{dropError}</span>
      </div>
    {/if}

    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 class="text-lg font-semibold">
          {data.session?.name} — {formatSemester(data.semester?.type)} Semester
        </h2>
        <p class="text-sm text-muted-foreground">
          {data.registrations.length} course{data.registrations.length === 1 ? '' : 's'} registered
          · {data.totalCreditUnits} credit unit{data.totalCreditUnits === 1 ? '' : 's'}
        </p>
      </div>

      {#if data.registrationWindowOpen}
        <AddCourseDialog
          availableCourses={data.availableCourses}
          colleges={data.colleges}
          errorMessage={form?.registerError ?? ''}
        />
      {:else}
        <Badge variant="outline" class="gap-1.5 py-1.5">
          <Lock class="size-3.5" />
          Registration closed
        </Badge>
      {/if}
    </div>

    <Card class="overflow-hidden p-0">
      {#if data.registrations.length === 0}
        <div class="flex flex-col items-center gap-3 p-12 text-center">
          <div class="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <BookOpen class="size-5" />
          </div>
          <div>
            <p class="text-base font-semibold">No courses registered yet</p>
            <p class="mt-1 text-sm text-muted-foreground">
              {data.registrationWindowOpen
                ? 'Use "Add Courses" above to register for this semester.'
                : 'Registration is currently closed.'}
            </p>
          </div>
        </div>
      {:else}
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Code</Table.Head>
              <Table.Head>Title</Table.Head>
              <Table.Head>Units</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head class="text-right">Action</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each data.registrations as reg (reg.id)}
              <Table.Row>
                <Table.Cell class="font-medium">{reg.course.code}</Table.Cell>
                <Table.Cell class="text-muted-foreground">{reg.course.title}</Table.Cell>
                <Table.Cell>{reg.course.creditUnits}</Table.Cell>
                <Table.Cell>
                  <Badge variant={statusVariant[reg.status] ?? 'outline'}>{reg.status}</Badge>
                </Table.Cell>
                <Table.Cell class="text-right">
                  {#if data.registrationWindowOpen && reg.editCount < MAX_EDITS}
                    <form
                      method="POST"
                      action="?/drop"
                      use:enhance={() => {
                        droppingId = reg.id
                        dropError = ''
                        return async ({ update }) => {
                          await update()
                          droppingId = null
                        }
                      }}
                    >
                      <input type="hidden" name="registrationId" value={reg.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        disabled={droppingId === reg.id}
                        class="text-destructive hover:text-destructive"
                      >
                        <X class="size-3.5" />
                        {droppingId === reg.id ? 'Dropping…' : 'Drop'}
                      </Button>
                    </form>
                  {:else}
                    <span class="text-xs text-muted-foreground">—</span>
                  {/if}
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      {/if}
    </Card>
  {/if}
</main>