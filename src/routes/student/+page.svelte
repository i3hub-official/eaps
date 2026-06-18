<!-- src/routes/student/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import { onMount, onDestroy, tick } from 'svelte';
	import {
		BookMarked,
		ChevronRight,
		ArrowRight,
		CheckCircle2,
		Calendar,
		Zap,
		TrendingUp,
		Award,
		BookOpen,
		Activity,
		Sparkles,
		BarChart3,
		Target,
		TrendingDown
	} from '@lucide/svelte';
	import Chart from 'chart.js/auto';
	import type { Chart as ChartType, ChartConfiguration } from 'chart.js';

	let { data }: { data: PageData } = $props();
	
	// Make data reactive with polling updates
	let pageData = $state(data);
	let pollInterval: NodeJS.Timeout | null = null;
	let isPolling = $state(false);
	let lastUpdate = $state(Date.now());

	// Chart instances
	let trendChart: ChartType | null = null;
	let subjectChart: ChartType | null = null;
	let gradeChart: ChartType | null = null;
	
	// Chart containers
	let trendChartContainer: HTMLCanvasElement;
	let subjectChartContainer: HTMLCanvasElement;
	let gradeChartContainer: HTMLCanvasElement;

	// Derived values using pageData instead of data
	const examCounts = $derived(
		pageData.examCounts ?? { active: 0, scheduled: 0, completed: 0, cancelled: 0 }
	);
	const recentResults = $derived(pageData.recentResults ?? []);
	const registeredCourses = $derived(pageData.registeredCourses ?? []);
	const performanceData = $derived(
		pageData.performanceData ?? {
			grades: { A: 0, B: 0, C: 0, D: 0, F: 0 },
			trend: [0],
			trendLabels: ['No Data'],
			subjectPerformance: [{ subject: 'No Data', score: 0 }],
			improvement: 0
		}
	);

	const activeExams = $derived(examCounts.active);
	const upcomingExams = $derived(examCounts.scheduled);
	const averageScore = $derived(pageData.stats?.averageScore ?? 0);
	const totalResults = $derived(pageData.stats?.totalResults ?? 0);
	const totalCourses = $derived(registeredCourses.length);

	const firstName = $derived(pageData.user?.fullName?.trim().split(/\s+/)[0] ?? 'Student');

	function gradeColor(pct: number) {
		if (pct >= 70) return 'grade-a';
		if (pct >= 60) return 'grade-b';
		if (pct >= 50) return 'grade-c';
		if (pct >= 45) return 'grade-d';
		return 'grade-f';
	}

	function gradeLabel(pct: number) {
		if (pct >= 70) return 'A';
		if (pct >= 60) return 'B';
		if (pct >= 50) return 'C';
		if (pct >= 45) return 'D';
		return 'F';
	}

	// Chart creation functions
	function createTrendChart() {
		if (!trendChartContainer) return;
		
		const ctx = trendChartContainer.getContext('2d');
		if (!ctx) return;

		if (trendChart) {
			trendChart.destroy();
		}

		const config: ChartConfiguration = {
			type: 'line',
			data: {
				labels: performanceData.trendLabels,
				datasets: [{
					label: 'Performance Trend',
					data: performanceData.trend,
					borderColor: '#22c55e',
					backgroundColor: 'rgba(34, 197, 94, 0.1)',
					fill: true,
					tension: 0.4,
					pointBackgroundColor: performanceData.trend.map(v => 
						v >= 70 ? '#22c55e' : v >= 50 ? '#f59e0b' : '#ef4444'
					),
					pointBorderColor: '#fff',
					pointBorderWidth: 2,
					pointRadius: 5,
					pointHoverRadius: 7,
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: false
					},
					tooltip: {
						callbacks: {
							label: function(context) {
								return `Score: ${context.parsed.y}%`;
							}
						}
					}
				},
				scales: {
					y: {
						min: 0,
						max: 100,
						ticks: {
							stepSize: 20,
							callback: function(value) {
								return value + '%';
							}
						},
						grid: {
							color: 'rgba(0,0,0,0.05)'
						}
					},
					x: {
						grid: {
							display: false
						}
					}
				},
				animation: {
					duration: 750,
					easing: 'easeInOutQuart'
				}
			}
		};

		trendChart = new Chart(ctx, config);
	}

	function createSubjectChart() {
		if (!subjectChartContainer) return;
		
		const ctx = subjectChartContainer.getContext('2d');
		if (!ctx) return;

		if (subjectChart) {
			subjectChart.destroy();
		}

		const colors = [
			'rgba(34, 197, 94, 0.8)',
			'rgba(56, 189, 248, 0.8)',
			'rgba(245, 158, 11, 0.8)',
			'rgba(168, 85, 247, 0.8)',
			'rgba(236, 72, 153, 0.8)'
		];

		const config: ChartConfiguration = {
			type: 'bar',
			data: {
				labels: performanceData.subjectPerformance.map(s => s.subject),
				datasets: [{
					label: 'Subject Performance',
					data: performanceData.subjectPerformance.map(s => s.score),
					backgroundColor: performanceData.subjectPerformance.map((_, i) => 
						colors[i % colors.length]
					),
					borderColor: performanceData.subjectPerformance.map((_, i) => 
						colors[i % colors.length].replace('0.8', '1')
					),
					borderWidth: 2,
					borderRadius: 6,
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: false
					},
					tooltip: {
						callbacks: {
							label: function(context) {
								return `Score: ${context.parsed.y}%`;
							}
						}
					}
				},
				scales: {
					y: {
						min: 0,
						max: 100,
						ticks: {
							stepSize: 20,
							callback: function(value) {
								return value + '%';
							}
						},
						grid: {
							color: 'rgba(0,0,0,0.05)'
						}
					},
					x: {
						grid: {
							display: false
						}
					}
				},
				animation: {
					duration: 750,
					easing: 'easeInOutQuart'
				}
			}
		};

		subjectChart = new Chart(ctx, config);
	}

	function createGradeChart() {
		if (!gradeChartContainer) return;
		
		const ctx = gradeChartContainer.getContext('2d');
		if (!ctx) return;

		if (gradeChart) {
			gradeChart.destroy();
		}

		const gradeData = performanceData.grades;
		const total = Object.values(gradeData).reduce((a, b) => a + b, 0);

		const config: ChartConfiguration = {
			type: 'doughnut',
			data: {
				labels: ['A', 'B', 'C', 'D', 'F'],
				datasets: [{
					data: [gradeData.A, gradeData.B, gradeData.C, gradeData.D, gradeData.F],
					backgroundColor: [
						'rgba(34, 197, 94, 0.8)',
						'rgba(56, 189, 248, 0.8)',
						'rgba(245, 158, 11, 0.8)',
						'rgba(249, 115, 22, 0.8)',
						'rgba(239, 68, 68, 0.8)'
					],
					borderColor: [
						'#22c55e',
						'#38bdf8',
						'#f59e0b',
						'#f97316',
						'#ef4444'
					],
					borderWidth: 2,
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						position: 'bottom',
						labels: {
							padding: 10,
							usePointStyle: true,
							pointStyle: 'circle',
							font: {
								size: 11,
								weight: '600'
							}
						}
					},
					tooltip: {
						callbacks: {
							label: function(context) {
								const total = context.dataset.data.reduce((a, b) => a + b, 0);
								const percentage = total > 0 ? Math.round((context.parsed / total) * 100) : 0;
								return `${context.label}: ${context.parsed} (${percentage}%)`;
							}
						}
					}
				},
				cutout: '60%',
				animation: {
					animateRotate: true,
					duration: 1000,
					easing: 'easeInOutQuart'
				}
			}
		};

		gradeChart = new Chart(ctx, config);
	}

	// Initialize all charts
	function initCharts() {
		// Use tick to ensure DOM is ready
		tick().then(() => {
			createTrendChart();
			createSubjectChart();
			createGradeChart();
		});
	}

	// Update all charts with new data
	function updateCharts() {
		if (trendChart) {
			trendChart.data.labels = performanceData.trendLabels;
			trendChart.data.datasets[0].data = performanceData.trend;
			trendChart.data.datasets[0].pointBackgroundColor = performanceData.trend.map(v => 
				v >= 70 ? '#22c55e' : v >= 50 ? '#f59e0b' : '#ef4444'
			);
			trendChart.update();
		}

		if (subjectChart) {
			subjectChart.data.labels = performanceData.subjectPerformance.map(s => s.subject);
			subjectChart.data.datasets[0].data = performanceData.subjectPerformance.map(s => s.score);
			subjectChart.update();
		}

		if (gradeChart) {
			const gradeData = performanceData.grades;
			gradeChart.data.datasets[0].data = [gradeData.A, gradeData.B, gradeData.C, gradeData.D, gradeData.F];
			gradeChart.update();
		}
	}

	// Polling function
	async function refreshDashboard() {
		if (isPolling) return;
		
		isPolling = true;
		try {
			const response = await fetch('/api/student/dashboard');
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const newData = await response.json();
			
			// Update only if data has changed
			if (JSON.stringify(newData) !== JSON.stringify(pageData)) {
				pageData = { ...pageData, ...newData };
				lastUpdate = Date.now();
				
				// Update charts with new data
				updateCharts();
			}
		} catch (error) {
			console.error('Failed to refresh dashboard data:', error);
		} finally {
			isPolling = false;
		}
	}

	// Manual refresh function
	function handleManualRefresh() {
		refreshDashboard();
	}

	onMount(() => {
		// Initialize charts
		initCharts();
		
		// Initial refresh after mount
		refreshDashboard();
		
		// Set up polling every 30 seconds
		pollInterval = setInterval(refreshDashboard, 30000);
		
		// Optional: Refresh when tab becomes visible again
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				refreshDashboard();
			}
		};
		document.addEventListener('visibilitychange', handleVisibilityChange);
		
		return () => {
			if (pollInterval) {
				clearInterval(pollInterval);
			}
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			
			// Destroy charts
			if (trendChart) {
				trendChart.destroy();
				trendChart = null;
			}
			if (subjectChart) {
				subjectChart.destroy();
				subjectChart = null;
			}
			if (gradeChart) {
				gradeChart.destroy();
				gradeChart = null;
			}
		};
	});

	onDestroy(() => {
		if (pollInterval) {
			clearInterval(pollInterval);
		}
	});
</script>

<!-- ── Welcome header ──────────────────────────────────────── -->
<div class="welcome-header">
	<div class="welcome-left">
		<div class="welcome-greet">
			<Sparkles size={14} class="greet-spark" />
			<span>
				{new Date().getHours() < 12
					? 'Good morning'
					: new Date().getHours() < 17
						? 'Good afternoon'
						: 'Good evening'},
				<strong>{firstName}</strong>
			</span>
		</div>
		<h1 class="welcome-title">Your Academic Dashboard</h1>
		<div class="welcome-meta">
			<span class="meta-chip"><BookMarked size={11} />{totalCourses} Courses</span>
			<span class="meta-chip"><Target size={11} />{totalResults} Results</span>
			{#if averageScore > 0}
				<span class="meta-chip score-chip"><TrendingUp size={11} />{averageScore}% Average</span>
			{/if}
			<button 
				class="refresh-btn" 
				onclick={handleManualRefresh} 
				disabled={isPolling}
				title="Refresh data"
			>
				<span class="refresh-icon" class:spinning={isPolling}>⟳</span>
				<span class="refresh-time">
					{new Date(lastUpdate).toLocaleTimeString()}
				</span>
			</button>
		</div>
	</div>
	{#if activeExams > 0}
		<a href="/student/exams" class="exam-now-btn">
			<Zap size={14} />
			{activeExams} Exam{activeExams > 1 ? 's' : ''} Live
			<ArrowRight size={14} />
		</a>
	{/if}
</div>

<!-- ── Main grid ──────────────────────────────────────────────── -->
<div class="main-grid">
	<!-- ── Exam status stats ──────────────────────────────────── -->
	<div class="stats-row span-wide">
		<!-- Live Now - Entire card clickable -->
		<a href="/student/exams?status=active" class="stat-card" class:active-card={activeExams > 0}>
			<div
				class="stat-icon"
				class:icon-live={activeExams > 0}
				class:icon-neutral={activeExams === 0}
			>
				<Zap size={17} />
			</div>
			<div class="stat-body">
				<span class="stat-val">{activeExams}</span>
				<span class="stat-lbl">Live Now</span>
			</div>
			{#if activeExams > 0}
				<div class="live-pulse"></div>
			{/if}
		</a>

		<!-- Upcoming - Entire card clickable -->
		<a href="/student/exams?status=scheduled" class="stat-card">
			<div class="stat-icon icon-soon">
				<Calendar size={17} />
			</div>
			<div class="stat-body">
				<span class="stat-val">{upcomingExams}</span>
				<span class="stat-lbl">Upcoming</span>
			</div>
		</a>

		<!-- Completed - Entire card clickable -->
		<a href="/student/exams?status=completed" class="stat-card">
			<div class="stat-icon icon-done">
				<CheckCircle2 size={17} />
			</div>
			<div class="stat-body">
				<span class="stat-val">{examCounts.completed}</span>
				<span class="stat-lbl">Completed</span>
			</div>
		</a>

		<!-- Average - Entire card clickable -->
		<a href="/student/results" class="stat-card">
			<div class="stat-icon icon-avg">
				<Activity size={17} />
			</div>
			<div class="stat-body">
				<span class="stat-val" class:good={averageScore >= 50}
					>{averageScore}<span class="pct">%</span></span
				>
				<span class="stat-lbl">Average</span>
			</div>
		</a>
	</div>

	<!-- ── Performance Overview ────────────────────────────────── -->
	<section class="card performance-card span-wide">
		<div class="card-head">
			<div class="card-head-l">
				<BarChart3 size={15} />
				<h2>Performance Overview</h2>
			</div>
			<div class="performance-badge">
				<span class="trend-indicator {performanceData.improvement >= 0 ? 'positive' : 'negative'}">
					{#if performanceData.improvement >= 0}
						<TrendingUp size={12} />
					{:else}
						<TrendingDown size={12} />
					{/if}
					{Math.abs(performanceData.improvement)}% 
					{performanceData.improvement >= 0 ? '↑' : '↓'}
				</span>
				<span class="live-dot"></span>
			</div>
		</div>
		
		<div class="performance-grid">
			<!-- Trend Chart -->
			<div class="chart-container">
				<h3 class="chart-title">Performance Trend</h3>
				<canvas bind:this={trendChartContainer}></canvas>
			</div>

			<!-- Subject Performance Chart -->
			<div class="chart-container">
				<h3 class="chart-title">Subject Performance</h3>
				<canvas bind:this={subjectChartContainer}></canvas>
			</div>

			<!-- Grade Distribution Chart -->
			<div class="chart-container">
				<h3 class="chart-title">Grade Distribution</h3>
				<canvas bind:this={gradeChartContainer}></canvas>
			</div>
		</div>
	</section>

	<!-- ── Recent Results ────────────────────────────────────────── -->
	<section class="card">
		<div class="card-head">
			<div class="card-head-l">
				<Award size={15} />
				<h2>Recent Results</h2>
			</div>
			<a href="/student/results" class="see-all">All results <ChevronRight size={13} /></a>
		</div>

		{#if recentResults.length === 0}
			<div class="empty sm">
				<Award size={22} strokeWidth={1.3} />
				<p>No results yet</p>
			</div>
		{:else}
			<div class="results-list">
				{#each recentResults.slice(0, 5) as result}
					<a href="/student/results/{result.id}" class="result-row">
						<div class="grade-badge {gradeColor(Number(result.percentage ?? 0))}">
							{gradeLabel(Number(result.percentage ?? 0))}
						</div>
						<div class="result-info">
							<span class="result-title">{result.exam?.title ?? '—'}</span>
							<span class="result-meta"
								>{result.exam?.course?.code ?? ''} &middot; {Math.round(
									Number(result.percentage ?? 0)
								)}%</span
							>
						</div>
						<div class="result-bar-wrap">
							<div class="result-bar">
								<div
									class="result-fill {gradeColor(Number(result.percentage ?? 0))}-fill"
									style="width:{Math.min(Number(result.percentage ?? 0), 100)}%"
								></div>
							</div>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</section>

	<!-- ── My Courses ─────────────────────────────────────────────── -->
	<section class="card">
		<div class="card-head">
			<div class="card-head-l">
				<BookMarked size={15} />
				<h2>My Courses</h2>
			</div>
			<a href="/student/courses" class="see-all">All <ChevronRight size={13} /></a>
		</div>

		{#if registeredCourses.length === 0}
			<div class="empty sm">
				<BookOpen size={22} strokeWidth={1.3} />
				<p>No courses registered</p>
				<a href="/student/courses/register" class="register-link">Register courses</a>
			</div>
		{:else}
			<div class="courses-list">
				{#each registeredCourses.slice(0, 6) as reg}
					<div class="course-row">
						<div class="course-icon">
							<BookOpen size={13} />
						</div>
						<div class="course-info">
							<span class="course-code">{reg.course?.code}</span>
							<span class="course-title">{reg.course?.title}</span>
						</div>
						<span class="course-credits">{reg.course?.creditUnits ?? 2} cr</span>
					</div>
				{/each}
			</div>
			{#if registeredCourses.length > 6}
				<div class="courses-more">
					<a href="/student/courses">+{registeredCourses.length - 6} more courses</a>
				</div>
			{/if}
		{/if}
	</section>
</div>

<style>
	/* ── Tokens ──────────────────────────────────────────────── */
	:root {
		--g50: #f0fdf4;
		--g100: #dcfce7;
		--g400: #4ade80;
		--g500: #22c55e;
		--g600: #16a34a;
		--g700: #15803d;
		--g-soft: rgba(22, 163, 74, 0.08);
	}

	.page {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* ── Welcome ─────────────────────────────────────────────── */
	.welcome-header {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.welcome-greet {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.78rem;
		color: var(--g700);
		margin-bottom: 0.375rem;
		background: var(--g-soft);
		padding: 0.3rem 0.75rem;
		border-radius: 20px;
		font-weight: 500;
	}
	:global(.dark) .welcome-greet {
		color: var(--g400);
	}
	:global(.greet-spark) {
		color: var(--g600);
	}
	.welcome-greet strong {
		font-weight: 800;
	}
	.welcome-title {
		font-size: 1.55rem;
		font-weight: 900;
		color: var(--color-text);
		letter-spacing: -0.03em;
		line-height: 1.15;
		margin: 0 0 0.5rem;
	}
	.welcome-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.meta-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--color-muted);
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		padding: 0.2rem 0.6rem;
		border-radius: 20px;
	}
	.score-chip {
		color: var(--g700);
		background: var(--g-soft);
		border-color: transparent;
	}
	:global(.dark) .score-chip {
		color: var(--g400);
	}
	.refresh-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.65rem;
		font-weight: 600;
		color: var(--color-muted);
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		padding: 0.2rem 0.6rem;
		border-radius: 20px;
		cursor: pointer;
		transition: all 0.2s;
	}
	.refresh-btn:hover:not(:disabled) {
		border-color: var(--g400);
		color: var(--g600);
	}
	.refresh-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.refresh-icon {
		display: inline-block;
		font-size: 1rem;
		transition: transform 0.3s;
	}
	.refresh-icon.spinning {
		animation: spin 1s linear infinite;
	}
	.refresh-time {
		font-size: 0.6rem;
		opacity: 0.7;
	}
	.exam-now-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.625rem 1.25rem;
		background: var(--g600);
		color: #fff;
		border-radius: 10px;
		font-size: 0.83rem;
		font-weight: 800;
		text-decoration: none;
		animation: pulse-btn 2s ease-in-out infinite;
		white-space: nowrap;
	}
	.exam-now-btn:hover {
		background: var(--g700);
		animation: none;
	}

	/* ── Stats row ───────────────────────────────────────────── */
	.stats-row {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.75rem;
	}
	@media (max-width: 640px) {
		.stats-row {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	.stat-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 14px;
		padding: 1rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		position: relative;
		overflow: hidden;
		transition:
			border-color 0.15s,
			background 0.15s,
			transform 0.15s;
		text-decoration: none;
		color: inherit;
		cursor: pointer;
	}
	.stat-card:hover {
		background: var(--color-bg);
		border-color: var(--g400);
		transform: translateY(-2px);
	}
	.stat-card:active {
		transform: scale(0.98);
	}
	.stat-card.active-card {
		border-color: rgba(22, 163, 74, 0.4);
	}
	.stat-icon {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.icon-live {
		background: rgba(22, 163, 74, 0.12);
		color: var(--g600);
	}
	.icon-neutral {
		background: var(--color-bg);
		color: var(--color-muted);
	}
	.icon-soon {
		background: rgba(14, 165, 233, 0.1);
		color: #0ea5e9;
	}
	.icon-done {
		background: rgba(16, 185, 129, 0.1);
		color: #10b981;
	}
	.icon-avg {
		background: rgba(168, 85, 247, 0.1);
		color: #a855f7;
	}
	.stat-body {
		display: flex;
		flex-direction: column;
	}
	.stat-val {
		font-size: 1.6rem;
		font-weight: 900;
		color: var(--color-text);
		letter-spacing: -0.04em;
		line-height: 1;
	}
	.stat-val.good {
		color: var(--g600);
	}
	.pct {
		font-size: 0.9rem;
		font-weight: 600;
		opacity: 0.6;
	}
	.stat-lbl {
		font-size: 0.68rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-muted);
		margin-top: 0.15rem;
	}
	.live-pulse {
		position: absolute;
		top: 10px;
		right: 10px;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--g500);
		animation: pulse-ring 1.5s ease-in-out infinite;
	}

	/* ── Main grid ───────────────────────────────────────────── */
	.main-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		grid-template-rows: auto auto;
		gap: 0.875rem;
	}
	.span-wide {
		grid-column: 1 / -1;
		padding-top: 0.5rem;
	}
	@media (max-width: 860px) {
		.main-grid {
			grid-template-columns: 1fr;
		}
		.span-wide {
			grid-column: 1;
		}
	}

	/* ── Performance Card ────────────────────────────────────── */
	.performance-card {
		margin-top: 0.25rem;
	}
	.performance-badge {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.trend-indicator {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.7rem;
		font-weight: 700;
		padding: 0.25rem 0.6rem;
		border-radius: 20px;
	}
	.trend-indicator.positive {
		color: var(--g700);
		background: var(--g-soft);
	}
	.trend-indicator.negative {
		color: #dc2626;
		background: rgba(220, 38, 38, 0.1);
	}
	:global(.dark) .trend-indicator.positive {
		color: var(--g400);
	}
	:global(.dark) .trend-indicator.negative {
		color: #f87171;
	}
	.live-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--g500);
		animation: pulse 1.5s ease-in-out infinite;
		display: inline-block;
	}

	.performance-grid {
		display: grid;
		grid-template-columns: 1fr 1fr 0.9fr;
		gap: 1.5rem;
		padding: 1.125rem;
	}
	@media (max-width: 1024px) {
		.performance-grid {
			grid-template-columns: 1fr 1fr;
		}
	}
	@media (max-width: 768px) {
		.performance-grid {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}
	}

	.chart-container {
		height: 240px;
		position: relative;
	}
	.chart-title {
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--color-muted);
		margin: 0 0 0.5rem 0;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.chart-container canvas {
		width: 100% !important;
		height: 100% !important;
	}

	/* ── Cards ───────────────────────────────────────────────── */
	.card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 14px;
		overflow: hidden;
	}
	.card-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.875rem 1.125rem;
		border-bottom: 1px solid var(--color-border);
	}
	.card-head-l {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--g600);
	}
	.card-head-l h2 {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--color-text);
		margin: 0;
	}
	.see-all {
		display: inline-flex;
		align-items: center;
		gap: 0.15rem;
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--g600);
		text-decoration: none;
	}
	.see-all:hover {
		text-decoration: underline;
	}

	/* ── Results ─────────────────────────────────────────────── */
	.results-list {
		display: flex;
		flex-direction: column;
	}
	.result-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1.125rem;
		border-bottom: 1px solid var(--color-border);
		text-decoration: none;
		transition: background 0.12s;
	}
	.result-row:last-child {
		border-bottom: none;
	}
	.result-row:hover {
		background: var(--color-bg);
	}

	.grade-badge {
		width: 34px;
		height: 34px;
		border-radius: 9px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.8rem;
		font-weight: 900;
	}
	.grade-a {
		background: rgba(22, 163, 74, 0.12);
		color: #065f46;
	}
	.grade-b {
		background: rgba(14, 165, 233, 0.12);
		color: #0369a1;
	}
	.grade-c {
		background: rgba(245, 158, 11, 0.12);
		color: #92400e;
	}
	.grade-d {
		background: rgba(249, 115, 22, 0.12);
		color: #9a3412;
	}
	.grade-f {
		background: rgba(220, 38, 38, 0.12);
		color: #991b1b;
	}
	:global(.dark) .grade-a {
		color: #4ade80;
	}
	:global(.dark) .grade-b {
		color: #38bdf8;
	}
	:global(.dark) .grade-c {
		color: #fbbf24;
	}
	:global(.dark) .grade-f {
		color: #f87171;
	}

	.result-info {
		flex: 1;
		min-width: 0;
	}
	.result-title {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text);
		display: block;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.result-meta {
		font-size: 0.68rem;
		color: var(--color-muted);
	}

	.result-bar-wrap {
		width: 60px;
		flex-shrink: 0;
	}
	.result-bar {
		height: 4px;
		background: var(--color-border);
		border-radius: 2px;
		overflow: hidden;
	}
	.result-fill {
		height: 100%;
		border-radius: 2px;
	}
	.grade-a-fill {
		background: var(--g500);
	}
	.grade-b-fill {
		background: #38bdf8;
	}
	.grade-c-fill {
		background: #f59e0b;
	}
	.grade-d-fill {
		background: #f97316;
	}
	.grade-f-fill {
		background: #ef4444;
	}

	/* ── Courses ─────────────────────────────────────────────── */
	.courses-list {
		display: flex;
		flex-direction: column;
	}
	.course-row {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.65rem 1.125rem;
		border-bottom: 1px solid var(--color-border);
	}
	.course-row:last-child {
		border-bottom: none;
	}
	.course-icon {
		width: 28px;
		height: 28px;
		border-radius: 7px;
		flex-shrink: 0;
		background: var(--g-soft);
		color: var(--g700);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	:global(.dark) .course-icon {
		color: var(--g400);
	}
	.course-info {
		flex: 1;
		min-width: 0;
	}
	.course-code {
		display: block;
		font-size: 0.68rem;
		font-weight: 800;
		color: var(--g700);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	:global(.dark) .course-code {
		color: var(--g400);
	}
	.course-title {
		display: block;
		font-size: 0.75rem;
		color: var(--color-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.course-credits {
		font-size: 0.65rem;
		font-weight: 700;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		color: var(--color-muted);
		padding: 0.15rem 0.45rem;
		border-radius: 6px;
		flex-shrink: 0;
	}
	.courses-more {
		padding: 0.5rem 1.125rem;
		border-top: 1px solid var(--color-border);
		text-align: center;
	}
	.courses-more a {
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--g600);
		text-decoration: none;
	}
	.courses-more a:hover {
		text-decoration: underline;
	}
	.register-link {
		display: inline-block;
		margin-top: 0.35rem;
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--g600);
		text-decoration: none;
	}

	/* ── Empty states ────────────────────────────────────────── */
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 2rem 1rem;
		color: var(--color-muted);
		text-align: center;
	}
	.empty p {
		font-size: 0.82rem;
		font-weight: 600;
		margin: 0;
		color: var(--color-text);
	}
	.empty span {
		font-size: 0.72rem;
	}
	.empty.sm {
		padding: 1.25rem 1rem;
	}
	.empty.sm p {
		font-size: 0.78rem;
	}

	/* ── Animations ──────────────────────────────────────────── */
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.3;
		}
	}
	@keyframes pulse-ring {
		0% {
			box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
		}
		70% {
			box-shadow: 0 0 0 8px rgba(34, 197, 94, 0);
		}
		100% {
			box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
		}
	}
	@keyframes pulse-btn {
		0%,
		100% {
			box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.4);
		}
		50% {
			box-shadow: 0 4px 20px rgba(22, 163, 74, 0.35);
		}
	}
	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>