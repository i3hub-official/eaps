<!-- src/routes/lecturer/students/upload/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import {
    Upload, File, FileText, FileSpreadsheet,
    CheckCircle, AlertCircle, XCircle,
    Users, Download, Trash2, Eye,
    ChevronRight, Clock, Database,
    FileJson, FileCode, Table, List,
    Info, Shield, Check, X, Loader2
  } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const { departments, levels, uploadHistory } = data;

  let selectedFile = $state<File | null>(null);
  let isDragging = $state(false);
  let uploadStatus = $state<'idle' | 'uploading' | 'success' | 'error'>('idle');
  let uploadProgress = $state(0);
  let showPreview = $state(false);
  let previewData = $state<any[]>([]);
  let selectedDepartment = $state('');
  let selectedLevel = $state('');
  let defaultPassword = $state('student123');
  let showPassword = $state(false);

  // ── File type icons ────────────────────────────────────────────────────────
  function getFileIcon(file: File | null) {
    if (!file) return File;
    const ext = file.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'csv': return FileText;
      case 'xlsx':
      case 'xls': return FileSpreadsheet;
      case 'json': return FileJson;
      case 'txt': return FileCode;
      default: return File;
    }
  }

  function getFileTypeColor(file: File | null) {
    if (!file) return '#64748b';
    const ext = file.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'csv': return '#2563eb';
      case 'xlsx':
      case 'xls': return '#16a34a';
      case 'json': return '#d97706';
      case 'txt': return '#7c3aed';
      default: return '#64748b';
    }
  }

  function getFileIconComponent(file: File | null) {
    const Icon = getFileIcon(file);
    return Icon;
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function formatDate(d: string | Date) {
    return new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // ── Drag and drop ──────────────────────────────────────────────────────────
  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      const allowed = ['csv', 'xlsx', 'xls', 'txt', 'json'];
      if (allowed.includes(ext || '')) {
        selectedFile = file;
        // Preview the file
        previewFile(file);
      } else {
        alert(`Unsupported file type: ${ext}. Allowed: ${allowed.join(', ')}`);
      }
    }
  }

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      selectedFile = input.files[0];
      previewFile(input.files[0]);
    }
  }

  async function previewFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const buffer = await file.arrayBuffer();
    const content = new TextDecoder().decode(buffer);
    
    try {
      let data: any[] = [];
      if (ext === 'csv') {
        const lines = content.split('\n').filter(l => l.trim());
        if (lines.length > 0) {
          const headers = lines[0].split(',').map(h => h.trim());
          for (let i = 1; i < Math.min(lines.length, 6); i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const row: any = {};
            headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
            data.push(row);
          }
        }
      } else if (ext === 'json') {
        const parsed = JSON.parse(content);
        data = Array.isArray(parsed) ? parsed.slice(0, 5) : [parsed];
      } else if (ext === 'txt') {
        const lines = content.split('\n').filter(l => l.trim());
        if (lines.length > 0) {
          const hasTabs = lines[0].includes('\t');
          const delimiter = hasTabs ? '\t' : ',';
          const headers = lines[0].split(delimiter).map(h => h.trim());
          for (let i = 1; i < Math.min(lines.length, 6); i++) {
            const values = lines[i].split(delimiter).map(v => v.trim());
            const row: any = {};
            headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
            data.push(row);
          }
        }
      }
      previewData = data;
      showPreview = data.length > 0;
    } catch {
      showPreview = false;
    }
  }

  function removeFile() {
    selectedFile = null;
    showPreview = false;
    previewData = [];
    uploadStatus = 'idle';
  }

  // ── Toast system ──────────────────────────────────────────────────────────
  type Toast = { id: number; message: string; type: 'info' | 'warn' | 'success' | 'error' };
  let toasts = $state<Toast[]>([]);
  let toastId = 0;

  function showToast(message: string, type: Toast['type'] = 'info', duration = 3000) {
    const id = ++toastId;
    toasts = [...toasts, { id, message, type }];
    setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, duration);
  }

  // ── Handle form response ──────────────────────────────────────────────────
  $effect(() => {
    if (form) {
      if (form.success) {
        uploadStatus = 'success';
        showToast(form.message || 'Upload successful!', 'success');
        if (form.errors && form.errors.length > 0) {
          showToast(`${form.errors.length} errors encountered`, 'warn');
        }
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else if (form.error) {
        uploadStatus = 'error';
        showToast(form.error, 'error');
      }
    }
  });

  // ── Download template ─────────────────────────────────────────────────────
  function downloadTemplate() {
    const headers = [
      'fullName',
      'email',
      'matricNumber',
      'phone',
      'gender',
      'dateOfBirth',
      'jambRegNo',
      'departmentCode',
      'level'
    ];
    
    const sampleData = [
      {
        fullName: 'John Doe',
        email: 'john.doe@student.mouau.edu.ng',
        matricNumber: 'MOUAU/CSC/25/123456',
        phone: '08012345678',
        gender: 'male',
        dateOfBirth: '2000-01-15',
        jambRegNo: 'JAMB12345678',
        departmentCode: 'CSC',
        level: '100'
      },
      {
        fullName: 'Jane Smith',
        email: 'jane.smith@student.mouau.edu.ng',
        matricNumber: 'MOUAU/PHY/25/234567',
        phone: '08087654321',
        gender: 'female',
        dateOfBirth: '2000-06-20',
        jambRegNo: 'JAMB87654321',
        departmentCode: 'PHY',
        level: '200'
      }
    ];
    
    const csv = [
      headers.join(','),
      ...sampleData.map(row => headers.map(h => row[h as keyof typeof row] || '').join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_upload_template.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Template downloaded!', 'success');
  }
</script>

<svelte:head><title>Upload Students — MOUAU eTest</title></svelte:head>

<!-- ── Toast stack ─────────────────────────────────────────────────────────── -->
<div class="toast-stack" aria-live="polite">
  {#each toasts as t (t.id)}
    <div class="toast toast-{t.type}"
      in:fly={{ y: 10, duration: 200 }}
      out:fly={{ y: -6, duration: 160 }}>
      {#if t.type === 'warn'}<AlertCircle size={13} />
      {:else if t.type === 'success'}<CheckCircle size={13} />
      {:else if t.type === 'error'}<XCircle size={13} />
      {:else}<Info size={13} />{/if}
      {t.message}
    </div>
  {/each}
</div>

<div class="page">
  <!-- Header -->
  <div class="page-header">
    <div class="header-main">
      <div>
        <div class="header-badge">
          <Upload size={16} />
          <span>Bulk Upload</span>
        </div>
        <h1>Upload Students</h1>
        <p class="subtitle">Bulk import students from CSV, Excel, JSON, or TXT files</p>
      </div>
      <div class="header-actions">
        <button class="btn-secondary" onclick={downloadTemplate}>
          <Download size={14} /> Download Template
        </button>
        <a href="/lecturer/students" class="btn-primary">
          <Eye size={14} /> View Students
        </a>
      </div>
    </div>
  </div>

  <!-- Supported Formats -->
  <div class="formats-bar">
    <span class="formats-label">Supported formats:</span>
    <div class="format-tags">
      <span class="format-tag"><FileText size={12} /> CSV</span>
      <span class="format-tag"><FileSpreadsheet size={12} /> Excel</span>
      <span class="format-tag"><FileJson size={12} /> JSON</span>
      <span class="format-tag"><FileCode size={12} /> TXT</span>
    </div>
  </div>

  <!-- Upload Area -->
  <div class="upload-section">
    <form method="POST" enctype="multipart/form-data" use:enhance={() => {
      uploadStatus = 'uploading';
      uploadProgress = 0;
      return async ({ update }) => {
        const result = await update();
        uploadProgress = 100;
        return result;
      };
    }}>
      <input type="hidden" name="departmentId" value={selectedDepartment} />
      <input type="hidden" name="levelId" value={selectedLevel} />
      <input type="hidden" name="defaultPassword" value={defaultPassword} />

      <!-- Drop Zone -->
      <div 
        class="drop-zone"
        class:dragging={isDragging}
        class:has-file={!!selectedFile}
        class:uploading={uploadStatus === 'uploading'}
        class:success={uploadStatus === 'success'}
        class:error={uploadStatus === 'error'}
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        ondrop={handleDrop}
      >
        {#if !selectedFile}
          <div class="drop-content">
            <div class="drop-icon">
              <Upload size={40} strokeWidth={1.2} />
            </div>
            <h3>Drop your file here</h3>
            <p>or click to browse</p>
            <p class="drop-hint">Supports CSV, Excel (.xlsx, .xls), JSON, and TXT files</p>
            <input 
              type="file" 
              accept=".csv,.xlsx,.xls,.json,.txt" 
              onchange={handleFileSelect}
              class="file-input"
            />
          </div>
        {:else if uploadStatus === 'uploading'}
          <div class="uploading-content">
            <Loader2 size={40} class="spin" />
            <h3>Uploading...</h3>
            <div class="progress-track">
              <div class="progress-fill" style="width:{uploadProgress}%"></div>
            </div>
            <p>{uploadProgress}%</p>
          </div>
        {:else if uploadStatus === 'success'}
          <div class="success-content">
            <CheckCircle size={40} style="color:#16a34a;" />
            <h3>Upload Complete!</h3>
            <p>{form?.successCount || 0} students added successfully</p>
            {#if form?.errors && form.errors.length > 0}
              <p class="warning-text">{form.errors.length} errors encountered</p>
            {/if}
          </div>
        {:else if uploadStatus === 'error'}
          <div class="error-content">
            <XCircle size={40} style="color:#dc2626;" />
            <h3>Upload Failed</h3>
            <p>{form?.error || 'An error occurred during upload'}</p>
          </div>
        {:else}
          <div class="file-selected">
            <div class="file-icon" style="color:{getFileTypeColor(selectedFile)};">
              <svelte:component this={getFileIconComponent(selectedFile)} size={32} />
            </div>
            <div class="file-info">
              <span class="file-name">{selectedFile.name}</span>
              <span class="file-meta">{formatFileSize(selectedFile.size)} • {selectedFile.type || 'Unknown'}</span>
            </div>
            <button type="button" class="remove-btn" onclick={removeFile}>
              <X size={16} />
            </button>
          </div>
        {/if}
      </div>

      <!-- Options -->
      <div class="options-grid">
        <div class="option-group">
          <label>Default Department <span class="optional">(optional)</span></label>
          <select bind:value={selectedDepartment}>
            <option value="">Auto-detect from file</option>
            {#each departments as dept}
              <option value={dept.id}>{dept.code} - {dept.name}</option>
            {/each}
          </select>
        </div>

        <div class="option-group">
          <label>Default Level <span class="optional">(optional)</span></label>
          <select bind:value={selectedLevel}>
            <option value="">Auto-detect from file</option>
            {#each levels as level}
              <option value={String(level.id)}>{level.level}L - {level.name || `${level.level} Level`}</option>
            {/each}
          </select>
        </div>

        <div class="option-group">
          <label>Default Password</label>
          <div class="password-wrap">
            <input 
              type={showPassword ? 'text' : 'password'} 
              bind:value={defaultPassword}
              placeholder="student123"
            />
            <button type="button" class="toggle-password" onclick={() => showPassword = !showPassword}>
              {#if showPassword}
                <Eye size={14} />
              {:else}
                <Eye size={14} style="opacity:0.5;" />
              {/if}
            </button>
          </div>
          <span class="hint">Students will use this password to login initially</span>
        </div>
      </div>

      <!-- Preview -->
      {#if showPreview && previewData.length > 0 && uploadStatus === 'idle'}
        <div class="preview-section">
          <div class="preview-header">
            <h3>Preview</h3>
            <span class="preview-count">{previewData.length} rows shown</span>
          </div>
          <div class="table-wrap">
            <table class="preview-table">
              <thead>
                <tr>
                  {#each Object.keys(previewData[0] || {}) as header}
                    <th>{header}</th>
                  {/each}
                </tr>
              </thead>
              <tbody>
                {#each previewData as row, i}
                  <tr>
                    {#each Object.values(row) as value}
                      <td>{String(value).slice(0, 50)}{String(value).length > 50 ? '...' : ''}</td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
          <p class="preview-note">
            <Info size={12} />
            Showing first {previewData.length} rows of data. All rows will be processed.
          </p>
        </div>
      {/if}

      <!-- Submit -->
      <button 
        type="submit" 
        class="submit-btn" 
        disabled={!selectedFile || uploadStatus === 'uploading'}
      >
        {#if uploadStatus === 'uploading'}
          <Loader2 size={18} class="spin" /> Uploading...
        {:else}
          <Upload size={18} /> Upload Students
        {/if}
      </button>
    </form>
  </div>

  <!-- Upload History -->
  {#if uploadHistory && uploadHistory.length > 0}
    <div class="history-section">
      <div class="history-header">
        <h3>Recent Uploads</h3>
        <span class="history-count">{uploadHistory.length} uploads</span>
      </div>
      <div class="history-list">
        {#each uploadHistory as entry}
          <div class="history-item">
            <div class="history-icon">
              <FileText size={16} />
            </div>
            <div class="history-info">
              <span class="history-name">{entry.fileName}</span>
              <span class="history-meta">
                {formatFileSize(entry.fileSize)} • {entry.rowCount} rows • 
                <span class:success={entry.successCount > 0} class:error={entry.errorCount > 0}>
                  {entry.successCount} success{entry.errorCount > 0 ? `, ${entry.errorCount} errors` : ''}
                </span>
              </span>
            </div>
            <div class="history-date">
              <Clock size={12} />
              {formatDate(entry.uploadedAt)}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Info Box -->
  <div class="info-box">
    <div class="info-icon"><Info size={18} /></div>
    <div class="info-content">
      <h4>Upload Guidelines</h4>
      <ul>
        <li><strong>Required columns:</strong> <code>fullName</code>, <code>email</code>, <code>matricNumber</code>, <code>departmentCode</code>, <code>level</code></li>
        <li><strong>Optional columns:</strong> <code>phone</code>, <code>gender</code>, <code>dateOfBirth</code>, <code>jambRegNo</code></li>
        <li><strong>Department codes:</strong> Use the department code (e.g., <code>CSC</code>, <code>PHY</code>, <code>ACC</code>)</li>
        <li><strong>Levels:</strong> Use numeric values (e.g., <code>100</code>, <code>200</code>, <code>300</code>)</li>
        <li><strong>Gender:</strong> <code>male</code>, <code>female</code>, <code>non-binary</code>, <code>prefer_not_to_say</code></li>
        <li><strong>Date format:</strong> <code>YYYY-MM-DD</code> (e.g., <code>2000-01-15</code>)</li>
        <li><strong>File size limit:</strong> 5MB per file</li>
      </ul>
    </div>
  </div>
</div>

<style>
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
    pointer-events: auto;
  }
  .toast-info { background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); }
  .toast-warn { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
  .toast-success { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
  .toast-error { background: #fecaca; color: #991b1b; border: 1px solid #fca5a5; }

  :global(.spin) { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .page {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .page-header {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 1.5rem;
  }

  .header-badge {
    display: inline-flex; align-items: center; gap: 0.4rem;
    font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.05em; color: var(--color-muted);
    padding: 0.2rem 0.6rem;
    background: var(--color-bg); border-radius: 999px;
    margin-bottom: 0.5rem;
  }

  .header-main {
    display: flex; justify-content: space-between; align-items: center;
  }

  .header-main h1 {
    font-size: 1.5rem; font-weight: 800; color: var(--color-text);
    margin: 0;
  }

  .subtitle {
    font-size: 0.8rem; color: var(--color-muted); margin: 0.2rem 0 0;
  }

  .btn-primary {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.55rem 1.1rem;
    background: var(--lc-600); color: white;
    border: none; border-radius: 0.6rem;
    font-size: 0.82rem; font-weight: 700;
    text-decoration: none; cursor: pointer;
    transition: background 0.15s, transform 0.15s;
  }
  .btn-primary:hover { background: var(--lc-700); transform: translateY(-1px); }

  .btn-secondary {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.55rem 1.1rem;
    background: var(--color-bg); color: var(--color-text);
    border: 1px solid var(--color-border); border-radius: 0.6rem;
    font-size: 0.82rem; font-weight: 700;
    text-decoration: none; cursor: pointer;
    transition: all 0.15s;
  }
  .btn-secondary:hover { border-color: var(--lc-600); color: var(--lc-600); background: var(--lc-soft); }

  .formats-bar {
    display: flex; align-items: center; gap: 1rem;
    padding: 0.5rem 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    flex-wrap: wrap;
  }

  .formats-label {
    font-size: 0.75rem; font-weight: 600; color: var(--color-muted);
  }

  .format-tags {
    display: flex; gap: 0.5rem; flex-wrap: wrap;
  }

  .format-tag {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.6rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: 999px; color: var(--color-muted);
  }

  .upload-section {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 1.5rem;
  }

  .drop-zone {
    border: 2px dashed var(--color-border);
    border-radius: 0.75rem;
    padding: 2rem;
    text-align: center;
    transition: all 0.3s ease;
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    cursor: pointer;
  }
  .drop-zone:hover { border-color: var(--lc-600); background: var(--lc-soft); }
  .drop-zone.dragging { border-color: var(--lc-600); background: var(--lc-soft); transform: scale(1.01); }
  .drop-zone.has-file { border-color: var(--lc-600); border-style: solid; }
  .drop-zone.uploading { border-color: var(--lc-600); background: var(--lc-soft); cursor: wait; }
  .drop-zone.success { border-color: #16a34a; background: rgba(22,163,74,0.05); }
  .drop-zone.error { border-color: #dc2626; background: rgba(220,38,38,0.05); }

  .file-input {
    position: absolute; inset: 0; opacity: 0; cursor: pointer;
  }

  .drop-content {
    display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
  }
  .drop-icon {
    width: 72px; height: 72px; border-radius: 1rem;
    background: var(--lc-soft); color: var(--lc-600);
    display: flex; align-items: center; justify-content: center;
  }
  .drop-content h3 { font-size: 1.1rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .drop-content p { font-size: 0.85rem; color: var(--color-muted); margin: 0; }
  .drop-hint { font-size: 0.75rem; color: var(--color-muted); }

  .file-selected {
    display: flex; align-items: center; gap: 1rem;
    width: 100%; max-width: 400px;
  }
  .file-icon {
    width: 48px; height: 48px; border-radius: 0.75rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .file-info { flex: 1; text-align: left; min-width: 0; }
  .file-name { font-weight: 600; color: var(--color-text); display: block; overflow: hidden; text-overflow: ellipsis; }
  .file-meta { font-size: 0.75rem; color: var(--color-muted); }
  .remove-btn {
    width: 32px; height: 32px; border-radius: 50%;
    border: none; background: rgba(220,38,38,0.08);
    color: #dc2626; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s;
    flex-shrink: 0;
  }
  .remove-btn:hover { background: rgba(220,38,38,0.16); }

  .uploading-content {
    display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
  }
  .uploading-content h3 { font-size: 1.1rem; font-weight: 700; color: var(--color-text); margin: 0; }

  .progress-track {
    width: 200px; height: 6px; background: var(--color-border); border-radius: 3px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%; background: linear-gradient(90deg, var(--lc-600), var(--lc-500));
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  .success-content, .error-content {
    display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
  }
  .success-content h3 { font-size: 1.1rem; font-weight: 700; color: #16a34a; margin: 0; }
  .error-content h3 { font-size: 1.1rem; font-weight: 700; color: #dc2626; margin: 0; }
  .warning-text { color: #d97706; font-weight: 600; }

  .options-grid {
    display: grid; grid-template-columns: 1fr 1fr 1fr;
    gap: 1rem;
    margin-top: 1rem;
  }

  .option-group {
    display: flex; flex-direction: column; gap: 0.3rem;
  }
  .option-group label {
    font-size: 0.75rem; font-weight: 600; color: var(--color-text);
  }
  .optional {
    font-weight: 400; color: var(--color-muted);
    font-size: 0.7rem;
  }
  .option-group select,
  .option-group input {
    padding: 0.45rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.8rem;
    font-family: inherit;
    outline: none;
  }
  .option-group select:focus,
  .option-group input:focus {
    border-color: var(--lc-600);
    box-shadow: 0 0 0 3px var(--lc-soft);
  }

  .password-wrap {
    display: flex; align-items: center;
    position: relative;
  }
  .password-wrap input {
    flex: 1;
    padding-right: 2.5rem;
  }
  .toggle-password {
    position: absolute; right: 0.5rem;
    background: none; border: none;
    color: var(--color-muted); cursor: pointer;
    padding: 0.2rem;
  }
  .toggle-password:hover { color: var(--color-text); }

  .hint {
    font-size: 0.65rem; color: var(--color-muted);
  }

  .preview-section {
    margin-top: 1rem;
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    overflow: hidden;
  }

  .preview-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 0.75rem 1rem;
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
  }
  .preview-header h3 {
    font-size: 0.8rem; font-weight: 700; color: var(--color-text);
    margin: 0;
  }
  .preview-count {
    font-size: 0.7rem; color: var(--color-muted);
  }

  .table-wrap {
    overflow: auto;
    max-height: 300px;
  }

  .preview-table {
    width: 100%; border-collapse: collapse;
    font-size: 0.78rem;
  }
  .preview-table th {
    padding: 0.4rem 0.6rem;
    text-align: left;
    font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.04em; color: var(--color-muted);
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
    position: sticky; top: 0;
    z-index: 1;
  }
  .preview-table td {
    padding: 0.3rem 0.6rem;
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text);
  }
  .preview-table tr:hover td { background: var(--lc-soft); }

  .preview-note {
    display: flex; align-items: center; gap: 0.3rem;
    padding: 0.5rem 1rem;
    font-size: 0.7rem; color: var(--color-muted);
    background: var(--color-bg);
    margin: 0;
  }

  .submit-btn {
    width: 100%; margin-top: 1rem;
    padding: 0.75rem;
    background: var(--lc-600); color: white;
    border: none; border-radius: 0.6rem;
    font-size: 0.9rem; font-weight: 700;
    cursor: pointer;
    transition: background 0.15s, transform 0.15s;
    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  }
  .submit-btn:hover:not(:disabled) { background: var(--lc-700); transform: translateY(-1px); }
  .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .history-section {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 1.25rem;
  }

  .history-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 0.75rem;
  }
  .history-header h3 {
    font-size: 0.85rem; font-weight: 700; color: var(--color-text);
    margin: 0;
  }
  .history-count {
    font-size: 0.7rem; color: var(--color-muted);
  }

  .history-list {
    display: flex; flex-direction: column; gap: 0.5rem;
  }

  .history-item {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
  }
  .history-item:hover { border-color: var(--lc-600); }

  .history-icon {
    width: 32px; height: 32px; border-radius: 0.4rem;
    background: var(--lc-soft); color: var(--lc-600);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .history-info { flex: 1; min-width: 0; }
  .history-name { font-weight: 600; color: var(--color-text); display: block; }
  .history-meta {
    font-size: 0.7rem; color: var(--color-muted);
  }
  .history-meta .success { color: #16a34a; }
  .history-meta .error { color: #dc2626; }

  .history-date {
    display: flex; align-items: center; gap: 0.3rem;
    font-size: 0.7rem; color: var(--color-muted);
    white-space: nowrap;
  }

  .info-box {
    display: flex; gap: 1rem;
    padding: 1.25rem;
    background: var(--lc-soft);
    border: 1px solid rgba(79,70,229,0.15);
    border-radius: 0.875rem;
  }

  .info-icon { color: var(--lc-600); flex-shrink: 0; margin-top: 0.1rem; }
  .info-content h4 {
    font-size: 0.85rem; font-weight: 700; color: var(--color-text);
    margin: 0 0 0.5rem;
  }
  .info-content ul {
    margin: 0; padding-left: 1.25rem;
    font-size: 0.78rem; color: var(--color-muted);
    line-height: 1.8;
  }
  .info-content code {
    font-family: monospace; font-size: 0.7rem;
    background: var(--color-surface); padding: 0.1rem 0.3rem;
    border-radius: 0.25rem;
    color: var(--color-text);
  }

  @media (max-width: 768px) {
    .page { padding: 1rem; }
    .header-main { flex-direction: column; align-items: stretch; gap: 0.75rem; }
    .header-actions { flex-wrap: wrap; }
    .header-actions .btn-primary,
    .header-actions .btn-secondary { flex: 1; justify-content: center; }
    .options-grid { grid-template-columns: 1fr; }
    .history-item { flex-wrap: wrap; }
    .history-date { margin-left: auto; }
  }
</style>