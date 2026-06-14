<!-- src/lib/components/reports/ReportRenderer.svelte -->
<script lang="ts">
  import type { ReportMeta, ReportParams } from '$lib/types/reports.js';

  interface Props {
    meta: ReportMeta;
    params: ReportParams;
    data: Record<string, unknown>;
  }

  let { meta, params, data }: Props = $props();

  // ── Import report-specific renderers ──────────────────────────────────
  import GradeDistributionView from './views/GradeDistributionView.svelte';
  import AuditLogsView from './views/AuditLogsView.svelte';
  import ExamPerformanceView from './views/ExamPerformanceView.svelte';
  import GenericTableView from './views/GenericTableView.svelte';
  import ActionAnalysisView from './views/ActionAnalysisView.svelte';

  // ── Map report IDs to their view components ───────────────────────────
  const VIEW_MAP: Record<string, typeof GenericTableView> = {
    'grade-distribution': GradeDistributionView,
    'audit-logs': AuditLogsView,
    'exam-performance': ExamPerformanceView,
    'action-analysis': ActionAnalysisView,
    // Fallback for all other reports — they get a generic table
  };

  const ViewComponent = $derived(VIEW_MAP[meta.id] ?? GenericTableView);
</script>

<ViewComponent {meta} {params} {data} />
