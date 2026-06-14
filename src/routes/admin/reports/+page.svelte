<!-- src/routes/(admin)/admin/reports/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    FileText, Download, Calendar, TrendingUp, Users,
    AlertTriangle, CheckCircle, BarChart3, PieChart,
    ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight,
    BookOpen, GraduationCap, ShieldCheck, Clock,
    RefreshCw, Filter, Search, Eye, X, ChevronDown,
    Printer, Building2, Layers, UserCheck, XCircle,
    MinusCircle, Award, Hash, Percent, UserX,
    School, DoorOpen, Flag, Fingerprint, Lock
  } from '@lucide/svelte';
  import { tick, onMount } from 'svelte';

  let { data }: { data: PageData } = $props();

  let isExporting = $state(false);
  let isPrinting = $state(false);
  let dateRange = $state(data.meta?.range ?? '14d');
  let searchQuery = $state('');
  let showFilters = $state(false);
  let activeTab = $state<'overview' | 'exams' | 'lecturers' | 'students' | 'violations'>('overview');
  let showPrintModal = $state(false);
  let printScope = $state<'all' | 'college' | 'department' | 'level' | 'lecturer' | 'course'>('all');
  let selectedPrintCollege = $state('');
  let selectedPrintDept = $state('');
  let selectedPrintLevel = $state('');
  let selectedPrintLecturer = $state('');
  let selectedPrintCourse = $state('');

  // Filter states
  let selectedColleges = $state<string[]>([]);
  let selectedDepartments = $state<string[]>([]);
  let selectedLevels = $state<string[]>([]);
  let selectedLecturers = $state<string[]>([]);
  let selectedCourses = $state<string[]>([]);
  let minCompletionRate = $state(0);
  let minAvgScore = $state(0);
  let maxAvgScore = $state(100);
  let statusFilter = $state<'all' | 'active' | 'completed' | 'upcoming'>('all');
  let passFilter = $state<'all' | 'passed' | 'failed' | 'pending'>('all');
  let submissionFilter = $state<'all' | 'submitted' | 'not_submitted' | 'partial'>('all');

  // Dropdown states
  let showRangeDropdown = $state(false);
  let showCollegeDropdown = $state(false);
  let showDeptDropdown = $state(false);
  let showLevelDropdown = $state(false);
  let showLecturerDropdown = $state(false);
  let showCourseDropdown = $state(false);

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown')) {
      showRangeDropdown = false;
      showCollegeDropdown = false;
      showDeptDropdown = false;
      showLevelDropdown = false;
      showLecturerDropdown = false;
      showCourseDropdown = false;
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  });

  const ranges = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '14d', label: 'Last 14 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '1y', label: 'This Year' },
    { value: 'all', label: 'All Time' },
  ];

  const levels = ['100', '200', '300', '400', '500', 'PG'];

  // Derived data
  const availableColleges = $derived(
    Array.from(new Set(data.examStats?.map((e: any) => e.college) ?? [])).filter(Boolean)
  );
  const availableDepartments = $derived(
    Array.from(new Set(data.examStats?.map((e: any) => e.department) ?? [])).filter(Boolean)
  );
  const availableLecturers = $derived(
    Array.from(new Set(data.examStats?.map((e: any) => e.lecturer_name) ?? [])).filter(Boolean)
  );
  const availableCourses = $derived(
    Array.from(new Set(data.examStats?.map((e: any) => e.course_code) ?? [])).filter(Boolean)
  );

  // Comprehensive filtered exam stats
  let filteredExamStats = $derived(
    data.examStats?.filter((e: any) => {
      if (searchQuery && !e.exam_title?.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !e.course_code?.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !e.lecturer_name?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (selectedColleges.length > 0 && !selectedColleges.includes(e.college)) return false;
      if (selectedDepartments.length > 0 && !selectedDepartments.includes(e.department)) return false;
      if (selectedLevels.length > 0 && !selectedLevels.includes(String(e.level))) return false;
      if (selectedLecturers.length > 0 && !selectedLecturers.includes(e.lecturer_name)) return false;
      if (selectedCourses.length > 0 && !selectedCourses.includes(e.course_code)) return false;
      if (e.completion_rate < minCompletionRate) return false;
      if (e.avg_pct < minAvgScore) return false;
      if (e.avg_pct > maxAvgScore) return false;
      if (statusFilter === 'active' && e.status !== 'active') return false;
      if (statusFilter === 'completed' && e.status !== 'completed') return false;
      if (statusFilter === 'upcoming' && e.status !== 'upcoming') return false;
      if (passFilter === 'passed' && e.pass_rate < 50) return false;
      if (passFilter === 'failed' && e.pass_rate >= 50) return false;
      if (submissionFilter === 'submitted' && e.completion_rate < 100) return false;
      if (submissionFilter === 'not_submitted' && e.completion_rate > 0) return false;
      if (submissionFilter === 'partial' && (e.completion_rate === 0 || e.completion_rate === 100)) return false;
      return true;
    }) ?? []
  );

  // Aggregated stats
  const totalStudents = $derived(filteredExamStats.reduce((a: number, e: any) => a + (e.total ?? 0), 0));
  const totalSubmitted = $derived(filteredExamStats.reduce((a: number, e: any) => a + (e.submitted ?? 0), 0));
  const totalNotSubmitted = $derived(totalStudents - totalSubmitted);
  const totalPassed = $derived(filteredExamStats.reduce((a: number, e: any) => a + (e.passed ?? 0), 0));
  const totalFailed = $derived(filteredExamStats.reduce((a: number, e: any) => a + (e.failed ?? 0), 0));
  const totalPending = $derived(totalStudents - totalPassed - totalFailed);
  const avgCompletion = $derived(filteredExamStats.length > 0
    ? Math.round(filteredExamStats.reduce((a: number, e: any) => a + (e.completion_rate ?? 0), 0) / filteredExamStats.length)
    : 0);
  const avgPassRate = $derived(filteredExamStats.length > 0
    ? Math.round(filteredExamStats.reduce((a: number, e: any) => a + (e.pass_rate ?? 0), 0) / filteredExamStats.length)
    : 0);
  const avgScore = $derived(filteredExamStats.length > 0
    ? Math.round(filteredExamStats.reduce((a: number, e: any) => a + (e.avg_pct ?? 0), 0) / filteredExamStats.length)
    : 0);
 const total = totalSubmitted + totalNotSubmitted
  // Lecturer-bound reports
  const lecturerReports = $derived(
    Object.entries(
      filteredExamStats.reduce((acc: any, e: any) => {
        const key = e.lecturer_name || 'Unknown';
        if (!acc[key]) {
          acc[key] = {
            lecturer: key,
            college: e.college,
            department: e.department,
            courses: [],
            totalStudents: 0,
            totalSubmitted: 0,
            totalPassed: 0,
            totalFailed: 0,
            avgScore: 0,
            avgPassRate: 0,
            examCount: 0,
            violationCount: 0,
          };
        }
        acc[key].courses.push(e.course_code);
        acc[key].totalStudents += e.total ?? 0;
        acc[key].totalSubmitted += e.submitted ?? 0;
        acc[key].totalPassed += e.passed ?? 0;
        acc[key].totalFailed += e.failed ?? 0;
        acc[key].examCount += 1;
        acc[key].violationCount += e.violation_count ?? 0;
        return acc;
      }, {})
    ).map(([_, v]: [string, any]) => ({
      ...v,
      courses: Array.from(new Set(v.courses)),
      completionRate: v.totalStudents > 0 ? Math.round((v.totalSubmitted / v.totalStudents) * 100) : 0,
      avgScore: v.examCount > 0 ? Math.round((v.avgScore + filteredExamStats
        .filter((e: any) => e.lecturer_name === v.lecturer)
        .reduce((a: number, e: any) => a + (e.avg_pct ?? 0), 0)) / v.examCount) : 0,
      avgPassRate: v.examCount > 0 ? Math.round((v.avgPassRate + filteredExamStats
        .filter((e: any) => e.lecturer_name === v.lecturer)
        .reduce((a: number, e: any) => a + (e.pass_rate ?? 0), 0)) / v.examCount) : 0,
    }))
  );

  // College/Department/Level breakdowns
  const collegeBreakdown = $derived(
    Object.entries(
      filteredExamStats.reduce((acc: any, e: any) => {
        const key = e.college || 'Unassigned';
        if (!acc[key]) acc[key] = { name: key, exams: 0, students: 0, submitted: 0, passed: 0, failed: 0, violations: 0 };
        acc[key].exams += 1;
        acc[key].students += e.total ?? 0;
        acc[key].submitted += e.submitted ?? 0;
        acc[key].passed += e.passed ?? 0;
        acc[key].failed += e.failed ?? 0;
        acc[key].violations += e.violation_count ?? 0;
        return acc;
      }, {})
    ).map(([_, v]: [string, any]) => v)
  );

  const deptBreakdown = $derived(
    Object.entries(
      filteredExamStats.reduce((acc: any, e: any) => {
        const key = e.department || 'Unassigned';
        if (!acc[key]) acc[key] = { name: key, college: e.college, exams: 0, students: 0, submitted: 0, passed: 0, failed: 0 };
        acc[key].exams += 1;
        acc[key].students += e.total ?? 0;
        acc[key].submitted += e.submitted ?? 0;
        acc[key].passed += e.passed ?? 0;
        acc[key].failed += e.failed ?? 0;
        return acc;
      }, {})
    ).map(([_, v]: [string, any]) => v)
  );

  const levelBreakdown = $derived(
    Object.entries(
      filteredExamStats.reduce((acc: any, e: any) => {
        const key = String(e.level || 'Unknown');
        if (!acc[key]) acc[key] = { level: key, exams: 0, students: 0, submitted: 0, passed: 0, failed: 0 };
        acc[key].exams += 1;
        acc[key].students += e.total ?? 0;
        acc[key].submitted += e.submitted ?? 0;
        acc[key].passed += e.passed ?? 0;
        acc[key].failed += e.failed ?? 0;
        return acc;
      }, {})
    ).map(([_, v]: [string, any]) => v).sort((a: any, b: any) => parseInt(a.level) - parseInt(b.level))
  );

  // Chart calculations
  const maxDay = $derived(Math.max(...(data.dailyActivity?.map((d: any) => d.sessions) ?? [1]), 1));
  const maxViolations = $derived(Math.max(...(data.violationBreakdown?.map((v: any) => v.count) ?? [1]), 1));

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function formatDateFull(dateStr: string) {
    return new Date(dateStr).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function getRangeLabel(value: string) {
    return ranges.find(r => r.value === value)?.label || value;
  }

  // PDF Export
  async function exportToPDF() {
    isExporting = true;
    await tick();
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const element = document.getElementById('reports-export-container');
      if (!element) return;
      const canvas = await html2canvas(element, {
        scale: 2, useCORS: true, logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        width: element.scrollWidth,
        height: element.scrollHeight
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      let scaledHeight = imgHeight * ratio;
      let scaledWidth = imgWidth * ratio;
      let position = 20;
      let heightLeft = scaledHeight;
      pdf.setFontSize(16);
      pdf.setTextColor(22, 163, 74);
      pdf.text('MOUAU eTest — Reports', pdfWidth / 2, 12, { align: 'center' });
      pdf.setFontSize(9);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Range: ${getRangeLabel(dateRange)} · Generated: ${new Date().toLocaleString()}`, pdfWidth / 2, 18, { align: 'center' });
      pdf.addImage(imgData, 'PNG', imgX, position, scaledWidth, scaledHeight);
      heightLeft -= (pdfHeight - 20);
      while (heightLeft > 0) {
        position = heightLeft - scaledHeight + 20;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', imgX, position, scaledWidth, scaledHeight);
        heightLeft -= pdfHeight;
      }
      pdf.save(`reports-${dateRange}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to export PDF.');
    } finally {
      isExporting = false;
    }
  }

  // Print Report
  async function printReport() {
    isPrinting = true;
    await tick();
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to print reports.');
        return;
      }

      const scopeLabel = {
        all: 'All Exams',
        college: `College: ${selectedPrintCollege}`,
        department: `Department: ${selectedPrintDept}`,
        level: `Level: ${selectedPrintLevel}`,
        lecturer: `Lecturer: ${selectedPrintLecturer}`,
        course: `Course: ${selectedPrintCourse}`,
      }[printScope];

      const printData = filteredExamStats.filter((e: any) => {
        if (printScope === 'college') return e.college === selectedPrintCollege;
        if (printScope === 'department') return e.department === selectedPrintDept;
        if (printScope === 'level') return String(e.level) === selectedPrintLevel;
        if (printScope === 'lecturer') return e.lecturer_name === selectedPrintLecturer;
        if (printScope === 'course') return e.course_code === selectedPrintCourse;
        return true;
      });

      const printHtml = `<!DOCTYPE html>
        <html><head><title>MOUAU eTest — Exam Report</title>
        <style>
          *{margin:0;padding:0;box-sizing:border-box}
          body{font-family:'Segoe UI',system-ui,sans-serif;padding:40px;color:#1a1a1a}
          .header{text-align:center;margin-bottom:30px;padding-bottom:20px;border-bottom:3px solid #16a34a}
          .header h1{font-size:24px;color:#16a34a;margin-bottom:8px}
          .header p{color:#64748b;font-size:13px}
          .meta{display:flex;justify-content:space-between;margin-bottom:20px;font-size:12px;color:#64748b}
          .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-bottom:30px}
          .stat-box{border:1.5px solid #e2e8f0;border-radius:10px;padding:15px;text-align:center}
          .stat-box .value{font-size:28px;font-weight:800;color:#16a34a}
          .stat-box .label{font-size:11px;text-transform:uppercase;color:#64748b;margin-top:4px}
          table{width:100%;border-collapse:collapse;margin-top:20px;font-size:12px}
          th{background:#f0fdf4;padding:10px;text-align:left;font-size:10px;text-transform:uppercase;color:#16a34a;border-bottom:2px solid #16a34a}
          td{padding:10px;border-bottom:1px solid #e2e8f0}
          tr:hover{background:#f8fafc}
          .num{text-align:right}
          .badge{background:#dcfce7;color:#16a34a;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700}
          .pass{color:#16a34a;font-weight:700}
          .fail{color:#dc2626;font-weight:700}
          .pending{color:#f59e0b;font-weight:700}
          .footer{margin-top:40px;padding-top:15px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8}
          @media print{body{padding:20px}.no-print{display:none}}
        </style></head>
        <body>
          <div class="header">
            <h1>MOUAU eTest — Exam Report</h1>
            <p>${scopeLabel} · ${getRangeLabel(dateRange)} · Generated ${new Date().toLocaleString()}</p>
          </div>
          <div class="meta">
            <span>Total Exams: ${printData.length}</span>
            <span>Report Scope: ${scopeLabel}</span>
          </div>
          <div class="stats-grid">
            <div class="stat-box"><div class="value">${printData.reduce((a: number, e: any) => a + (e.total ?? 0), 0)}</div><div class="label">Total Students</div></div>
            <div class="stat-box"><div class="value">${printData.reduce((a: number, e: any) => a + (e.submitted ?? 0), 0)}</div><div class="label">Submitted</div></div>
            <div class="stat-box"><div class="value">${printData.reduce((a: number, e: any) => a + (e.passed ?? 0), 0)}</div><div class="label">Passed</div></div>
            <div class="stat-box"><div class="value">${printData.reduce((a: number, e: any) => a + (e.failed ?? 0), 0)}</div><div class="label">Failed</div></div>
          </div>
          <table>
            <thead><tr><th>Course</th><th>Exam Title</th><th>Lecturer</th><th>Level</th><th class="num">Students</th><th class="num">Submitted</th><th class="num">Not Submitted</th><th class="num">Passed</th><th class="num">Failed</th><th class="num">Pass Rate</th><th class="num">Avg Score</th></tr></thead>
            <tbody>
              ${printData.map((e: any) => `<tr>
                <td><span class="badge">${e.course_code}</span></td>
                <td>${e.exam_title}</td>
                <td>${e.lecturer_name || '—'}</td>
                <td>${e.level || '—'}</td>
                <td class="num">${e.total}</td>
                <td class="num pass">${e.submitted}</td>
                <td class="num pending">${e.total - e.submitted}</td>
                <td class="num pass">${e.passed}</td>
                <td class="num fail">${e.failed}</td>
                <td class="num">${e.pass_rate}%</td>
                <td class="num">${e.avg_pct}%</td>
              </tr>`).join('')}
            </tbody>
          </table>
          <div class="footer">
            <p>MOUAU eTest System · Confidential Academic Report</p>
            <p>Printed by Administrator · ${new Date().toLocaleString()}</p>
          </div>
          <div class="no-print" style="margin-top:30px;text-align:center">
            <button onclick="window.print()" style="padding:12px 32px;background:#16a34a;color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">Print This Report</button>
          </div>
        </body></html>`;

      printWindow.document.write(printHtml);
      printWindow.document.close();
      showPrintModal = false;
    } catch (err) {
      console.error('Print failed:', err);
      alert('Failed to generate print report.');
    } finally {
      isPrinting = false;
    }
  }

  function changeRange(newRange: string) {
    dateRange = newRange;
    showRangeDropdown = false;
    const url = new URL(window.location.href);
    url.searchParams.set('range', newRange);
    window.location.href = url.toString();
  }

  function toggleInArray(arr: string[], item: string) {
    if (arr.includes(item)) return arr.filter(x => x !== item);
    return [...arr, item];
  }

  function clearAllFilters() {
    selectedColleges = [];
    selectedDepartments = [];
    selectedLevels = [];
    selectedLecturers = [];
    selectedCourses = [];
    minCompletionRate = 0;
    minAvgScore = 0;
    maxAvgScore = 100;
    statusFilter = 'all';
    passFilter = 'all';
    submissionFilter = 'all';
    searchQuery = '';
  }

  function getActiveFilterCount() {
    return selectedColleges.length + selectedDepartments.length + selectedLevels.length +
      selectedLecturers.length + selectedCourses.length +
      (minCompletionRate > 0 ? 1 : 0) + (minAvgScore > 0 ? 1 : 0) + (maxAvgScore < 100 ? 1 : 0) +
      (statusFilter !== 'all' ? 1 : 0) + (passFilter !== 'all' ? 1 : 0) +
      (submissionFilter !== 'all' ? 1 : 0) + (searchQuery ? 1 : 0);
  }
</script>
<svelte:head><title>Reports — MOUAU eTest Admin</title></svelte:head>

<div class="page">

  <!-- ══ HEADER ═══════════════════════════════════════════════ -->
  <header class="page-header">
    <div class="header-left">
      <div class="header-icon">
        <FileText size={24} />
      </div>
      <div>
        <h1>System Reports</h1>
        <p class="subtitle">Analytics, performance metrics & violation tracking</p>
      </div>
    </div>
    <div class="header-right">
      <div class="dropdown">
        <button class="dropdown-trigger" onclick={() => showRangeDropdown = !showRangeDropdown}>
          <Calendar size={14} />
          <span>{getRangeLabel(dateRange)}</span>
          <ChevronDown size={14} class={`dropdown-chevron ${showRangeDropdown ? 'rotated' : ''}`} />
        </button>
        {#if showRangeDropdown}
          <div class="dropdown-menu range-menu">
            {#each ranges as r}
              <button class="dropdown-item" class:active={dateRange === r.value} onclick={() => changeRange(r.value)}>
                <span>{r.label}</span>
                {#if dateRange === r.value}
                  <CheckCircle size={14} class="dropdown-check" />
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <button class="btn-secondary" onclick={() => showFilters = !showFilters}>
        <Filter size={14} />
        Filters
        {#if getActiveFilterCount() > 0}
          <span class="filter-badge">{getActiveFilterCount()}</span>
        {/if}
      </button>

      <button class="btn-secondary" onclick={() => showPrintModal = true}>
        <Printer size={14} />
        Print
      </button>

      <button class="btn-primary" onclick={exportToPDF} disabled={isExporting}>
        {#if isExporting}
          <RefreshCw size={14} class="spin" />
          Exporting...
        {:else}
          <Download size={14} />
          Export PDF
        {/if}
      </button>
    </div>
  </header>

  <!-- ══ TABS ═════════════════════════════════════════════════ -->
  <nav class="tab-bar">
    {#each [
      { id: 'overview', label: 'Overview', icon: BarChart3 },
      { id: 'exams', label: 'Exams', icon: BookOpen },
      { id: 'lecturers', label: 'Lecturers', icon: UserCheck },
      { id: 'students', label: 'Students', icon: GraduationCap },
      { id: 'violations', label: 'Violations', icon: AlertTriangle },
    ] as tab}
      <button class="tab-btn" class:active={activeTab === tab.id} onclick={() => activeTab = tab.id}>
        <tab.icon size={14} />
        <span>{tab.label}</span>
      </button>
    {/each}
  </nav>

  <!-- ══ PRINT MODAL ════════════════════════════════════════ -->
  {#if showPrintModal}
    <div class="modal-overlay" onclick={() => showPrintModal = false}>
      <div class="modal" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <h3><Printer size={18} /> Print Exam Report</h3>
          <button class="modal-close" onclick={() => showPrintModal = false}><X size={18} /></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Report Scope</label>
            <div class="scope-options">
              {#each [
                { value: 'all', label: 'All Exams' },
                { value: 'college', label: 'By College' },
                { value: 'department', label: 'By Department' },
                { value: 'level', label: 'By Level' },
                { value: 'lecturer', label: 'By Lecturer' },
                { value: 'course', label: 'By Course' },
              ] as scope}
                <button class="scope-btn" class:active={printScope === scope.value} onclick={() => printScope = scope.value}>
                  {scope.label}
                </button>
              {/each}
            </div>
          </div>

          {#if printScope === 'college'}
            <div class="form-group">
              <label>Select College</label>
              <select bind:value={selectedPrintCollege}>
                <option value="">Choose a college...</option>
                {#each availableColleges as c}
                  <option value={c}>{c}</option>
                {/each}
              </select>
            </div>
          {/if}

          {#if printScope === 'department'}
            <div class="form-group">
              <label>Select Department</label>
              <select bind:value={selectedPrintDept}>
                <option value="">Choose a department...</option>
                {#each availableDepartments as d}
                  <option value={d}>{d}</option>
                {/each}
              </select>
            </div>
          {/if}

          {#if printScope === 'level'}
            <div class="form-group">
              <label>Select Level</label>
              <select bind:value={selectedPrintLevel}>
                <option value="">Choose a level...</option>
                {#each levels as l}
                  <option value={l}>{l} Level</option>
                {/each}
              </select>
            </div>
          {/if}

          {#if printScope === 'lecturer'}
            <div class="form-group">
              <label>Select Lecturer</label>
              <select bind:value={selectedPrintLecturer}>
                <option value="">Choose a lecturer...</option>
                {#each availableLecturers as l}
                  <option value={l}>{l}</option>
                {/each}
              </select>
            </div>
          {/if}

          {#if printScope === 'course'}
            <div class="form-group">
              <label>Select Course</label>
              <select bind:value={selectedPrintCourse}>
                <option value="">Choose a course...</option>
                {#each availableCourses as c}
                  <option value={c}>{c}</option>
                {/each}
              </select>
            </div>
          {/if}
        </div>
        <div class="modal-footer">
          <button class="btn-outline" onclick={() => showPrintModal = false}>Cancel</button>
          <button class="btn-primary" onclick={printReport} disabled={isPrinting || (printScope !== 'all' && !selectedPrintCollege && !selectedPrintDept && !selectedPrintLevel && !selectedPrintLecturer && !selectedPrintCourse)}>
            {#if isPrinting}
              <RefreshCw size={14} class="spin" /> Generating...
            {:else}
              <Printer size={14} /> Generate Report
            {/if}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- ══ ADVANCED FILTERS ═══════════════════════════════════ -->
  {#if showFilters}
    <div class="filters-panel">
      <div class="filters-header">
        <h3><Filter size={16} /> Advanced Filters</h3>
        <button class="close-filters" onclick={() => showFilters = false}><X size={16} /></button>
      </div>

      <div class="filters-grid">
        <div class="filter-group">
          <label>Colleges</label>
          <div class="dropdown">
            <button class="dropdown-trigger filter-trigger" onclick={() => showCollegeDropdown = !showCollegeDropdown}>
              <span>{selectedColleges.length === 0 ? 'All Colleges' : `${selectedColleges.length} selected`}</span>
              <ChevronDown size={14} class={`dropdown-chevron ${showCollegeDropdown ? 'rotated' : ''}`} />
            </button>
            {#if showCollegeDropdown}
              <div class="dropdown-menu">
                {#each availableColleges as college}
                  <label class="dropdown-checkbox">
                    <input type="checkbox" checked={selectedColleges.includes(college)} onchange={() => selectedColleges = toggleInArray(selectedColleges, college)} />
                    <span>{college}</span>
                  </label>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <div class="filter-group">
          <label>Departments</label>
          <div class="dropdown">
            <button class="dropdown-trigger filter-trigger" onclick={() => showDeptDropdown = !showDeptDropdown}>
              <span>{selectedDepartments.length === 0 ? 'All Departments' : `${selectedDepartments.length} selected`}</span>
              <ChevronDown size={14} class={`dropdown-chevron ${showDeptDropdown ? 'rotated' : ''}`} />
            </button>
            {#if showDeptDropdown}
              <div class="dropdown-menu">
                {#each availableDepartments as dept}
                  <label class="dropdown-checkbox">
                    <input type="checkbox" checked={selectedDepartments.includes(dept)} onchange={() => selectedDepartments = toggleInArray(selectedDepartments, dept)} />
                    <span>{dept}</span>
                  </label>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <div class="filter-group">
          <label>Levels</label>
          <div class="dropdown">
            <button class="dropdown-trigger filter-trigger" onclick={() => showLevelDropdown = !showLevelDropdown}>
              <span>{selectedLevels.length === 0 ? 'All Levels' : `${selectedLevels.length} selected`}</span>
              <ChevronDown size={14} class={`dropdown-chevron ${showLevelDropdown ? 'rotated' : ''}`} />
            </button>
            {#if showLevelDropdown}
              <div class="dropdown-menu">
                {#each levels as level}
                  <label class="dropdown-checkbox">
                    <input type="checkbox" checked={selectedLevels.includes(level)} onchange={() => selectedLevels = toggleInArray(selectedLevels, level)} />
                    <span>{level} Level</span>
                  </label>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <div class="filter-group">
          <label>Lecturers</label>
          <div class="dropdown">
            <button class="dropdown-trigger filter-trigger" onclick={() => showLecturerDropdown = !showLecturerDropdown}>
              <span>{selectedLecturers.length === 0 ? 'All Lecturers' : `${selectedLecturers.length} selected`}</span>
              <ChevronDown size={14} class={`dropdown-chevron ${showLecturerDropdown ? 'rotated' : ''}`} />
            </button>
            {#if showLecturerDropdown}
              <div class="dropdown-menu">
                {#each availableLecturers as lecturer}
                  <label class="dropdown-checkbox">
                    <input type="checkbox" checked={selectedLecturers.includes(lecturer)} onchange={() => selectedLecturers = toggleInArray(selectedLecturers, lecturer)} />
                    <span>{lecturer}</span>
                  </label>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <div class="filter-group">
          <label>Courses</label>
          <div class="dropdown">
            <button class="dropdown-trigger filter-trigger" onclick={() => showCourseDropdown = !showCourseDropdown}>
              <span>{selectedCourses.length === 0 ? 'All Courses' : `${selectedCourses.length} selected`}</span>
              <ChevronDown size={14} class={`dropdown-chevron ${showCourseDropdown ? 'rotated' : ''}`} />
            </button>
            {#if showCourseDropdown}
              <div class="dropdown-menu">
                {#each availableCourses as course}
                  <label class="dropdown-checkbox">
                    <input type="checkbox" checked={selectedCourses.includes(course)} onchange={() => selectedCourses = toggleInArray(selectedCourses, course)} />
                    <span>{course}</span>
                  </label>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <div class="filter-group">
          <label>Exam Status</label>
          <div class="status-buttons">
            {#each [{k:'all',l:'All'},{k:'active',l:'Active'},{k:'completed',l:'Completed'},{k:'upcoming',l:'Upcoming'}] as s}
              <button class="status-btn" class:active={statusFilter === s.k} onclick={() => statusFilter = s.k}>{s.l}</button>
            {/each}
          </div>
        </div>

        <div class="filter-group">
          <label>Pass Status</label>
          <div class="status-buttons">
            {#each [{k:'all',l:'All'},{k:'passed',l:'Passed'},{k:'failed',l:'Failed'},{k:'pending',l:'Pending'}] as s}
              <button class="status-btn" class:active={passFilter === s.k} onclick={() => passFilter = s.k}>{s.l}</button>
            {/each}
          </div>
        </div>

        <div class="filter-group">
          <label>Submission</label>
          <div class="status-buttons">
            {#each [{k:'all',l:'All'},{k:'submitted',l:'Submitted'},{k:'not_submitted',l:'Not Submitted'},{k:'partial',l:'Partial'}] as s}
              <button class="status-btn" class:active={submissionFilter === s.k} onclick={() => submissionFilter = s.k}>{s.l}</button>
            {/each}
          </div>
        </div>

        <div class="filter-group">
          <label>Min Completion: {minCompletionRate}%</label>
          <input type="range" min="0" max="100" bind:value={minCompletionRate} class="slider" />
        </div>

        <div class="filter-group">
          <label>Score Range: {minAvgScore}% — {maxAvgScore}%</label>
          <div class="range-inputs">
            <input type="range" min="0" max="100" bind:value={minAvgScore} class="slider" />
            <input type="range" min="0" max="100" bind:value={maxAvgScore} class="slider" />
          </div>
        </div>
      </div>

      {#if getActiveFilterCount() > 0}
        <div class="active-filters">
          <span class="active-filters-label">Active:</span>
          {#if selectedColleges.length > 0}
            <span class="filter-tag">{selectedColleges.length} college{selectedColleges.length > 1 ? 's' : ''} <button onclick={() => selectedColleges = []}><X size={10} /></button></span>
          {/if}
          {#if selectedDepartments.length > 0}
            <span class="filter-tag">{selectedDepartments.length} dept{selectedDepartments.length > 1 ? 's' : ''} <button onclick={() => selectedDepartments = []}><X size={10} /></button></span>
          {/if}
          {#if selectedLevels.length > 0}
            <span class="filter-tag">{selectedLevels.length} level{selectedLevels.length > 1 ? 's' : ''} <button onclick={() => selectedLevels = []}><X size={10} /></button></span>
          {/if}
          {#if selectedLecturers.length > 0}
            <span class="filter-tag">{selectedLecturers.length} lecturer{selectedLecturers.length > 1 ? 's' : ''} <button onclick={() => selectedLecturers = []}><X size={10} /></button></span>
          {/if}
          {#if selectedCourses.length > 0}
            <span class="filter-tag">{selectedCourses.length} course{selectedCourses.length > 1 ? 's' : ''} <button onclick={() => selectedCourses = []}><X size={10} /></button></span>
          {/if}
          {#if minCompletionRate > 0}
            <span class="filter-tag">Completion ≥ {minCompletionRate}% <button onclick={() => minCompletionRate = 0}><X size={10} /></button></span>
          {/if}
          {#if minAvgScore > 0}
            <span class="filter-tag">Score ≥ {minAvgScore}% <button onclick={() => minAvgScore = 0}><X size={10} /></button></span>
          {/if}
          {#if maxAvgScore < 100}
            <span class="filter-tag">Score ≤ {maxAvgScore}% <button onclick={() => maxAvgScore = 100}><X size={10} /></button></span>
          {/if}
          {#if statusFilter !== 'all'}
            <span class="filter-tag">Status: {statusFilter} <button onclick={() => statusFilter = 'all'}><X size={10} /></button></span>
          {/if}
          {#if passFilter !== 'all'}
            <span class="filter-tag">Pass: {passFilter} <button onclick={() => passFilter = 'all'}><X size={10} /></button></span>
          {/if}
          {#if submissionFilter !== 'all'}
            <span class="filter-tag">Submit: {submissionFilter} <button onclick={() => submissionFilter = 'all'}><X size={10} /></button></span>
          {/if}
          {#if searchQuery}
            <span class="filter-tag">Search: {searchQuery} <button onclick={() => searchQuery = ''}><X size={10} /></button></span>
          {/if}
          <button class="clear-filters" onclick={clearAllFilters}>Clear all</button>
        </div>
      {/if}
    </div>
  {/if}

  <!-- ══ OVERVIEW TAB ═══════════════════════════════════════ -->
  {#if activeTab === 'overview'}
    <section class="summary-cards">
      <div class="summary-card">
        <div class="summary-icon blue"><BookOpen size={18} /></div>
        <div class="summary-info">
          <span class="summary-value">{filteredExamStats.length}</span>
          <span class="summary-label">Exams</span>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon green"><Users size={18} /></div>
        <div class="summary-info">
          <span class="summary-value">{totalStudents}</span>
          <span class="summary-label">Total Students</span>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon teal"><CheckCircle size={18} /></div>
        <div class="summary-info">
          <span class="summary-value">{totalSubmitted}</span>
          <span class="summary-label">Submitted</span>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon amber"><UserX size={18} /></div>
        <div class="summary-info">
          <span class="summary-value">{totalNotSubmitted}</span>
          <span class="summary-label">Not Submitted</span>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon green"><Award size={18} /></div>
        <div class="summary-info">
          <span class="summary-value">{totalPassed}</span>
          <span class="summary-label">Passed</span>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon red"><XCircle size={18} /></div>
        <div class="summary-info">
          <span class="summary-value">{totalFailed}</span>
          <span class="summary-label">Failed</span>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon purple"><MinusCircle size={18} /></div>
        <div class="summary-info">
          <span class="summary-value">{totalPending}</span>
          <span class="summary-label">Pending</span>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon amber"><Percent size={18} /></div>
        <div class="summary-info">
          <span class="summary-value">{avgPassRate}%</span>
          <span class="summary-label">Avg Pass Rate</span>
        </div>
      </div>
    </section>

    <section class="charts-row">
      <div class="chart-card wide">
        <div class="chart-header">
          <div class="chart-title-wrap">
            <BarChart3 size={16} color="#16a34a" />
            <h3>Daily Activity</h3>
          </div>
          <div class="chart-legend">
            <span class="legend-item"><span class="legend-dot sessions"></span>Sessions</span>
            <span class="legend-item"><span class="legend-dot submissions"></span>Submissions</span>
            <span class="legend-item"><span class="legend-dot avg"></span>Avg Score</span>
          </div>
        </div>
        <div class="chart-body">
          {#if !data.dailyActivity?.length}
            <div class="empty-chart">No activity data for selected range.</div>
          {:else}
            <div class="bar-chart">
              {#each data.dailyActivity as d}
                <div class="day-col">
                  <div class="bar-stack">
                    <div class="bar sessions" style="height: {(d.sessions / maxDay) * 120}px" title="{d.sessions} sessions"></div>
                    <div class="bar submissions" style="height: {(d.submissions / maxDay) * 120}px" title="{d.submissions} submissions"></div>
                  </div>
                  <span class="day-label">{formatDate(d.day)}</span>
                  {#if d.avg_score > 0}
                    <span class="day-score">{d.avg_score}%</span>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <div class="chart-title-wrap">
            <PieChart size={16} color="#a78bfa" />
            <h3>Submission Status</h3>
          </div>
        </div>
        <div class="chart-body pie-body">
         
          <div class="pie-chart">
            <svg viewBox="0 0 100 100" class="pie-svg">
              {#if total > 0}
                {@const submittedPct = totalSubmitted / total}
                {@const notSubmittedPct = totalNotSubmitted / total}
                {@const x1s = 50 + 38 * Math.cos((0 - 90) * Math.PI / 180)}
                {@const y1s = 50 + 38 * Math.sin((0 - 90) * Math.PI / 180)}
                {@const x2s = 50 + 38 * Math.cos((submittedPct * 360 - 90) * Math.PI / 180)}
                {@const y2s = 50 + 38 * Math.sin((submittedPct * 360 - 90) * Math.PI / 180)}
                {@const las = submittedPct * 360 > 180 ? 1 : 0}
                {@const x1n = 50 + 38 * Math.cos((submittedPct * 360 - 90) * Math.PI / 180)}
                {@const y1n = 50 + 38 * Math.sin((submittedPct * 360 - 90) * Math.PI / 180)}
                {@const x2n = 50 + 38 * Math.cos(((submittedPct + notSubmittedPct) * 360 - 90) * Math.PI / 180)}
                {@const y2n = 50 + 38 * Math.sin(((submittedPct + notSubmittedPct) * 360 - 90) * Math.PI / 180)}
                {@const lan = notSubmittedPct * 360 > 180 ? 1 : 0}
                <path d="M 50 50 L {x1s} {y1s} A 38 38 0 {las} 1 {x2s} {y2s} Z" fill="#16a34a" opacity="0.85" stroke="white" stroke-width="2" />
                <path d="M 50 50 L {x1n} {y1n} A 38 38 0 {lan} 1 {x2n} {y2n} Z" fill="#f59e0b" opacity="0.85" stroke="white" stroke-width="2" />
              {/if}
              <circle cx="50" cy="50" r="22" fill="var(--color-surface, white)" />
              <text x="50" y="47" text-anchor="middle" font-size="11" font-weight="700" fill="var(--color-text, #1a1a1a)">{total}</text>
              <text x="50" y="57" text-anchor="middle" font-size="5" fill="var(--color-muted, #94a3b8)">Total</text>
            </svg>
          </div>
          <div class="pie-legend compact">
            <div class="pie-legend-item">
              <span class="pie-legend-dot" style="background: #16a34a"></span>
              <span class="pie-legend-label">Submitted</span>
              <span class="pie-legend-value">{totalSubmitted} ({total > 0 ? Math.round((totalSubmitted / total) * 100) : 0}%)</span>
            </div>
            <div class="pie-legend-item">
              <span class="pie-legend-dot" style="background: #f59e0b"></span>
              <span class="pie-legend-label">Not Submitted</span>
              <span class="pie-legend-value">{totalNotSubmitted} ({total > 0 ? Math.round((totalNotSubmitted / total) * 100) : 0}%)</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="breakdown-grid">
      <section class="panel">
        <div class="panel-head">
          <div class="panel-title-wrap">
            <Building2 size={15} />
            <h2>By College</h2>
          </div>
          <span class="panel-count">{collegeBreakdown.length}</span>
        </div>
        <div class="breakdown-list">
          {#each collegeBreakdown as c}
            {@const completion = c.students > 0 ? Math.round((c.submitted / c.students) * 100) : 0}
            {@const passRate = c.students > 0 ? Math.round((c.passed / c.students) * 100) : 0}
            <div class="breakdown-row">
              <div class="breakdown-info">
                <span class="breakdown-name">{c.name}</span>
                <span class="breakdown-meta">{c.exams} exams · {c.students} students</span>
              </div>
              <div class="breakdown-bars">
                <div class="breakdown-bar-group">
                  <span class="breakdown-bar-label">Completion</span>
                  <div class="breakdown-bar-wrap">
                    <div class="breakdown-bar green" style="width: {completion}%"></div>
                  </div>
                  <span class="breakdown-bar-value">{completion}%</span>
                </div>
                <div class="breakdown-bar-group">
                  <span class="breakdown-bar-label">Pass Rate</span>
                  <div class="breakdown-bar-wrap">
                    <div class="breakdown-bar blue" style="width: {passRate}%"></div>
                  </div>
                  <span class="breakdown-bar-value">{passRate}%</span>
                </div>
              </div>
              <div class="breakdown-stats">
                <span class="breakdown-stat pass">{c.passed}P</span>
                <span class="breakdown-stat fail">{c.failed}F</span>
                {#if c.violations > 0}
                  <span class="breakdown-stat warn">{c.violations}V</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div class="panel-title-wrap">
            <School size={15} />
            <h2>By Department</h2>
          </div>
          <span class="panel-count">{deptBreakdown.length}</span>
        </div>
        <div class="breakdown-list">
          {#each deptBreakdown as d}
            {@const completion = d.students > 0 ? Math.round((d.submitted / d.students) * 100) : 0}
            {@const passRate = d.students > 0 ? Math.round((d.passed / d.students) * 100) : 0}
            <div class="breakdown-row">
              <div class="breakdown-info">
                <span class="breakdown-name">{d.name}</span>
                <span class="breakdown-meta">{d.college || '—'} · {d.exams} exams</span>
              </div>
              <div class="breakdown-bars">
                <div class="breakdown-bar-group">
                  <span class="breakdown-bar-label">Completion</span>
                  <div class="breakdown-bar-wrap">
                    <div class="breakdown-bar green" style="width: {completion}%"></div>
                  </div>
                  <span class="breakdown-bar-value">{completion}%</span>
                </div>
                <div class="breakdown-bar-group">
                  <span class="breakdown-bar-label">Pass Rate</span>
                  <div class="breakdown-bar-wrap">
                    <div class="breakdown-bar blue" style="width: {passRate}%"></div>
                  </div>
                  <span class="breakdown-bar-value">{passRate}%</span>
                </div>
              </div>
              <div class="breakdown-stats">
                <span class="breakdown-stat pass">{d.passed}P</span>
                <span class="breakdown-stat fail">{d.failed}F</span>
              </div>
            </div>
          {/each}
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div class="panel-title-wrap">
            <Layers size={15} />
            <h2>By Level</h2>
          </div>
          <span class="panel-count">{levelBreakdown.length}</span>
        </div>
        <div class="breakdown-list">
          {#each levelBreakdown as l}
            {@const completion = l.students > 0 ? Math.round((l.submitted / l.students) * 100) : 0}
            {@const passRate = l.students > 0 ? Math.round((l.passed / l.students) * 100) : 0}
            <div class="breakdown-row">
              <div class="breakdown-info">
                <span class="breakdown-name">{l.level} Level</span>
                <span class="breakdown-meta">{l.exams} exams · {l.students} students</span>
              </div>
              <div class="breakdown-bars">
                <div class="breakdown-bar-group">
                  <span class="breakdown-bar-label">Completion</span>
                  <div class="breakdown-bar-wrap">
                    <div class="breakdown-bar green" style="width: {completion}%"></div>
                  </div>
                  <span class="breakdown-bar-value">{completion}%</span>
                </div>
                <div class="breakdown-bar-group">
                  <span class="breakdown-bar-label">Pass Rate</span>
                  <div class="breakdown-bar-wrap">
                    <div class="breakdown-bar blue" style="width: {passRate}%"></div>
                  </div>
                  <span class="breakdown-bar-value">{passRate}%</span>
                </div>
              </div>
              <div class="breakdown-stats">
                <span class="breakdown-stat pass">{l.passed}P</span>
                <span class="breakdown-stat fail">{l.failed}F</span>
              </div>
            </div>
          {/each}
        </div>
      </section>
    </div>
  {/if}

  <!-- ══ EXAMS TAB ══════════════════════════════════════════ -->
  {#if activeTab === 'exams'}
    <section class="panel panel-exams">
      <div class="panel-head">
        <div class="panel-title-wrap">
          <BookOpen size={15} />
          <h2>Exam Performance</h2>
        </div>
        <div class="panel-actions">
          <div class="search-box">
            <Search size={13} />
            <input type="text" placeholder="Search exams, courses, lecturers..." bind:value={searchQuery} />
          </div>
          <span class="panel-count">{filteredExamStats.length} results</span>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Course</th>
              <th>Exam</th>
              <th>Lecturer</th>
              <th>Level</th>
              <th class="num">Students</th>
              <th class="num">Submitted</th>
              <th class="num">Not Sub.</th>
              <th class="num">Completion</th>
              <th class="num">Passed</th>
              <th class="num">Failed</th>
              <th class="num">Pending</th>
              <th class="num">Pass Rate</th>
              <th class="num">Avg Score</th>
            </tr>
          </thead>
          <tbody>
            {#if filteredExamStats.length === 0}
              <tr><td colspan="13" class="empty">No exam data for selected filters.</td></tr>
            {:else}
              {#each filteredExamStats as e}
                <tr>
                  <td><span class="badge">{e.course_code}</span></td>
                  <td class="title-cell">{e.exam_title}</td>
                  <td>{e.lecturer_name || '—'}</td>
                  <td>{e.level || '—'}</td>
                  <td class="num">{e.total}</td>
                  <td class="num pass">{e.submitted}</td>
                  <td class="num pending">{e.total - e.submitted}</td>
                  <td class="num">
                    <div class="mini-bar-wrap">
                      <div class="mini-bar" style="width: {e.completion_rate}%"></div>
                    </div>
                    <span class="mini-bar-label">{e.completion_rate}%</span>
                  </td>
                  <td class="num pass">{e.passed}</td>
                  <td class="num fail">{e.failed}</td>
                  <td class="num pending">{e.total - e.passed - e.failed}</td>
                  <td class="num">
                    <span class="pass-rate" class:good={e.pass_rate >= 50} class:bad={e.pass_rate < 40}>
                      {e.pass_rate}%
                    </span>
                  </td>
                  <td class="num">
                    <span class="score" class:good={e.avg_pct >= 50} class:bad={e.avg_pct < 40}>
                      {e.avg_pct}%
                    </span>
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    </section>
  {/if}

  <!-- ══ LECTURERS TAB ══════════════════════════════════════ -->
  {#if activeTab === 'lecturers'}
    <section class="panel">
      <div class="panel-head">
        <div class="panel-title-wrap">
          <UserCheck size={15} />
          <h2>Lecturer Reports</h2>
        </div>
        <span class="panel-count">{lecturerReports.length} lecturers</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Lecturer</th>
              <th>College</th>
              <th>Department</th>
              <th>Courses</th>
              <th class="num">Exams</th>
              <th class="num">Students</th>
              <th class="num">Submitted</th>
              <th class="num">Completion</th>
              <th class="num">Passed</th>
              <th class="num">Failed</th>
              <th class="num">Pass Rate</th>
              <th class="num">Avg Score</th>
              <th class="num">Violations</th>
            </tr>
          </thead>
          <tbody>
            {#if lecturerReports.length === 0}
              <tr><td colspan="13" class="empty">No lecturer data available.</td></tr>
            {:else}
              {#each lecturerReports as lr}
                <tr>
                  <td class="title-cell">{lr.lecturer}</td>
                  <td>{lr.college || '—'}</td>
                  <td>{lr.department || '—'}</td>
                  <td>
                    {#each lr.courses as c, i}
                      <span class="badge">{c}</span>{#if i < lr.courses.length - 1}<span class="sep">, </span>{/if}
                    {/each}
                  </td>
                  <td class="num">{lr.examCount}</td>
                  <td class="num">{lr.totalStudents}</td>
                  <td class="num pass">{lr.totalSubmitted}</td>
                  <td class="num">
                    <div class="mini-bar-wrap">
                      <div class="mini-bar" style="width: {lr.completionRate}%"></div>
                    </div>
                    <span class="mini-bar-label">{lr.completionRate}%</span>
                  </td>
                  <td class="num pass">{lr.totalPassed}</td>
                  <td class="num fail">{lr.totalFailed}</td>
                  <td class="num">
                    <span class="pass-rate" class:good={lr.avgPassRate >= 50} class:bad={lr.avgPassRate < 40}>
                      {lr.avgPassRate}%
                    </span>
                  </td>
                  <td class="num">
                    <span class="score" class:good={lr.avgScore >= 50} class:bad={lr.avgScore < 40}>
                      {lr.avgScore}%
                    </span>
                  </td>
                  <td class="num">
                    {#if lr.violationCount > 0}
                      <span class="warn-badge">{lr.violationCount}</span>
                    {:else}
                      <span class="ok-badge">0</span>
                    {/if}
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    </section>
  {/if}

  <!-- ══ STUDENTS TAB ═══════════════════════════════════════ -->
  {#if activeTab === 'students'}
    <div class="main-grid">
      <section class="panel panel-exams">
        <div class="panel-head">
          <div class="panel-title-wrap">
            <GraduationCap size={15} />
            <h2>Student Performance</h2>
          </div>
          <div class="panel-actions">
            <div class="search-box">
              <Search size={13} />
              <input type="text" placeholder="Search students..." bind:value={searchQuery} />
            </div>
            <span class="panel-count">{data.topStudents?.length ?? 0} students</span>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th class="num">Rank</th>
                <th>Student</th>
                <th>Matric No</th>
                <th class="num">Exams Taken</th>
                <th class="num">Submitted</th>
                <th class="num">Passed</th>
                <th class="num">Failed</th>
                <th class="num">Avg Score</th>
                <th class="num">Best Score</th>
                <th class="num">Status</th>
              </tr>
            </thead>
            <tbody>
              {#if !data.topStudents?.length}
                <tr><td colspan="10" class="empty">No student data available.</td></tr>
              {:else}
                {#each data.topStudents as s, i}
                  <tr>
                    <td class="num rank">{i + 1}</td>
                    <td class="title-cell">{s.student_name}</td>
                    <td>{s.matric_number ?? '—'}</td>
                    <td class="num">{s.exams_taken}</td>
                    <td class="num pass">{s.submitted_count ?? 0}</td>
                    <td class="num pass">{s.passed_count ?? 0}</td>
                    <td class="num fail">{s.failed_count ?? 0}</td>
                    <td class="num">
                      <span class="score" class:good={(s.avg_pct ?? 0) >= 50} class:bad={(s.avg_pct ?? 0) < 40}>
                        {s.avg_pct}%
                      </span>
                    </td>
                    <td class="num">
                      <span class="score good">{s.best_pct ?? 0}%</span>
                    </td>
                    <td class="num">
                      {#if (s.avg_pct ?? 0) >= 50}
                        <span class="status-badge pass">Passed</span>
                      {:else if (s.avg_pct ?? 0) > 0}
                        <span class="status-badge fail">Failed</span>
                      {:else}
                        <span class="status-badge pending">Pending</span>
                      {/if}
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      </section>

      <div class="right-col">
        <section class="panel">
          <div class="panel-head">
            <div class="panel-title-wrap">
              <Award size={15} />
              <h2>Top Performers</h2>
            </div>
          </div>
          <div class="top-list">
            {#if !data.topStudents?.length}
              <p class="empty">No data.</p>
            {:else}
              {#each data.topStudents.slice(0, 5) as s, i}
                <div class="top-item">
                  <div class="top-rank">{i + 1}</div>
                  <div class="top-info">
                    <span class="top-name">{s.student_name}</span>
                    <span class="top-meta">{s.matric_number ?? '—'}</span>
                  </div>
                  <span class="top-score">{s.avg_pct}%</span>
                </div>
              {/each}
            {/if}
          </div>
        </section>

        <section class="panel">
          <div class="panel-head">
            <div class="panel-title-wrap">
              <AlertTriangle size={15} />
              <h2>At Risk Students</h2>
            </div>
          </div>
          <div class="top-list">
            {#if !data.atRiskStudents?.length}
              <p class="empty">No at-risk students.</p>
            {:else}
              {#each data.atRiskStudents as s}
                <div class="top-item at-risk">
                  <div class="top-info">
                    <span class="top-name">{s.student_name}</span>
                    <span class="top-meta">{s.matric_number ?? '—'} · {s.exams_taken} exams</span>
                  </div>
                  <span class="top-score fail">{s.avg_pct}%</span>
                </div>
              {/each}
            {/if}
          </div>
        </section>
      </div>
    </div>
  {/if}

  <!-- ══ VIOLATIONS TAB ═════════════════════════════════════ -->
  {#if activeTab === 'violations'}
    <div class="main-grid">
      <section class="panel panel-exams">
        <div class="panel-head">
          <div class="panel-title-wrap">
            <Flag size={15} />
            <h2>Violation Log</h2>
          </div>
          <span class="panel-count">{data.violationBreakdown?.length ?? 0} types</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Description</th>
                <th class="num">Count</th>
                <th class="num">% of Total</th>
                <th class="num">Severity</th>
              </tr>
            </thead>
            <tbody>
              {#if !data.violationBreakdown?.length}
                <tr><td colspan="5" class="empty">No violations recorded.</td></tr>
              {:else}
                {#each data.violationBreakdown as v}
                  <tr>
                    <td><span class="badge warn">{v.flag_type}</span></td>
                    <td>{data.flagLabels?.[v.flag_type] ?? v.flag_type}</td>
                    <td class="num">{v.count}</td>
                    <td class="num">{v.pct_of_total}%</td>
                    <td class="num">
                      {#if v.pct_of_total > 30}
                        <span class="severity high">High</span>
                      {:else if v.pct_of_total > 15}
                        <span class="severity medium">Medium</span>
                      {:else}
                        <span class="severity low">Low</span>
                      {/if}
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      </section>

      <div class="right-col">
        <section class="panel panel-violations">
          <div class="panel-head">
            <div class="panel-title-wrap">
              <AlertTriangle size={15} />
              <h2>Violation Breakdown</h2>
              <span class="panel-badge">{data.meta?.totalViolations ?? 0}</span>
            </div>
          </div>
          <div class="violation-bars">
            {#if !data.violationBreakdown?.length}
              <p class="empty">No violations recorded.</p>
            {:else}
              {#each data.violationBreakdown as v}
                <div class="v-row">
                  <div class="v-info">
                    <span class="v-label">{data.flagLabels?.[v.flag_type] ?? v.flag_type}</span>
                    <span class="v-pct">{v.pct_of_total}%</span>
                  </div>
                  <div class="v-bar-wrap">
                    <div class="v-bar" style="width: {(v.count / maxViolations) * 100}%"></div>
                  </div>
                  <span class="v-count">{v.count}</span>
                </div>
              {/each}
            {/if}
          </div>
        </section>

        <section class="panel">
          <div class="panel-head">
            <div class="panel-title-wrap">
              <Fingerprint size={15} />
              <h2>Conduct Summary</h2>
            </div>
          </div>
          <div class="conduct-grid">
            <div class="conduct-item">
              <div class="conduct-icon green"><CheckCircle size={16} /></div>
              <div class="conduct-info">
                <span class="conduct-value">{totalStudents - (data.meta?.totalViolations ?? 0)}</span>
                <span class="conduct-label">Clean Records</span>
              </div>
            </div>
            <div class="conduct-item">
              <div class="conduct-icon amber"><AlertTriangle size={16} /></div>
              <div class="conduct-info">
                <span class="conduct-value">{data.meta?.totalViolations ?? 0}</span>
                <span class="conduct-label">Violations</span>
              </div>
            </div>
            <div class="conduct-item">
              <div class="conduct-icon red"><Flag size={16} /></div>
              <div class="conduct-info">
                <span class="conduct-value">{Math.round(((data.meta?.totalViolations ?? 0) / Math.max(totalStudents, 1)) * 100)}%</span>
                <span class="conduct-label">Violation Rate</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  {/if}

  <footer class="page-footer">
    <span>Generated in {data.meta?.loadTimeMs ?? 0}ms · {formatDateFull(data.meta?.generatedAt ?? new Date().toISOString())}</span>
    {#if data.meta?.error}
      <span class="error-badge">Error: {data.meta.error}</span>
    {/if}
  </footer>

</div>


<style>
  /* ════════════════════════════════════════════════════════════
     MOBILE-FIRST REPORTS STYLES
     ════════════════════════════════════════════════════════════ */

  .page {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    font-family: 'Inter', 'DM Sans', system-ui, -apple-system, sans-serif;
  }

  /* ── Header ──────────────────────────────────────────── */
  .page-header {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1.5px solid var(--color-border);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.875rem;
  }

  .header-icon {
    width: 44px;
    height: 44px;
    border-radius: 0.875rem;
    background: rgba(59, 130, 246, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #3b82f6;
    flex-shrink: 0;
  }

  h1 {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--color-text);
    margin: 0;
  }

  .subtitle {
    font-size: 0.78rem;
    color: var(--color-muted);
    margin: 0.15rem 0 0;
  }

  .header-right {
    display: flex;
    flex-wrap: wrap;
    gap: 0.625rem;
  }

  /* ── Tabs ────────────────────────────────────────────── */
  .tab-bar {
    display: flex;
    gap: 0.25rem;
    padding: 0.25rem;
    background: var(--color-bg);
    border: 1.5px solid var(--color-border);
    border-radius: 0.75rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.55rem 0.875rem;
    border-radius: 0.5rem;
    border: none;
    background: none;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--color-muted);
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .tab-btn:hover {
    background: var(--color-surface);
    color: var(--color-text);
  }

  .tab-btn.active {
    background: #3b82f6;
    color: white;
  }

  /* ── Modal ───────────────────────────────────────────── */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    animation: fadeIn 0.2s ease;
  }

  .modal {
    background: var(--color-surface);
    border: 1.5px solid var(--color-border);
    border-radius: 1rem;
    width: 100%;
    max-width: 480px;
    max-height: 90vh;
    overflow-y: auto;
    animation: slideUp 0.25s ease;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
  }

  .modal-header h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }

  .modal-close {
    background: none;
    border: none;
    color: var(--color-muted);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.375rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal-close:hover {
    background: var(--color-bg);
    color: var(--color-text);
  }

  .modal-body {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .modal-footer {
    display: flex;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--color-border);
    justify-content: flex-end;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-muted);
  }

  .form-group select {
    padding: 0.6rem 0.875rem;
    border: 1.5px solid var(--color-border);
    border-radius: 0.625rem;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.85rem;
    outline: none;
    cursor: pointer;
  }

  .form-group select:focus {
    border-color: #3b82f6;
  }

  .scope-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .scope-btn {
    padding: 0.6rem;
    border: 1.5px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-bg);
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text);
    cursor: pointer;
    transition: all 0.15s;
  }

  .scope-btn:hover {
    border-color: #3b82f6;
  }

  .scope-btn.active {
    background: #3b82f6;
    border-color: #3b82f6;
    color: white;
  }

  /* ── Buttons ─────────────────────────────────────────── */
  .btn-primary, .btn-secondary, .btn-outline {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.55rem 0.875rem;
    border-radius: 0.625rem;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    border: none;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover {
    background: #1d4ed8;
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: var(--color-surface);
    border: 1.5px solid var(--color-border);
    color: var(--color-text);
  }

  .btn-secondary:hover {
    border-color: #3b82f6;
    color: #3b82f6;
  }

  .btn-outline {
    background: transparent;
    border: 1.5px solid var(--color-border);
    color: var(--color-text);
  }

  .btn-outline:hover {
    border-color: #3b82f6;
    color: #3b82f6;
  }

  .filter-badge {
    background: #3b82f6;
    color: white;
    font-size: 0.65rem;
    padding: 0.1rem 0.4rem;
    border-radius: 999px;
    margin-left: 0.25rem;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* ── Dropdown ────────────────────────────────────────── */
  .dropdown {
    position: relative;
  }

  .dropdown-trigger {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.55rem 0.875rem;
    background: var(--color-surface);
    border: 1.5px solid var(--color-border);
    border-radius: 0.625rem;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--color-text);
    cursor: pointer;
    transition: all 0.15s;
  }

  .dropdown-trigger:hover {
    border-color: #3b82f6;
  }

  .dropdown-chevron {
    transition: transform 0.2s;
  }

  .dropdown-chevron.rotated {
    transform: rotate(180deg);
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    min-width: 200px;
    background: var(--color-surface);
    border: 1.5px solid var(--color-border);
    border-radius: 0.75rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    z-index: 100;
    overflow: hidden;
    animation: slideDown 0.2s ease;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.65rem 1rem;
    width: 100%;
    background: none;
    border: none;
    font-size: 0.85rem;
    color: var(--color-text);
    cursor: pointer;
    transition: background 0.15s;
    text-align: left;
  }

  .dropdown-item:hover {
    background: var(--color-bg);
  }

  .dropdown-item.active {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
  }

  .dropdown-check {
    margin-left: auto;
    color: #3b82f6;
  }

  .dropdown-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    transition: background 0.15s;
  }

  .dropdown-checkbox:hover {
    background: var(--color-bg);
  }

  .dropdown-checkbox input {
    cursor: pointer;
  }

  .dropdown-checkbox span {
    font-size: 0.8rem;
    color: var(--color-text);
  }

  /* ── Filters Panel ───────────────────────────────────── */
  .filters-panel {
    background: var(--color-surface);
    border: 1.5px solid var(--color-border);
    border-radius: 1rem;
    padding: 1.25rem;
    animation: slideDown 0.3s ease;
  }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .filters-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.25rem;
  }

  .filters-header h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }

  .close-filters {
    background: none;
    border: none;
    color: var(--color-muted);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-filters:hover {
    background: var(--color-bg);
    color: var(--color-text);
  }

  .filters-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.25rem;
    margin-bottom: 1.25rem;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .filter-group label {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-muted);
  }

  .filter-trigger {
    width: 100%;
    justify-content: space-between;
  }

  .status-buttons {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .status-btn {
    flex: 1;
    min-width: 70px;
    padding: 0.5rem;
    background: var(--color-bg);
    border: 1.5px solid var(--color-border);
    border-radius: 0.5rem;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--color-muted);
    cursor: pointer;
    transition: all 0.15s;
  }

  .status-btn:hover {
    border-color: #3b82f6;
    color: #3b82f6;
  }

  .status-btn.active {
    background: #3b82f6;
    border-color: #3b82f6;
    color: white;
  }

  .slider {
    width: 100%;
    height: 4px;
    -webkit-appearance: none;
    background: var(--color-border);
    border-radius: 2px;
    outline: none;
  }

  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    background: #3b82f6;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
  }

  .range-inputs {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .active-filters {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--color-border);
  }

  .active-filters-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-muted);
  }

  .filter-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 600;
    color: #3b82f6;
  }

  .filter-tag button {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    color: #3b82f6;
    opacity: 0.7;
  }

  .filter-tag button:hover {
    opacity: 1;
  }

  .clear-filters {
    background: none;
    border: none;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-muted);
    cursor: pointer;
    padding: 0.2rem 0.5rem;
    border-radius: 0.25rem;
  }

  .clear-filters:hover {
    background: var(--color-bg);
    color: #dc2626;
  }

  /* ── Summary Cards ───────────────────────────────────── */
  .summary-cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.875rem;
  }

  .summary-card {
    background: var(--color-surface);
    border: 1.5px solid var(--color-border);
    border-radius: 1rem;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 0.875rem;
    transition: all 0.2s ease;
    animation: fadeUp 0.4s ease both;
  }

  .summary-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    border-color: var(--color-border-hover, var(--color-border));
  }

  .summary-icon {
    width: 40px;
    height: 40px;
    border-radius: 0.625rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .summary-icon.blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
  .summary-icon.green { background: rgba(22, 163, 74, 0.1); color: #16a34a; }
  .summary-icon.teal { background: rgba(20, 184, 166, 0.1); color: #14b8a6; }
  .summary-icon.amber { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
  .summary-icon.red { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
  .summary-icon.purple { background: rgba(99, 102, 241, 0.1); color: #6366f1; }

  .summary-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .summary-value {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--color-text);
    line-height: 1;
  }

  .summary-label {
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-muted);
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* ── Charts Row ──────────────────────────────────────── */
  .charts-row {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }

  .chart-card {
    background: var(--color-surface);
    border: 1.5px solid var(--color-border);
    border-radius: 1rem;
    overflow: hidden;
    animation: fadeUp 0.45s ease both;
    transition: all 0.2s ease;
  }

  .chart-card:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
    border-color: var(--color-border-hover, var(--color-border));
  }

  .chart-header {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
  }

  .chart-title-wrap {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .chart-title-wrap h3 {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }

  .chart-legend {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.7rem;
    color: var(--color-muted);
    font-weight: 500;
  }

  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 2px;
  }

  .legend-dot.sessions { background: #16a34a; }
  .legend-dot.submissions { background: #3b82f6; }
  .legend-dot.avg { background: #f59e0b; }

  .chart-body {
    padding: 1.25rem;
  }

  .pie-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
  }

  .empty-chart {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 140px;
    color: var(--color-muted);
    font-size: 0.85rem;
  }

  /* Bar Chart */
  .bar-chart {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 0.5rem;
    height: 140px;
    padding: 0 0.25rem;
  }

  .day-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    height: 100%;
    min-width: 0;
  }

  .bar-stack {
    flex: 1;
    width: 100%;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 2px;
  }

  .bar {
    width: 10px;
    border-radius: 3px 3px 0 0;
    transition: height 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    min-height: 4px;
  }

  .bar.sessions { background: #16a34a; }
  .bar.submissions { background: #3b82f6; }

  .day-label {
    font-size: 0.62rem;
    color: var(--color-muted);
    font-weight: 600;
  }

  .day-score {
    font-size: 0.62rem;
    color: #f59e0b;
    font-weight: 700;
  }

  /* Pie Chart */
  .pie-chart {
    width: 140px;
    height: 140px;
    flex-shrink: 0;
  }

  .pie-svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .pie-legend {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
  }

  .pie-legend.compact {
    gap: 0.5rem;
  }

  .pie-legend-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.5rem 0.75rem;
    background: var(--color-bg);
    border-radius: 0.5rem;
  }

  .pie-legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    flex-shrink: 0;
  }

  .pie-legend-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .pie-legend-value {
    font-size: 0.7rem;
    color: var(--color-muted);
    margin-left: auto;
  }

  /* ── Breakdown Grid ──────────────────────────────────── */
  .breakdown-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }

  .breakdown-list {
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .breakdown-row {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    padding: 0.875rem 1rem;
    background: var(--color-bg);
    border: 1.5px solid var(--color-border);
    border-radius: 0.75rem;
    transition: border-color 0.15s;
  }

  .breakdown-row:hover {
    border-color: var(--color-border-hover, var(--color-border));
  }

  .breakdown-info {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .breakdown-name {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .breakdown-meta {
    font-size: 0.7rem;
    color: var(--color-muted);
  }

  .breakdown-bars {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .breakdown-bar-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .breakdown-bar-label {
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--color-muted);
    width: 60px;
    flex-shrink: 0;
  }

  .breakdown-bar-wrap {
    flex: 1;
    height: 6px;
    background: var(--color-border);
    border-radius: 3px;
    overflow: hidden;
  }

  .breakdown-bar {
    height: 100%;
    border-radius: 3px;
    transition: width 0.6s ease;
    min-width: 2px;
  }

  .breakdown-bar.green { background: #16a34a; }
  .breakdown-bar.blue { background: #3b82f6; }

  .breakdown-bar-value {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--color-text);
    width: 36px;
    text-align: right;
    flex-shrink: 0;
  }

  .breakdown-stats {
    display: flex;
    gap: 0.5rem;
  }

  .breakdown-stat {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.15rem 0.4rem;
    border-radius: 0.375rem;
  }

  .breakdown-stat.pass { background: rgba(22, 163, 74, 0.1); color: #16a34a; }
  .breakdown-stat.fail { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
  .breakdown-stat.warn { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }

  /* ── Main Grid ───────────────────────────────────────── */
  .main-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.25rem;
    align-items: start;
  }

  /* ── Panels ──────────────────────────────────────────── */
  .panel {
    background: var(--color-surface);
    border: 1.5px solid var(--color-border);
    border-radius: 1rem;
    overflow: hidden;
    animation: fadeUp 0.45s ease both;
    transition: all 0.2s ease;
  }

  .panel:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
    border-color: var(--color-border-hover, var(--color-border));
  }

  .panel-head {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
  }

  .panel-title-wrap {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-muted);
  }

  .panel-title-wrap h2 {
    font-size: 0.82rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text);
    margin: 0;
  }

  .panel-badge {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-muted);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
  }

  .panel-count {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-muted);
    background: var(--color-bg);
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
  }

  .panel-actions {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  .search-box {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--color-bg);
    border: 1.5px solid var(--color-border);
    border-radius: 0.5rem;
  }

  .search-box input {
    border: none;
    background: none;
    outline: none;
    font-size: 0.8rem;
    width: 100%;
    color: var(--color-text);
  }

  /* ── Tables ──────────────────────────────────────────── */
  .table-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
    min-width: 800px;
  }

  th {
    padding: 0.75rem 1rem;
    text-align: left;
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
    white-space: nowrap;
  }

  td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border);
    white-space: nowrap;
  }

  tr:last-child td {
    border-bottom: none;
  }

  tr:hover td {
    background: var(--color-bg);
  }

  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .badge {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.2rem 0.5rem;
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
    border-radius: 999px;
    display: inline-block;
  }

  .badge.warn {
    background: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
  }

  .title-cell {
    font-weight: 500;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rank {
    color: var(--color-muted);
    font-weight: 700;
  }

  .score {
    font-weight: 700;
  }

  .score.good { color: #16a34a; }
  .score.bad { color: #dc2626; }

  .pass-rate {
    font-weight: 700;
    font-size: 0.85rem;
  }

  .pass-rate.good { color: #16a34a; }
  .pass-rate.bad { color: #dc2626; }

  .pass { color: #16a34a; }
  .fail { color: #dc2626; }
  .pending { color: #f59e0b; }

  .empty {
    text-align: center;
    color: var(--color-muted);
    padding: 2rem;
  }

  .sep {
    color: var(--color-muted);
  }

  /* Status badges */
  .status-badge {
    font-size: 0.65rem;
    font-weight: 700;
    padding: 0.15rem 0.4rem;
    border-radius: 999px;
  }

  .status-badge.pass { background: rgba(22, 163, 74, 0.1); color: #16a34a; }
  .status-badge.fail { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
  .status-badge.pending { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }

  .warn-badge {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.15rem 0.4rem;
    background: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
    border-radius: 0.375rem;
  }

  .ok-badge {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.15rem 0.4rem;
    background: rgba(22, 163, 74, 0.1);
    color: #16a34a;
    border-radius: 0.375rem;
  }

  .severity {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.15rem 0.4rem;
    border-radius: 0.375rem;
  }

  .severity.high { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
  .severity.medium { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
  .severity.low { background: rgba(22, 163, 74, 0.1); color: #16a34a; }

  /* Mini progress bars */
  .mini-bar-wrap {
    width: 60px;
    height: 5px;
    background: var(--color-border);
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 0.25rem;
  }

  .mini-bar {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #60a5fa);
    border-radius: 3px;
    transition: width 0.6s ease;
  }

  .mini-bar-label {
    font-size: 0.65rem;
    color: var(--color-muted);
    font-weight: 600;
  }

  /* ── Top List ────────────────────────────────────────── */
  .top-list {
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .top-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 0.875rem;
    background: var(--color-bg);
    border: 1.5px solid var(--color-border);
    border-radius: 0.625rem;
    transition: border-color 0.15s;
  }

  .top-item:hover {
    border-color: var(--color-border-hover, var(--color-border));
  }

  .top-item.at-risk {
    border-color: rgba(239, 68, 68, 0.3);
    background: rgba(239, 68, 68, 0.03);
  }

  .top-rank {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 800;
    flex-shrink: 0;
  }

  .top-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.05rem;
  }

  .top-name {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .top-meta {
    font-size: 0.7rem;
    color: var(--color-muted);
  }

  .top-score {
    font-size: 0.85rem;
    font-weight: 800;
    color: var(--color-text);
    flex-shrink: 0;
  }

  .top-score.fail {
    color: #ef4444;
  }

  /* ── Violation Bars ──────────────────────────────────── */
  .violation-bars {
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .v-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .v-info {
    display: flex;
    flex-direction: column;
    width: 120px;
    flex-shrink: 0;
  }

  .v-label {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .v-pct {
    font-size: 0.65rem;
    color: var(--color-muted);
  }

  .v-bar-wrap {
    flex: 1;
    height: 7px;
    background: var(--color-border);
    border-radius: 999px;
    overflow: hidden;
  }

  .v-bar {
    height: 100%;
    background: linear-gradient(90deg, #ef4444, #dc2626);
    border-radius: 999px;
    transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    min-width: 2px;
  }

  .v-count {
    font-size: 0.85rem;
    font-weight: 700;
    width: 36px;
    text-align: right;
    color: var(--color-text);
    flex-shrink: 0;
  }

  /* ── Conduct Grid ────────────────────────────────────── */
  .conduct-grid {
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .conduct-item {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    padding: 0.75rem;
    background: var(--color-bg);
    border: 1.5px solid var(--color-border);
    border-radius: 0.625rem;
  }

  .conduct-icon {
    width: 36px;
    height: 36px;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .conduct-icon.green { background: rgba(22, 163, 74, 0.1); color: #16a34a; }
  .conduct-icon.amber { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
  .conduct-icon.red { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

  .conduct-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.05rem;
  }

  .conduct-value {
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--color-text);
    line-height: 1;
  }

  .conduct-label {
    font-size: 0.7rem;
    color: var(--color-muted);
    font-weight: 600;
  }

  /* ── Right Column ────────────────────────────────────── */
  .right-col {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  /* ── Footer ──────────────────────────────────────────── */
  .page-footer {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem 0;
    border-top: 1px solid var(--color-border);
    font-size: 0.7rem;
    color: var(--color-muted);
    margin-top: 0.5rem;
  }

  .error-badge {
    color: #dc2626;
    background: rgba(220, 38, 38, 0.1);
    padding: 0.2rem 0.6rem;
    border-radius: 0.5rem;
    font-weight: 600;
    width: fit-content;
  }

  /* ════════════════════════════════════════════════════════════
     TABLET BREAKPOINT (640px+)
     ════════════════════════════════════════════════════════════ */
  @media (min-width: 640px) {
    .page {
      padding: 1.5rem;
      gap: 1.75rem;
    }

    .page-header {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }

    .header-right {
      flex-direction: row;
    }

    .summary-cards {
      grid-template-columns: repeat(2, 1fr);
    }

    .filters-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .panel-head {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }

    .panel-actions {
      flex-direction: row;
      align-items: center;
    }

    .pie-body {
      flex-direction: row;
      align-items: center;
    }

    .breakdown-row {
      flex-direction: row;
      align-items: center;
    }

    .breakdown-bars {
      flex: 1;
    }

    .scope-options {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  /* ════════════════════════════════════════════════════════════
     DESKTOP BREAKPOINT (1024px+)
     ════════════════════════════════════════════════════════════ */
  @media (min-width: 1024px) {
    .page {
      padding: 2rem 2.5rem 3rem;
      max-width: 1600px;
      margin: 0 auto;
      gap: 2rem;
    }

    h1 {
      font-size: 1.75rem;
    }

    .summary-cards {
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }

    .charts-row {
      grid-template-columns: 2fr 1fr;
      gap: 1.5rem;
    }

    .chart-header {
      flex-direction: row;
    }

    .main-grid {
      grid-template-columns: 1fr 380px;
      gap: 1.5rem;
    }

    .breakdown-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
    }

    .filters-grid {
      grid-template-columns: repeat(3, 1fr);
    }

    .bar-chart {
      gap: 0.75rem;
    }

    .bar {
      width: 12px;
    }

    .page-footer {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
    }
  }

  /* ════════════════════════════════════════════════════════════
     WIDE DESKTOP BREAKPOINT (1280px+)
     ════════════════════════════════════════════════════════════ */
  @media (min-width: 1280px) {
    .summary-cards {
      grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    }
  }

  /* ════════════════════════════════════════════════════════════
     DARK MODE OVERRIDES
     ════════════════════════════════════════════════════════════ */
  :global(.dark) .summary-card:hover,
  :global(.dark) .chart-card:hover,
  :global(.dark) .panel:hover,
  :global(.dark) .breakdown-row:hover,
  :global(.dark) .top-item:hover,
  :global(.dark) .conduct-item:hover {
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
  }
</style>
