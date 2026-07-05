<!-- src/routes/admin/manage/exam-officers/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import {
		UserCog, Building2, Mail, User, Search, Plus,
		CheckCircle, Ban, Trash2, AlertCircle,
		X, Shield, Users
	} from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let filterCollege = $state('all');
	let showDeleteConfirm = $state(false);
	let selectedOfficer = $state<typeof data.examOfficers[0] | null>(null);
	let successMessage = $state('');
	let errorMessage = $state('');

	let filteredOfficers = $derived(
		data.examOfficers.filter(o => {
			const matchesSearch = o.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
				o.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(o.staffId && o.staffId.toLowerCase().includes(searchQuery.toLowerCase()));
			const matchesCollege = filterCollege === 'all' || o.collegeId?.toString() === filterCollege;
			return matchesSearch && matchesCollege;
		})
	);

	let groupedOfficers = $derived(
		filteredOfficers.reduce((acc, officer) => {
			const collegeName = officer.college?.name || 'Unassigned';
			if (!acc[collegeName]) acc[collegeName] = [];
			acc[collegeName].push(officer);
			return acc;
		}, {} as Record<string, typeof filteredOfficers>)
	);

	let totalOfficers = $derived(data.examOfficers.length);
	let assignedCount = $derived(data.examOfficers.filter(o => o.collegeId).length);
	let activeCount = $derived(data.examOfficers.filter(o => o.isActive).length);

	async function handleToggleActive(officer: typeof data.examOfficers[0]) {
		const form = new FormData();
		form.append('userId', officer.id);
		const response = await fetch('?/toggleActive', { method: 'POST', body: form });
		const result = await response.json();
		if (result.success) {
			successMessage = result.message;
			window.location.reload();
		} else {
			errorMessage = result.error || 'Failed to toggle status';
		}
	}

	async function handleDelete(officer: typeof data.examOfficers[0]) {
		const form = new FormData();
		form.append('userId', officer.id);
		const response = await fetch('?/delete', { method: 'POST', body: form });
		const result = await response.json();
		if (result.success) {
			successMessage = result.message;
			showDeleteConfirm = false;
			selectedOfficer = null;
			window.location.reload();
		} else {
			errorMessage = result.error || 'Failed to delete';
			showDeleteConfirm = false;
			selectedOfficer = null;
		}
	}

	onMount(() => {
		const url = $page.url;
		const msg = url.searchParams.get('message');
		if (msg) successMessage = msg;

		setTimeout(() => {
			successMessage = '';
			errorMessage = '';
		}, 5000);
	});
</script>

<svelte:head>
	<title>College Exam Officers</title>
</svelte:head>

<div class="page-container">
	<!-- Header -->
	<div class="page-header">
		<div>
			<h1 class="page-title">College Exam Officers</h1>
			<p class="page-subtitle">Manage exam officers assigned to each college</p>
		</div>
		<div class="header-actions">
			<a href="/admin/manage/exam-officer" class="btn btn-primary">
				<Plus size={16} />
				Create Exam Officer
			</a>
		</div>
	</div>

	<!-- Stats -->
	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-icon"><UserCog size={20} /></div>
			<div>
				<div class="stat-value">{totalOfficers}</div>
				<div class="stat-label">Total Exam Officers</div>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon"><Building2 size={20} /></div>
			<div>
				<div class="stat-value">{data.colleges.length}</div>
				<div class="stat-label">Colleges</div>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon"><CheckCircle size={20} /></div>
			<div>
				<div class="stat-value">{assignedCount}</div>
				<div class="stat-label">Assigned to Colleges</div>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon"><Shield size={20} /></div>
			<div>
				<div class="stat-value">{activeCount}</div>
				<div class="stat-label">Active</div>
			</div>
		</div>
	</div>

	<!-- Messages -->
	{#if successMessage}
		<div class="alert alert-success">
			<CheckCircle size={18} />
			<span>{successMessage}</span>
			<button class="alert-close" onclick={() => successMessage = ''}><X size={14} /></button>
		</div>
	{/if}
	{#if errorMessage}
		<div class="alert alert-error">
			<AlertCircle size={18} />
			<span>{errorMessage}</span>
			<button class="alert-close" onclick={() => errorMessage = ''}><X size={14} /></button>
		</div>
	{/if}

	<!-- Filters -->
	<div class="filters">
		<div class="search-box">
			<Search size={16} />
			<input
				type="text"
				placeholder="Search by name, email, or staff ID..."
				bind:value={searchQuery}
			/>
		</div>
		<select bind:value={filterCollege} class="filter-select">
			<option value="all">All Colleges</option>
			{#each data.colleges as college}
				<option value={college.id}>
					{college.name} ({college._count.users})
				</option>
			{/each}
			<option value="unassigned">Unassigned</option>
		</select>
	</div>

	<!-- Officer List -->
	<div class="officer-list">
		{#if Object.keys(groupedOfficers).length === 0}
			<div class="empty-state">
				<UserCog size={48} />
				<h3>No exam officers found</h3>
				<p>Create a new exam officer or assign an existing user</p>
				<div class="empty-actions">
					<a href="/admin/manage/exam-officer" class="btn btn-primary">
						<Plus size={16} />
						Create Exam Officer
					</a>
				</div>
			</div>
		{:else}
			{#each Object.entries(groupedOfficers) as [collegeName, officers]}
				<div class="college-group">
					<div class="college-header">
						<Building2 size={18} />
						<h3>{collegeName}</h3>
						<span class="officer-count">{officers.length} officer{officers.length !== 1 ? 's' : ''}</span>
					</div>
					<div class="officer-grid">
						{#each officers as officer}
							<div class="officer-card" class:inactive={!officer.isActive}>
								<div class="officer-avatar">
									{officer.fullName.charAt(0).toUpperCase()}
								</div>
								<div class="officer-info">
									<div class="officer-name">
										{officer.fullName}
										{#if !officer.isActive}
											<span class="badge badge-inactive">Inactive</span>
										{/if}
									</div>
									<div class="officer-details">
										<span><Mail size={12} /> {officer.email}</span>
										<span><User size={12} /> {officer.staffId || 'No staff ID'}</span>
									</div>
									{#if officer.college}
										<div class="officer-college">
											<Building2 size={12} />
											{officer.college.name} ({officer.college.code})
										</div>
									{/if}
								</div>
								<div class="officer-actions">
									<button
										class="btn-icon"
										title={officer.isActive ? 'Deactivate' : 'Activate'}
										onclick={() => handleToggleActive(officer)}
									>
										{#if officer.isActive}
											<Ban size={16} />
										{:else}
											<CheckCircle size={16} />
										{/if}
									</button>
									<button
										class="btn-icon btn-icon-danger"
										title="Delete officer"
										onclick={() => {
											selectedOfficer = officer;
											showDeleteConfirm = true;
										}}
									>
										<Trash2 size={16} />
									</button>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm && selectedOfficer}
	<div class="modal-overlay" onclick={() => { showDeleteConfirm = false; selectedOfficer = null; }}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>Delete Exam Officer</h2>
				<button class="modal-close" onclick={() => { showDeleteConfirm = false; selectedOfficer = null; }}>
					<X size={20} />
				</button>
			</div>

			<p class="confirm-text">
				Are you sure you want to permanently delete <strong>{selectedOfficer.fullName}</strong>?
			</p>
			<p class="confirm-subtext confirm-danger">
				This action cannot be undone. The user account will be completely removed from the system.
			</p>

			<div class="modal-actions">
				<button class="btn btn-secondary" onclick={() => { showDeleteConfirm = false; selectedOfficer = null; }}>
					Cancel
				</button>
				<button class="btn btn-danger" onclick={() => handleDelete(selectedOfficer)}>
					<Trash2 size={16} />
					Delete Permanently
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.page-container {
		max-width: 1200px;
		margin: 0 auto;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0;
		color: var(--color-text);
	}

	.page-subtitle {
		font-size: 0.875rem;
		color: var(--color-muted);
		margin: 0.25rem 0 0;
	}

	.header-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.stat-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		padding: 1rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.stat-icon {
		width: 40px;
		height: 40px;
		border-radius: 0.5rem;
		background: rgba(59, 130, 246, 0.1);
		color: #3b82f6;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.stat-value {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-text);
		line-height: 1.2;
	}

	.stat-label {
		font-size: 0.75rem;
		color: var(--color-muted);
	}

	.alert {
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		margin-bottom: 1rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.875rem;
	}

	.alert-success {
		background: rgba(34, 197, 94, 0.1);
		color: #16a34a;
		border: 1px solid rgba(34, 197, 94, 0.2);
	}

	.alert-error {
		background: rgba(239, 68, 68, 0.1);
		color: #dc2626;
		border: 1px solid rgba(239, 68, 68, 0.2);
	}

	.alert-close {
		margin-left: auto;
		background: none;
		border: none;
		cursor: pointer;
		color: inherit;
		padding: 0.25rem;
		border-radius: 0.25rem;
	}

	.filters {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
	}

	.search-box {
		flex: 1;
		min-width: 200px;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
	}

	.search-box input {
		background: none;
		border: none;
		outline: none;
		flex: 1;
		color: var(--color-text);
		font-size: 0.875rem;
	}

	.filter-select {
		padding: 0.5rem 0.75rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		color: var(--color-text);
		font-size: 0.875rem;
		min-width: 150px;
	}

	.officer-list {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.college-group {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		overflow: hidden;
	}

	.college-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		background: var(--color-bg);
		border-bottom: 1px solid var(--color-border);
	}

	.college-header h3 {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-text);
		margin: 0;
		flex: 1;
	}

	.officer-count {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-muted);
		background: var(--color-surface);
		padding: 0.15rem 0.6rem;
		border-radius: 999px;
	}

	.officer-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 0.75rem;
		padding: 0.75rem;
	}

	.officer-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		transition: all 0.15s ease;
	}

	.officer-card:hover {
		border-color: #3b82f6;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
	}

	.officer-card.inactive {
		opacity: 0.6;
	}

	.officer-card.inactive:hover {
		opacity: 0.8;
	}

	.officer-avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: linear-gradient(135deg, #3b82f6, #1d4ed8);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 0.9rem;
		color: white;
		flex-shrink: 0;
	}

	.officer-info {
		flex: 1;
		min-width: 0;
	}

	.officer-name {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text);
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.badge {
		font-size: 0.6rem;
		font-weight: 700;
		padding: 0.1rem 0.4rem;
		border-radius: 999px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.badge-inactive {
		background: rgba(239, 68, 68, 0.1);
		color: #dc2626;
	}

	.officer-details {
		display: flex;
		gap: 0.75rem;
		font-size: 0.75rem;
		color: var(--color-muted);
		margin-top: 0.1rem;
		flex-wrap: wrap;
	}

	.officer-details span {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.officer-college {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.7rem;
		color: #3b82f6;
		margin-top: 0.15rem;
		font-weight: 500;
	}

	.officer-actions {
		display: flex;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.btn-icon {
		width: 32px;
		height: 32px;
		border: none;
		border-radius: 0.375rem;
		background: transparent;
		color: var(--color-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s ease;
	}

	.btn-icon:hover {
		background: var(--color-surface-hover);
		color: #3b82f6;
	}

	.btn-icon-danger:hover {
		color: #dc2626;
		background: rgba(220, 38, 38, 0.08);
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		font-size: 0.85rem;
		font-weight: 600;
		text-decoration: none;
		border: none;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-primary {
		background: linear-gradient(135deg, #3b82f6, #1d4ed8);
		color: white;
	}

	.btn-primary:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
	}

	.btn-secondary {
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
	}

	.btn-secondary:hover {
		border-color: #3b82f6;
		color: #3b82f6;
	}

	.btn-danger {
		background: #dc2626;
		color: white;
	}

	.btn-danger:hover {
		background: #b91c1c;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 3rem 1.5rem;
		color: var(--color-muted);
		text-align: center;
	}

	.empty-state h3 {
		font-size: 1.1rem;
		color: var(--color-text);
		margin: 0;
	}

	.empty-state p {
		font-size: 0.875rem;
		margin: 0;
	}

	.empty-actions {
		margin-top: 0.5rem;
	}

	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.55);
		backdrop-filter: blur(4px);
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		animation: fadeIn 0.15s ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.modal {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 1rem;
		padding: 1.5rem;
		width: 100%;
		max-width: 440px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
		animation: slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes slideUp {
		from { opacity: 0; transform: translateY(16px) scale(0.97); }
		to { opacity: 1; transform: translateY(0) scale(1); }
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.modal-header h2 {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--color-text);
		margin: 0;
	}

	.modal-close {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--color-muted);
		padding: 0.25rem;
		border-radius: 0.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.modal-close:hover {
		background: var(--color-surface-hover);
		color: var(--color-text);
	}

	.confirm-text {
		font-size: 0.9rem;
		color: var(--color-text);
		margin: 0 0 0.25rem;
	}

	.confirm-subtext {
		font-size: 0.8rem;
		color: var(--color-muted);
		margin: 0 0 1.25rem;
	}

	.confirm-danger {
		color: #dc2626;
	}

	.modal-actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	.modal-actions .btn {
		flex: 1;
		justify-content: center;
	}

	@media (max-width: 768px) {
		.page-header {
			flex-direction: column;
		}

		.header-actions {
			width: 100%;
		}

		.header-actions .btn {
			flex: 1;
			justify-content: center;
		}

		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.officer-grid {
			grid-template-columns: 1fr;
			padding: 0.5rem;
		}

		.officer-card {
			padding: 0.625rem 0.75rem;
		}

		.filters {
			flex-direction: column;
		}

		.filter-select {
			width: 100%;
		}

		.modal {
			margin: 0.5rem;
			padding: 1rem;
		}
	}

	@media (max-width: 480px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}
	}
</style>