<!-- src/lib/components/reports/ReportRenderer.svelte -->
<script lang="ts">
  import type { ReportMeta, ReportParams } from '$lib/types/reports.js';
  import GradeDistributionView   from './views/GradeDistributionView.svelte';
  import AuditLogsView           from './views/AuditLogsView.svelte';
  import ExamPerformanceView     from './views/ExamPerformanceView.svelte';
  import ActionAnalysisView      from './views/ActionAnalysisView.svelte';
  import StudentPerformanceView  from './views/StudentPerformanceView.svelte';
  import GenericTableView        from './views/GenericTableView.svelte';

  interface Props {
    meta:   ReportMeta;
    params: ReportParams;
    data:   Record<string, unknown>;
  }

  let { meta, params, data }: Props = $props();

  const VIEW_MAP: Record<string, typeof GenericTableView> = {
    'grade-distribution':  GradeDistributionView,
    'audit-logs':          AuditLogsView,
    'exam-performance':    ExamPerformanceView,
    'action-analysis':     ActionAnalysisView,
    'student-performance': StudentPerformanceView,
  };

  const ViewComponent = $derived(VIEW_MAP[meta.id] ?? GenericTableView);
</script>

<ViewComponent {meta} {params} {data} />