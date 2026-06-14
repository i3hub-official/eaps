<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';
  import { slide, fade } from 'svelte/transition';
  import {
    Copy, Play, RotateCcw, CheckCircle, XCircle, Clock,
    Key, AlertTriangle, Plus, Trash2, Loader2, FlaskConical,
    ShieldOff, ChevronDown, Terminal, Send, Globe, Lock,
    FileJson, ArrowRight, Sparkles, History, Bookmark
  } from '@lucide/svelte';

  let { data, form: formResult }: { data: PageData; form: ActionData } = $props();

  // ── Test key state ────────────────────────────────────────────
  let testKeyRaw    = $state<string | null>(null);
  let testKeyId     = $state<string | null>(null);
  let testKeyName   = $state<string | null>(null);
  let creatingKey   = $state(false);
  let revokingKey   = $state(false);

  $effect(() => {
    if (formResult?.success && formResult?.rawKey) {
      testKeyRaw  = formResult.rawKey;
      testKeyId   = formResult.keyId;
      testKeyName = formResult.keyName;
      authHeader  = `Bearer ${formResult.rawKey}`;
    }
    if (formResult?.success && !formResult?.rawKey && testKeyId) {
      testKeyRaw  = null;
      testKeyId   = null;
      testKeyName = null;
      authHeader  = '';
    }
  });

  // ── Request state ─────────────────────────────────────────────
  let method      = $state<'GET' | 'POST' | 'PATCH' | 'DELETE'>('GET');
  let endpoint    = $state('/api/admin/users');
  let bodyText    = $state('');
  let authHeader  = $state('');
  let extraHeaders= $state('{}');
  let showAdvanced = $state(false);

  // ── Response state ────────────────────────────────────────────
  type Resp = {
    status: number; statusText: string;
    headers: Record<string, string>;
    body: string; duration: number; size: number;
  };
  let response    = $state<Resp | null>(null);
  let isLoading   = $state(false);
  let reqError    = $state('');
  let copied      = $state(false);
  let responseTab = $state<'body' | 'headers' | 'info'>('body');
  let requestHistory = $state<Array<{method: string; endpoint: string; status: number; duration: number; time: number}>>([]);

  // ── Presets ─────────────────────────────────────────────────
  const PRESETS = [
    { label: 'List Users',          method: 'GET',  path: '/api/admin/users',              category: 'Users' },
    { label: 'Get User by ID',      method: 'GET',  path: '/api/admin/users/__ID__',       category: 'Users' },
    { label: 'List Exams',          method: 'GET',  path: '/api/admin/exams',              category: 'Exams' },
    { label: 'Exam Reports',        method: 'GET',  path: '/api/admin/reports/exams',      category: 'Reports' },
    { label: 'Student Performance', method: 'GET',  path: '/api/admin/reports/students',   category: 'Reports' },
    { label: 'Violations',          method: 'GET',  path: '/api/admin/violations',         category: 'Security' },
    { label: 'Auth check',          method: 'GET',  path: '/api/auth',                     category: 'System' },
  ] as const;

  const PRESET_CATEGORIES = [...new Set(PRESETS.map(p => p.category))];

  function applyPreset(p: typeof PRESETS[number]) {
    method   = p.method as typeof method;
    endpoint = p.path;
  }

  function formatJson(s: string) {
    try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; }
  }

  function statusClass(code: number) {
    if (code < 300) return 'ok';
    if (code < 400) return 'redirect';
    if (code < 500) return 'client';
    return 'server';
  }

  function formatSize(bytes: number) {
    return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
  }

  async function run() {
    if (!authHeader.trim()) { reqError = 'No auth header — create a test key first.'; return; }

    reqError  = '';
    isLoading = true;
    response  = null;

    let extra: Record<string, string> = {};
    try { extra = JSON.parse(extraHeaders || '{}'); }
    catch { reqError = 'Invalid extra headers JSON.'; isLoading = false; return; }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
      ...extra,
    };

    const start = performance.now();
    try {
      const res = await fetch(endpoint, {
        method,
        headers,
        body: ['POST','PATCH'].includes(method) && bodyText.trim() ? bodyText : undefined,
        signal: AbortSignal.timeout(15_000),
      });

      const duration = Math.round(performance.now() - start);
      const raw      = await res.text();
      const size     = new TextEncoder().encode(raw).length;
      const resHdrs: Record<string, string> = {};
      res.headers.forEach((v, k) => { resHdrs[k] = v; });

      response    = { status: res.status, statusText: res.statusText, headers: resHdrs, body: raw, duration, size };
      responseTab = 'body';
      
      // Add to history
      requestHistory = [{method, endpoint, status: res.status, duration, time: Date.now()}, ...requestHistory.slice(0, 9)];
    } catch (e: unknown) {
      reqError = e instanceof Error ? e.message : 'Request failed';
    } finally {
      isLoading = false;
    }
  }

  async function copyResponse() {
    if (!response) return;
    await navigator.clipboard.writeText(formatJson(response.body));
    copied = true;
    setTimeout(() => { copied = false; }, 2000);
  }

  function reset() { response = null; reqError = ''; }
  
  function formatRelativeTime(ts: number) {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  }
</script>

<svelte:head><title>API Playground — MOUAU eTest Admin</title></svelte:head>

<div class="pg-page">

  <!-- Header -->
  <div class="pg-header">
    <div class="pg-header-left">
      <div class="pg-header-icon"><FlaskConical size={20} /></div>
      <div>
        <h1 class="pg-title">API Playground</h1>
        <p class="pg-subtitle">Test endpoints against live data with a temporary key</p>
      </div>
    </div>
    <a href="/admin/api-keys" class="pg-back-link">
      <Key size={14} /> API Keys
    </a>
  </div>

  <!-- Test Key Banner -->
  {#if testKeyRaw}
    <div class="key-banner key-banner--active" transition:slide={{ duration: 200 }}>
      <div class="key-banner-main">
        <div class="key-banner-icon"><CheckCircle size={18} /></div>
        <div class="key-banner-info">
          <div class="key-banner-title">{testKeyName}</div>
          <div class="key-banner-meta">
            <span class="key-status">Active</span>
            <span class="key-dot">•</span>
            <span>Expires in 1 hour</span>
            <span class="key-dot">•</span>
            <span>Read-only scopes</span>
          </div>
        </div>
      </div>
      <div class="key-banner-actions">
        <code class="key-preview">{testKeyRaw.slice(0, 24)}…</code>
        <form method="POST" action="?/revokeKey" use:enhance={() => {
          revokingKey = true;
          return async ({ update }) => { revokingKey = false; await update(); };
        }}>
          <input type="hidden" name="id" value={testKeyId} />
          <button type="submit" class="btn-revoke" disabled={revokingKey}>
            {#if revokingKey}<Loader2 size={13} class="spin" />{:else}<ShieldOff size={13} />{/if}
            Revoke
          </button>
        </form>
      </div>
    </div>
  {:else}
    <div class="key-banner" transition:slide={{ duration: 200 }}>
      <div class="key-banner-main">
        <div class="key-banner-icon key-banner-icon--muted"><Key size={18} /></div>
        <div class="key-banner-info">
          <div class="key-banner-title">No test key active</div>
          <div class="key-banner-meta">Create a temporary read-only key to start testing endpoints</div>
        </div>
      </div>
      <form method="POST" action="?/createTestKey" use:enhance={() => {
        creatingKey = true;
        return async ({ update }) => { creatingKey = false; await update(); };
      }}>
        <button type="submit" class="btn-create" disabled={creatingKey}>
          {#if creatingKey}<Loader2 size={14} class="spin" />{:else}<Sparkles size={14} />{/if}
          Create Test Key
        </button>
      </form>
    </div>
  {/if}

  <!-- Workspace -->
  <div class="workspace">

    <!-- Request Panel -->
    <div class="request-panel">
      <div class="panel-head">
        <Terminal size={15} />
        <span>Request</span>
      </div>

      <!-- Presets -->
      <div class="panel-section">
        <div class="section-label"><Bookmark size={11} /> Presets</div>
        <div class="presets-wrap">
          {#each PRESET_CATEGORIES as cat}
            <div class="preset-category">
              <span class="preset-cat-label">{cat}</span>
              <div class="preset-list">
                {#each PRESETS.filter(p => p.category === cat) as p}
                  <button class="preset-chip" type="button" onclick={() => applyPreset(p)}>
                    <span class="preset-method method-{p.method.toLowerCase()}">{p.method}</span>
                    <span class="preset-label">{p.label}</span>
                  </button>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- URL -->
      <div class="panel-section">
        <div class="section-label"><Globe size={11} /> Endpoint</div>
        <div class="url-row">
          <select bind:value={method} class="method-select method-{method.toLowerCase()}">
            <option>GET</option>
            <option>POST</option>
            <option>PATCH</option>
            <option>DELETE</option>
          </select>
          <input type="text" bind:value={endpoint} placeholder="/api/admin/…" class="endpoint-input" />
        </div>
      </div>

      <!-- Auth -->
      <div class="panel-section">
        <div class="section-label"><Lock size={11} /> Authorization</div>
        <input
          type="text"
          bind:value={authHeader}
          placeholder="Bearer sk_…  (auto-filled when test key is created)"
          class="auth-input"
          class:auth-set={!!authHeader}
        />
      </div>

      <!-- Advanced toggle -->
      <button class="advanced-toggle" onclick={() => showAdvanced = !showAdvanced}>
        <ChevronDown size={12} style="transform: rotate({showAdvanced ? '180deg' : '0deg'}); transition: transform .2s" />
        Advanced Options
      </button>

      {#if showAdvanced}
        <div class="panel-section" transition:slide={{ duration: 200 }}>
          <div class="section-label"><FileJson size={11} /> Extra Headers (JSON)</div>
          <textarea
            bind:value={extraHeaders}
            placeholder={`{"X-Custom-Header": "value"}`}
            class="code-textarea code-textarea--sm"
            spellcheck="false"
          ></textarea>
        </div>

        {#if ['POST','PATCH'].includes(method)}
          <div class="panel-section panel-section--flex" transition:slide={{ duration: 200 }}>
            <div class="section-label"><FileJson size={11} /> Request Body</div>
            <textarea
              bind:value={bodyText}
              placeholder={'{\n  "key": "value"\n}'}
              class="code-textarea"
              spellcheck="false"
            ></textarea>
          </div>
        {/if}
      {/if}

      <!-- History -->
      {#if requestHistory.length > 0}
        <div class="panel-section panel-section--history">
          <div class="section-label"><History size={11} /> Recent Requests</div>
          <div class="history-list">
            {#each requestHistory as h}
              <button class="history-item" onclick={() => { method = h.method as typeof method; endpoint = h.endpoint; }}>
                <span class="history-method method-{h.method.toLowerCase()}">{h.method}</span>
                <span class="history-endpoint">{h.endpoint}</span>
                <span class="history-status status-{statusClass(h.status)}">{h.status}</span>
                <span class="history-time">{h.duration}ms</span>
                <span class="history-rel">{formatRelativeTime(h.time)}</span>
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Actions -->
      <div class="panel-foot">
        <button class="btn-ghost btn-sm" type="button" onclick={reset}>
          <RotateCcw size={13} /> Reset
        </button>
        <button class="btn-primary" type="button" onclick={run} disabled={isLoading || !authHeader.trim()}>
          {#if isLoading}
            <Loader2 size={14} class="spin" /> Sending…
          {:else}
            <Send size={14} /> Send Request
          {/if}
        </button>
      </div>
    </div>

    <!-- Response Panel -->
    <div class="panel response-panel">
      <div class="panel-head">
        <ArrowRight size={15} />
        <span>Response</span>
        {#if response}
          <span class="panel-head-badge status-{statusClass(response.status)}">{response.status}</span>
        {/if}
      </div>

      {#if reqError}
        <div class="res-state res-state--error" transition:fade>
          <div class="res-state-icon"><XCircle size={28} /></div>
          <div class="res-state-title">Request Failed</div>
          <p>{reqError}</p>
        </div>

      {:else if isLoading}
        <div class="res-state res-state--loading">
          <div class="loading-ring"></div>
          <div class="res-state-title">Sending Request…</div>
          <p>Waiting for server response</p>
        </div>

      {:else if !response}
        <div class="res-state res-state--empty">
          <div class="res-state-icon res-state-icon--muted"><Terminal size={32} /></div>
          <div class="res-state-title">Ready to Test</div>
          <p>Configure your request and hit <strong>Send Request</strong></p>
          {#if !authHeader}
            <p class="res-state-hint">Create a test key above to authenticate</p>
          {/if}
        </div>

      {:else}
        <!-- Response meta bar -->
        <div class="res-meta-bar">
          <div class="res-meta-group">
            <span class="res-meta-badge status-{statusClass(response.status)}">
              {#if response.status < 300}<CheckCircle size={11} />{:else}<XCircle size={11} />{/if}
              {response.status} {response.statusText}
            </span>
            <span class="res-meta-item"><Clock size={11} /> {response.duration}ms</span>
            <span class="res-meta-item">{formatSize(response.size)}</span>
          </div>
          <button class="btn-ghost btn-sm btn-copy" onclick={copyResponse}>
            {#if copied}<CheckCircle size={12} /> Copied{:else}<Copy size={12} /> Copy{/if}
          </button>
        </div>

        <!-- Tabs -->
        <div class="res-tabs">
          {#each ['body','headers','info'] as t}
            <button
              class="res-tab"
              class:res-tab--active={responseTab === t}
              onclick={() => responseTab = t as typeof responseTab}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {#if t === 'headers'}<span class="tab-badge">{Object.keys(response.headers).length}</span>{/if}
            </button>
          {/each}
        </div>

        <!-- Content -->
        <div class="res-content">
          {#if responseTab === 'body'}
            <pre class="res-body">{formatJson(response.body)}</pre>

          {:else if responseTab === 'headers'}
            <div class="res-headers">
              {#each Object.entries(response.headers) as [k, v]}
                <div class="hdr-row">
                  <span class="hdr-key">{k}</span>
                  <span class="hdr-val">{v}</span>
                </div>
              {/each}
            </div>

          {:else}
            <div class="res-info">
              {#each [
                ['Status',   `${response.status} ${response.statusText}`],
                ['Duration', `${response.duration}ms`],
                ['Size',     formatSize(response.size)],
                ['Method',   method],
                ['Endpoint', endpoint],
              ] as [label, value]}
                <div class="info-row">
                  <span class="info-label">{label}</span>
                  <span class="info-value">{value}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .pg-page {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  /* ── Header ──────────────────────────────────────────────────── */
  .pg-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .pg-header-left {
    display: flex;
    align-items: center;
    gap: 0.875rem;
  }
  .pg-header-icon {
    width: 44px;
    height: 44px;
    border-radius: 0.75rem;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
  }
  .pg-title {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--color-text);
    line-height: 1.2;
    letter-spacing: -0.025em;
    margin: 0;
  }
  .pg-subtitle {
    font-size: 0.8rem;
    color: var(--color-muted);
    margin: 0.25rem 0 0;
  }
  .pg-back-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-muted);
    text-decoration: none;
    transition: all 0.15s;
  }
  .pg-back-link:hover {
    border-color: #3b82f6;
    color: #3b82f6;
    background: rgba(59, 130, 246, 0.04);
  }

  /* ── Key Banner ──────────────────────────────────────────────── */
  .key-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    padding: 1rem 1.25rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    transition: all 0.2s;
  }
  .key-banner--active {
    border-color: rgba(22, 163, 74, 0.25);
    background: linear-gradient(135deg, rgba(22, 163, 74, 0.04), var(--color-surface));
  }
  .key-banner-main {
    display: flex;
    align-items: center;
    gap: 0.875rem;
  }
  .key-banner-icon {
    width: 40px;
    height: 40px;
    border-radius: 0.625rem;
    background: rgba(22, 163, 74, 0.1);
    color: #16a34a;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .key-banner-icon--muted {
    background: var(--color-bg);
    color: var(--color-muted);
  }
  .key-banner-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .key-banner-title {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--color-text);
  }
  .key-banner-meta {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.75rem;
    color: var(--color-muted);
    flex-wrap: wrap;
  }
  .key-status {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.15rem 0.5rem;
    background: rgba(22, 163, 74, 0.1);
    color: #16a34a;
    border-radius: 1rem;
    font-size: 0.7rem;
    font-weight: 700;
  }
  .key-dot {
    opacity: 0.4;
  }
  .key-banner-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .key-preview {
    font-family: 'SF Mono', Monaco, monospace;
    font-size: 0.72rem;
    background: var(--color-bg);
    padding: 0.375rem 0.625rem;
    border-radius: 0.375rem;
    color: var(--color-muted);
    border: 1px solid var(--color-border);
  }
  .btn-create {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
  }
  .btn-create:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35);
  }
  .btn-create:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
  .btn-revoke {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 1rem;
    background: rgba(220, 38, 38, 0.06);
    border: 1px solid rgba(220, 38, 38, 0.2);
    color: #dc2626;
    border-radius: 0.5rem;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
  }
  .btn-revoke:hover:not(:disabled) {
    background: rgba(220, 38, 38, 0.1);
    border-color: rgba(220, 38, 38, 0.35);
  }
  .btn-revoke:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* ── Workspace ───────────────────────────────────────────────── */
  .workspace {
    display: grid;
    grid-template-columns: 420px 1fr;
    gap: 1rem;
    min-height: 600px;
  }
  @media (max-width: 1024px) {
    .workspace {
      grid-template-columns: 1fr;
    }
  }

  /* ── Panel ───────────────────────────────────────────────────── */
  .panel {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }
  .panel-head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.875rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--color-text);
    }
  .panel-head :global(svg) {
    color: var(--color-muted);
  }
  .panel-head-badge {
    margin-left: auto;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.2rem 0.625rem;
    border-radius: 1rem;
  }
  .panel-section {
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
  }
  .panel-section--flex {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .panel-section--history {
    max-height: 200px;
    overflow-y: auto;
  }
  .panel-foot {
    display: flex;
    justify-content: flex-end;
    gap: 0.625rem;
    padding: 0.875rem 1.25rem;
    border-top: 1px solid var(--color-border);
    margin-top: auto;
  }

  /* ── Buttons ─────────────────────────────────────────────────── */
  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
  }
  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35);
  }
  .btn-primary:active:not(:disabled) {
    transform: translateY(0);
  }
  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  .btn-ghost {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-muted);
    border-radius: 0.5rem;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
  }
  .btn-ghost:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
    border-color: var(--color-muted);
  }
  .btn-sm {
    padding: 0.45rem 0.875rem;
    font-size: 0.78rem;
  }
  .btn-copy {
    margin-left: auto;
  }

  /* ── Section Label ───────────────────────────────────────────── */
  .section-label {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.65rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-muted);
    margin-bottom: 0.625rem;
  }
  .section-label :global(svg) {
    opacity: 0.7;
  }

  /* ── Presets ─────────────────────────────────────────────────── */
  .presets-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .preset-category {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }
  .preset-cat-label {
    font-size: 0.62rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-muted);
    opacity: 0.8;
  }
  .preset-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }
  .preset-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.35rem 0.625rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-text);
    cursor: pointer;
    font-family: inherit;
    transition: all 0.12s;
  }
  .preset-chip:hover {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.04);
  }
  .preset-method {
    font-size: 0.58rem;
    font-weight: 800;
    padding: 0.1rem 0.3rem;
    border-radius: 0.25rem;
  }
  .preset-label {
    color: var(--color-muted);
  }
  .preset-chip:hover .preset-label {
    color: var(--color-text);
  }
  .method-get    { background: rgba(22, 163, 74, 0.12);  color: #16a34a; }
  .method-post   { background: rgba(37, 99, 235, 0.12);  color: #2563eb; }
  .method-patch  { background: rgba(245, 158, 11, 0.12); color: #d97706; }
  .method-delete { background: rgba(220, 38, 38, 0.12);  color: #dc2626; }

  /* ── URL Row ─────────────────────────────────────────────────── */
  .url-row {
    display: flex;
    gap: 0.5rem;
  }
  .method-select {
    padding: 0.55rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-bg);
    font-size: 0.78rem;
    font-weight: 800;
    cursor: pointer;
    font-family: inherit;
    min-width: 90px;
    appearance: none;
    text-align: center;
    color: var(--color-text);
    outline: none;
    transition: all 0.15s;
  }
  .method-select:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  .method-select.method-get    { border-color: rgba(22, 163, 74, 0.4);  color: #16a34a; }
  .method-select.method-post   { border-color: rgba(37, 99, 235, 0.4);  color: #2563eb; }
  .method-select.method-patch  { border-color: rgba(245, 158, 11, 0.4); color: #d97706; }
  .method-select.method-delete { border-color: rgba(220, 38, 38, 0.4);  color: #dc2626; }

  .endpoint-input {
    flex: 1;
    padding: 0.55rem 0.75rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    color: var(--color-text);
    font-size: 0.8rem;
    font-family: 'SF Mono', Monaco, monospace;
    outline: none;
    transition: all 0.15s;
  }
  .endpoint-input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  .endpoint-input::placeholder {
    color: var(--color-muted);
    opacity: 0.5;
  }

  /* ── Auth Input ──────────────────────────────────────────────── */
  .auth-input {
    width: 100%;
    padding: 0.55rem 0.75rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    color: var(--color-muted);
    font-size: 0.75rem;
    font-family: 'SF Mono', Monaco, monospace;
    outline: none;
    transition: all 0.15s;
    box-sizing: border-box;
  }
  .auth-input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  .auth-input.auth-set {
    border-color: rgba(22, 163, 74, 0.35);
    color: var(--color-text);
    background: rgba(22, 163, 74, 0.02);
  }

  /* ── Advanced Toggle ─────────────────────────────────────────── */
  .advanced-toggle {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.625rem 1.25rem;
    background: none;
    border: none;
    border-bottom: 1px solid var(--color-border);
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--color-muted);
    cursor: pointer;
    font-family: inherit;
    transition: color 0.15s;
    width: 100%;
    text-align: left;
  }
  .advanced-toggle:hover {
    color: var(--color-text);
  }

  /* ── Code Textarea ───────────────────────────────────────────── */
  .code-textarea {
    flex: 1;
    width: 100%;
    min-height: 160px;
    padding: 0.875rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    color: var(--color-text);
    font-size: 0.78rem;
    font-family: 'SF Mono', Monaco, monospace;
    resize: none;
    outline: none;
    line-height: 1.6;
    transition: all 0.15s;
  }
  .code-textarea:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  .code-textarea::placeholder {
    color: var(--color-muted);
    opacity: 0.4;
  }
  .code-textarea--sm {
    min-height: 80px;
  }

  /* ── History ──────────────────────────────────────────────────── */
  .history-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .history-item {
    display: grid;
    grid-template-columns: 50px 1fr 50px 60px 70px;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.625rem;
    font-size: 0.72rem;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    transition: all 0.12s;
    border: none;
    background: none;
    width: 100%;
    color: inherit;
  }
  .history-item:hover {
    background: var(--color-surface-hover);
    border-radius: 0.375rem;
  }
  .history-method {
    font-size: 0.6rem;
    font-weight: 800;
    padding: 0.1rem 0.3rem;
    border-radius: 0.25rem;
    text-align: center;
  }
  .history-endpoint {
    color: var(--color-text);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: 'SF Mono', Monaco, monospace;
  }
  .history-status {
    font-weight: 700;
    text-align: center;
    border-radius: 0.25rem;
    padding: 0.1rem 0;
  }
  .history-time {
    color: var(--color-muted);
    text-align: right;
  }
  .history-rel {
    color: var(--color-muted);
    opacity: 0.6;
    text-align: right;
    font-size: 0.65rem;
  }
  .status-ok       { background: rgba(22, 163, 74, 0.1);  color: #16a34a; }
  .status-redirect { background: rgba(37, 99, 235, 0.1);  color: #2563eb; }
  .status-client   { background: rgba(245, 158, 11, 0.1); color: #d97706; }
  .status-server   { background: rgba(220, 38, 38, 0.1);  color: #dc2626; }

  /* ── Response States ─────────────────────────────────────────── */
  .res-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.875rem;
    padding: 3rem 2rem;
    text-align: center;
  }
  .res-state-icon {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: rgba(59, 130, 246, 0.08);
    color: #3b82f6;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .res-state-icon--muted {
    background: var(--color-bg);
    color: var(--color-muted);
  }
  .res-state--error .res-state-icon {
    background: rgba(220, 38, 38, 0.08);
    color: #dc2626;
  }
  .res-state--loading .res-state-icon {
    background: none;
    width: auto;
    height: auto;
  }
  .res-state-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-text);
  }
  .res-state p {
    font-size: 0.82rem;
    color: var(--color-muted);
    margin: 0;
    max-width: 280px;
    line-height: 1.5;
  }
  .res-state-hint {
    font-size: 0.75rem;
    opacity: 0.7;
  }
  .res-state--error p {
    color: #dc2626;
    opacity: 0.8;
  }

  .loading-ring {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 3px solid var(--color-border);
    border-top-color: #3b82f6;
    animation: spin 0.7s linear infinite;
  }

  /* ── Response Meta Bar ───────────────────────────────────────── */
  .res-meta-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    padding: 0.75rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }
  .res-meta-group {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    flex-wrap: wrap;
  }
  .res-meta-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.78rem;
    font-weight: 700;
    padding: 0.3rem 0.75rem;
    border-radius: 0.375rem;
  }
  .res-meta-item {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.72rem;
    color: var(--color-muted);
  }
  .res-meta-item :global(svg) {
    opacity: 0.6;
  }

  /* ── Response Tabs ───────────────────────────────────────────── */
  .res-tabs {
    display: flex;
    border-bottom: 1px solid var(--color-border);
    padding: 0 1.25rem;
    flex-shrink: 0;
    gap: 0;
  }
  .res-tab {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.75rem 1rem;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--color-muted);
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
  }
  .res-tab:hover {
    color: var(--color-text);
  }
  .res-tab--active {
    color: #3b82f6;
    border-bottom-color: #3b82f6;
  }
  .tab-badge {
    font-size: 0.6rem;
    padding: 0.1rem 0.4rem;
    background: var(--color-bg);
    border-radius: 1rem;
    color: var(--color-muted);
    font-weight: 700;
  }

  /* ── Response Content ────────────────────────────────────────── */
  .res-content {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }
  .res-body {
    margin: 0;
    padding: 1.25rem;
    font-family: 'SF Mono', Monaco, monospace;
    font-size: 0.78rem;
    line-height: 1.65;
    color: var(--color-text);
    white-space: pre-wrap;
    word-break: break-all;
  }

  .res-headers {
    padding: 0.5rem 0;
  }
  .hdr-row {
    display: grid;
    grid-template-columns: 180px 1fr;
    gap: 1rem;
    padding: 0.625rem 1.25rem;
    border-bottom: 1px solid var(--color-border-light, var(--color-border));
    font-size: 0.75rem;
  }
  .hdr-row:last-child {
    border-bottom: none;
  }
  .hdr-key {
    font-weight: 700;
    color: #2563eb;
    font-family: 'SF Mono', Monaco, monospace;
    font-size: 0.72rem;
  }
  .hdr-val {
    color: var(--color-muted);
    font-family: 'SF Mono', Monaco, monospace;
    word-break: break-all;
  }

  .res-info {
    padding: 0.5rem 0;
  }
  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
    padding: 0.75rem 1.25rem;
    border-bottom: 1px solid var(--color-border-light, var(--color-border));
    font-size: 0.82rem;
  }
  .info-row:last-child {
    border-bottom: none;
  }
  .info-label {
    color: var(--color-muted);
    font-weight: 600;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .info-value {
    color: var(--color-text);
    font-weight: 700;
    text-align: right;
    word-break: break-all;
    font-family: 'SF Mono', Monaco, monospace;
    font-size: 0.75rem;
  }

  /* ── Animations ──────────────────────────────────────────────── */
  :global(.spin) {
    animation: spin 0.7s linear infinite;
    display: inline-block;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* ── Scrollbar ───────────────────────────────────────────────── */
  .panel::-webkit-scrollbar,
  .res-content::-webkit-scrollbar {
    width: 6px;
  }
  .panel::-webkit-scrollbar-track,
  .res-content::-webkit-scrollbar-track {
    background: transparent;
  }
  .panel::-webkit-scrollbar-thumb,
  .res-content::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 3px;
  }
  .panel::-webkit-scrollbar-thumb:hover,
  .res-content::-webkit-scrollbar-thumb:hover {
    background: var(--color-muted);
    opacity: 0.5;
  }

  /* ── Responsive ──────────────────────────────────────────────── */
  @media (max-width: 768px) {
    .pg-header {
      flex-direction: column;
      align-items: flex-start;
    }
    .key-banner {
      flex-direction: column;
      align-items: stretch;
    }
    .key-banner-actions {
      justify-content: space-between;
    }
    .workspace {
      min-height: auto;
    }
    .history-item {
      grid-template-columns: 50px 1fr 50px;
    }
    .history-time,
    .history-rel {
      display: none;
    }
    .hdr-row {
      grid-template-columns: 1fr;
      gap: 0.25rem;
    }
    .res-meta-bar {
      flex-direction: column;
      align-items: stretch;
    }
    .btn-copy {
      margin-left: 0;
      width: 100%;
      justify-content: center;
    }
  }
</style>