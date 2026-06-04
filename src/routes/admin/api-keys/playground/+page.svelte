<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';
  import {
    Copy, Play, RotateCcw, CheckCircle, XCircle, Clock,
    Key, AlertTriangle, Plus, Trash2, Loader2, FlaskConical,
    ShieldOff
  } from 'lucide-svelte';

  let { data, form: formResult }: { data: PageData; form: ActionData } = $props();

  // ── Test key state ────────────────────────────────────────────
  // The raw key is only available immediately after creation via form result
  let testKeyRaw    = $state<string | null>(null);
  let testKeyId     = $state<string | null>(null);
  let testKeyName   = $state<string | null>(null);
  let creatingKey   = $state(false);
  let revokingKey   = $state(false);

  // When a test key is created, grab the raw key from the form result
  $effect(() => {
    if (formResult?.success && formResult?.rawKey) {
      testKeyRaw  = formResult.rawKey;
      testKeyId   = formResult.keyId;
      testKeyName = formResult.keyName;
      // Auto-use this key for requests
      authHeader  = `Bearer ${formResult.rawKey}`;
    }
    if (formResult?.success && !formResult?.rawKey && testKeyId) {
      // Revoke succeeded
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

  // ── Presets ───────────────────────────────────────────────────
  const PRESETS = [
    { label: 'List Users',          method: 'GET',  path: '/api/admin/users'              },
    { label: 'Get User by ID',      method: 'GET',  path: '/api/admin/users/__ID__'       },
    { label: 'List Exams',          method: 'GET',  path: '/api/admin/exams'              },
    { label: 'Exam Reports',        method: 'GET',  path: '/api/admin/reports/exams'      },
    { label: 'Student Performance', method: 'GET',  path: '/api/admin/reports/students'   },
    { label: 'Violations',          method: 'GET',  path: '/api/admin/violations'         },
    { label: 'Auth check',          method: 'GET',  path: '/api/auth'                     },
  ] as const;

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
</script>

<svelte:head><title>API Playground — Admin</title></svelte:head>

<div class="page">
  <div class="page-header">
    <div class="header-left">
      <div class="header-icon"><FlaskConical size={20} /></div>
      <div>
        <h1>API Playground</h1>
        <p class="subtitle">Test API endpoints against live data</p>
      </div>
    </div>
    <a href="/admin/api-keys" class="back-link">← API Keys</a>
  </div>

  <!-- ── Test key banner ────────────────────────────────────────── -->
  {#if testKeyRaw}
    <div class="test-key-banner test-key-banner--active">
      <div class="test-key-info">
        <CheckCircle size={15} />
        <div>
          <strong>{testKeyName}</strong>
          <span class="test-key-note">Active · expires in 1 hour · read-only scopes</span>
        </div>
      </div>
      <div class="test-key-actions">
        <code class="test-key-preview">{testKeyRaw.slice(0, 20)}…</code>
        <form method="POST" action="?/revokeKey" use:enhance={() => {
          revokingKey = true;
          return async ({ update }) => { revokingKey = false; await update(); };
        }}>
          <input type="hidden" name="id" value={testKeyId} />
          <button type="submit" class="revoke-btn" disabled={revokingKey}>
            {#if revokingKey}<Loader2 size={13} class="spinning" />{:else}<ShieldOff size={13} />{/if}
            Revoke
          </button>
        </form>
      </div>
    </div>
  {:else}
    <div class="test-key-banner">
      <div class="test-key-info">
        <Key size={15} />
        <div>
          <strong>No test key active</strong>
          <span class="test-key-note">Create a temporary read-only key to start testing</span>
        </div>
      </div>
      <form method="POST" action="?/createTestKey" use:enhance={() => {
        creatingKey = true;
        return async ({ update }) => { creatingKey = false; await update(); };
      }}>
        <button type="submit" class="create-key-btn" disabled={creatingKey}>
          {#if creatingKey}<Loader2 size={13} class="spinning" />{:else}<Plus size={13} />{/if}
          Create Test Key
        </button>
      </form>
    </div>
  {/if}

  <div class="workspace">

    <!-- ── Request panel ─────────────────────────────────────── -->
    <div class="panel request-panel">

      <!-- Presets -->
      <div class="section">
        <div class="section-label">Presets</div>
        <div class="presets">
          {#each PRESETS as p}
            <button class="preset-btn" type="button" onclick={() => applyPreset(p)}>
              <span class="method-pill method-{p.method.toLowerCase()}">{p.method}</span>
              {p.label}
            </button>
          {/each}
        </div>
      </div>

      <!-- Method + endpoint -->
      <div class="section">
        <div class="section-label">Request</div>
        <div class="url-row">
          <select
            bind:value={method}
            class="method-select method-{method.toLowerCase()}"
          >
            <option>GET</option>
            <option>POST</option>
            <option>PATCH</option>
            <option>DELETE</option>
          </select>
          <input
            type="text"
            bind:value={endpoint}
            placeholder="/api/admin/…"
            class="endpoint-input"
          />
        </div>
      </div>

      <!-- Auth header -->
      <div class="section">
        <div class="section-label">Authorization</div>
        <input
          type="text"
          bind:value={authHeader}
          placeholder="Bearer sk_…  (auto-filled when test key is created)"
          class="auth-input"
          class:auth-input--set={!!authHeader}
        />
      </div>

      <!-- Body -->
      {#if ['POST','PATCH'].includes(method)}
        <div class="section section-flex">
          <div class="section-label">Request Body</div>
          <textarea
            bind:value={bodyText}
            placeholder={'{\n  "key": "value"\n}'}
            class="code-area"
            spellcheck="false"
          ></textarea>
        </div>
      {/if}

      <!-- Actions -->
      <div class="action-row">
        <button class="reset-btn" type="button" onclick={reset} title="Clear">
          <RotateCcw size={14} />
        </button>
        <button
          class="run-btn"
          type="button"
          onclick={run}
          disabled={isLoading || !authHeader.trim()}
        >
          {#if isLoading}
            <Loader2 size={14} class="spinning" /> Sending…
          {:else}
            <Play size={14} /> Send Request
          {/if}
        </button>
      </div>
    </div>

    <!-- ── Response panel ────────────────────────────────────── -->
    <div class="panel response-panel">

      {#if reqError}
        <div class="res-error">
          <XCircle size={15} />
          <div>
            <strong>Request failed</strong>
            <p>{reqError}</p>
          </div>
        </div>

      {:else if isLoading}
        <div class="res-empty">
          <div class="loading-ring"></div>
          <p>Waiting for response…</p>
        </div>

      {:else if !response}
        <div class="res-empty">
          <Play size={28} opacity=".15" />
          <p>Hit <strong>Send Request</strong> to see the response.</p>
          {#if !authHeader}
            <p class="res-empty-hint">Create a test key above to get started.</p>
          {/if}
        </div>

      {:else}
        <!-- Status bar -->
        <div class="status-bar">
          <span class="status-code status-{statusClass(response.status)}">
            {#if response.status < 300}<CheckCircle size={12} />{:else}<XCircle size={12} />{/if}
            {response.status} {response.statusText}
          </span>
          <span class="res-meta"><Clock size={11} /> {response.duration}ms</span>
          <span class="res-meta">{formatSize(response.size)}</span>
          <button class="copy-btn" type="button" onclick={copyResponse}>
            {#if copied}<CheckCircle size={12} /> Copied{:else}<Copy size={12} /> Copy{/if}
          </button>
        </div>

        <!-- Tabs -->
        <div class="res-tabs">
          {#each ['body','headers','info'] as t}
            <button
              class="res-tab"
              class:res-tab--active={responseTab === t}
              type="button"
              onclick={() => responseTab = t as typeof responseTab}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {#if t === 'headers'}<span class="tab-count">{Object.keys(response.headers).length}</span>{/if}
            </button>
          {/each}
        </div>

        {#if responseTab === 'body'}
          <pre class="res-body">{formatJson(response.body)}</pre>

        {:else if responseTab === 'headers'}
          <div class="headers-list">
            {#each Object.entries(response.headers) as [k, v]}
              <div class="hdr-row">
                <span class="hdr-key">{k}</span>
                <span class="hdr-val">{v}</span>
              </div>
            {/each}
          </div>

        {:else}
          <div class="info-list">
            {#each [
              ['Status',   `${response.status} ${response.statusText}`],
              ['Duration', `${response.duration}ms`],
              ['Size',     formatSize(response.size)],
              ['Method',   method],
              ['Endpoint', endpoint],
            ] as [label, value]}
              <div class="info-row">
                <span>{label}</span>
                <span>{value}</span>
              </div>
            {/each}
          </div>
        {/if}
      {/if}

    </div>
  </div>
</div>

<style>
  .page { display: flex; flex-direction: column; gap: 1.25rem; max-width: 1200px; }

  .page-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
  .header-left { display: flex; align-items: center; gap: .875rem; }
  .header-icon { width: 44px; height: 44px; border-radius: 12px; background: rgba(59,130,246,.12); color: #3b82f6; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  h1 { font-size: 1.25rem; font-weight: 800; color: var(--color-text); margin: 0; }
  .subtitle { font-size: .8rem; color: var(--color-muted); margin: 0; }
  .back-link { font-size: .8rem; color: var(--color-muted); text-decoration: none; }
  .back-link:hover { color: var(--color-text); }

  /* Test key banner */
  .test-key-banner {
    display: flex; align-items: center; justify-content: space-between;
    gap: 1rem; flex-wrap: wrap;
    padding: .875rem 1.25rem;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: .875rem;
  }
  .test-key-banner--active {
    border-color: rgba(22,163,74,.3);
    background: rgba(22,163,74,.04);
  }
  .test-key-info { display: flex; align-items: center; gap: .625rem; }
  .test-key-info svg { flex-shrink: 0; color: #16a34a; }
  .test-key-info strong { display: block; font-size: .875rem; font-weight: 700; color: var(--color-text); }
  .test-key-note { font-size: .75rem; color: var(--color-muted); }
  .test-key-actions { display: flex; align-items: center; gap: .625rem; }
  .test-key-preview { font-size: .72rem; font-family: monospace; background: var(--color-bg); padding: .25rem .5rem; border-radius: .375rem; color: var(--color-muted); }

  .create-key-btn {
    display: inline-flex; align-items: center; gap: .375rem;
    padding: .5rem 1rem; background: #3b82f6; color: white;
    border: none; border-radius: .5rem; font-size: .8rem; font-weight: 600;
    cursor: pointer; font-family: inherit; transition: background .15s;
  }
  .create-key-btn:hover:not(:disabled) { background: #2563eb; }
  .create-key-btn:disabled { opacity: .6; cursor: not-allowed; }

  .revoke-btn {
    display: inline-flex; align-items: center; gap: .375rem;
    padding: .4rem .875rem;
    background: rgba(220,38,38,.08); border: 1px solid rgba(220,38,38,.25);
    color: #dc2626; border-radius: .5rem; font-size: .78rem; font-weight: 600;
    cursor: pointer; font-family: inherit; transition: all .15s;
  }
  .revoke-btn:hover:not(:disabled) { background: rgba(220,38,38,.15); }
  .revoke-btn:disabled { opacity: .6; cursor: not-allowed; }

  /* Workspace */
  .workspace { display: grid; grid-template-columns: 380px 1fr; gap: 1rem; min-height: 540px; }
  @media (max-width: 900px) { .workspace { grid-template-columns: 1fr; } }

  .panel {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: .875rem; display: flex; flex-direction: column; overflow: hidden;
  }

  /* Sections */
  .section { padding: .875rem 1rem; border-bottom: 1px solid var(--color-border); }
  .section-flex { flex: 1; display: flex; flex-direction: column; border-bottom: none; }
  .section-label { font-size: .65rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--color-muted); margin-bottom: .5rem; }

  /* Presets */
  .presets { display: flex; flex-wrap: wrap; gap: .375rem; }
  .preset-btn {
    display: inline-flex; align-items: center; gap: .375rem;
    padding: .3rem .625rem; background: var(--color-bg);
    border: 1px solid var(--color-border); border-radius: .375rem;
    font-size: .72rem; font-weight: 500; color: var(--color-muted);
    cursor: pointer; font-family: inherit; transition: all .12s;
  }
  .preset-btn:hover { border-color: #3b82f6; color: var(--color-text); }
  .method-pill {
    font-size: .58rem; font-weight: 800; padding: .1rem .35rem; border-radius: .25rem;
  }
  .method-get    { background: rgba(22,163,74,.1);  color: #16a34a; }
  .method-post   { background: rgba(37,99,235,.1);  color: #2563eb; }
  .method-patch  { background: rgba(245,158,11,.1); color: #d97706; }
  .method-delete { background: rgba(220,38,38,.1);  color: #dc2626; }

  /* URL row */
  .url-row { display: flex; gap: .5rem; }
  .method-select {
    padding: .55rem .75rem; border: 1px solid var(--color-border);
    border-radius: .5rem; background: var(--color-bg); font-size: .8rem;
    font-weight: 700; cursor: pointer; font-family: inherit; min-width: 88px;
    appearance: none; text-align: center; color: var(--color-text);
  }
  .method-select.method-get    { border-color: rgba(22,163,74,.4);  color: #16a34a; }
  .method-select.method-post   { border-color: rgba(37,99,235,.4);  color: #2563eb; }
  .method-select.method-patch  { border-color: rgba(245,158,11,.4); color: #d97706; }
  .method-select.method-delete { border-color: rgba(220,38,38,.4);  color: #dc2626; }

  .endpoint-input {
    flex: 1; padding: .55rem .75rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: .5rem; color: var(--color-text); font-size: .8rem;
    font-family: monospace; outline: none; transition: border-color .15s;
  }
  .endpoint-input:focus { border-color: #3b82f6; }

  /* Auth input */
  .auth-input {
    width: 100%; padding: .55rem .75rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: .5rem; color: var(--color-muted); font-size: .75rem;
    font-family: monospace; outline: none; transition: border-color .15s;
    box-sizing: border-box;
  }
  .auth-input--set { border-color: rgba(22,163,74,.4); color: var(--color-text); }
  .auth-input:focus { border-color: #3b82f6; }

  /* Code area */
  .code-area {
    flex: 1; width: 100%; min-height: 140px;
    padding: .75rem 1rem; background: var(--color-bg);
    border: none; outline: none; color: var(--color-text);
    font-size: .78rem; font-family: monospace; resize: none; line-height: 1.6;
  }

  /* Action row */
  .action-row {
    display: flex; gap: .5rem; padding: .75rem 1rem;
    border-top: 1px solid var(--color-border); flex-shrink: 0;
  }
  .reset-btn {
    width: 36px; height: 36px; border-radius: .5rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    color: var(--color-muted); cursor: pointer;
    display: flex; align-items: center; justify-content: center; transition: all .15s;
  }
  .reset-btn:hover { border-color: #dc2626; color: #dc2626; }
  .run-btn {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: .5rem;
    padding: .625rem 1rem; background: #2563eb; color: white;
    border: none; border-radius: .5rem; font-size: .875rem; font-weight: 600;
    cursor: pointer; font-family: inherit; transition: all .15s;
  }
  .run-btn:hover:not(:disabled) { background: #1d4ed8; transform: translateY(-1px); }
  .run-btn:disabled { opacity: .5; cursor: not-allowed; transform: none; }

  /* Response panel */
  .res-empty {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: .75rem;
    color: var(--color-muted); padding: 2rem; text-align: center; font-size: .825rem;
  }
  .res-empty-hint { font-size: .75rem; color: var(--color-muted); opacity: .7; }
  .res-error {
    display: flex; align-items: flex-start; gap: .75rem;
    padding: 1rem; margin: 1rem;
    background: rgba(220,38,38,.06); border: 1px solid rgba(220,38,38,.2);
    border-radius: .625rem; color: #dc2626; font-size: .825rem;
  }
  .res-error strong { display: block; font-weight: 700; margin-bottom: .2rem; }
  .res-error p { margin: 0; opacity: .8; }

  .loading-ring {
    width: 28px; height: 28px; border-radius: 50%;
    border: 3px solid var(--color-border); border-top-color: #3b82f6;
    animation: spin .7s linear infinite;
  }

  /* Status bar */
  .status-bar {
    display: flex; align-items: center; gap: .75rem; flex-wrap: wrap;
    padding: .75rem 1rem; border-bottom: 1px solid var(--color-border); flex-shrink: 0;
  }
  .status-code {
    display: inline-flex; align-items: center; gap: .375rem;
    font-size: .8rem; font-weight: 700; padding: .25rem .625rem; border-radius: .375rem;
  }
  .status-ok       { background: rgba(22,163,74,.1);  color: #16a34a; }
  .status-redirect { background: rgba(37,99,235,.1);  color: #2563eb; }
  .status-client   { background: rgba(245,158,11,.1); color: #d97706; }
  .status-server   { background: rgba(220,38,38,.1);  color: #dc2626; }
  .res-meta { display: flex; align-items: center; gap: .3rem; font-size: .72rem; color: var(--color-muted); }
  .copy-btn {
    display: flex; align-items: center; gap: .3rem; margin-left: auto;
    padding: .3rem .625rem; background: var(--color-bg);
    border: 1px solid var(--color-border); border-radius: .375rem;
    font-size: .72rem; font-weight: 600; color: var(--color-muted);
    cursor: pointer; font-family: inherit; transition: all .15s;
  }
  .copy-btn:hover { border-color: #3b82f6; color: #3b82f6; }

  /* Tabs */
  .res-tabs {
    display: flex; border-bottom: 1px solid var(--color-border);
    padding: 0 1rem; flex-shrink: 0;
  }
  .res-tab {
    display: flex; align-items: center; gap: .375rem;
    padding: .6rem .875rem; font-size: .75rem; font-weight: 600;
    color: var(--color-muted); background: none; border: none;
    border-bottom: 2px solid transparent; cursor: pointer;
    font-family: inherit; transition: all .15s; margin-bottom: -1px;
  }
  .res-tab:hover { color: var(--color-text); }
  .res-tab--active { color: #3b82f6; border-bottom-color: #3b82f6; }
  .tab-count {
    font-size: .6rem; padding: .1rem .35rem;
    background: var(--color-border); border-radius: 999px; color: var(--color-muted);
  }

  .res-body {
    flex: 1; padding: 1rem; margin: 0;
    font-family: monospace; font-size: .75rem; line-height: 1.65;
    color: var(--color-text); white-space: pre-wrap; word-break: break-all;
    overflow-y: auto;
  }

  .headers-list { flex: 1; overflow-y: auto; }
  .hdr-row { display: grid; grid-template-columns: 200px 1fr; gap: 1rem; padding: .5rem 1rem; border-bottom: 1px solid var(--color-border); font-size: .75rem; }
  .hdr-row:last-child { border-bottom: none; }
  .hdr-key { font-weight: 600; color: #2563eb; font-family: monospace; }
  .hdr-val { color: var(--color-muted); font-family: monospace; word-break: break-all; }

  .info-list { flex: 1; overflow-y: auto; }
  .info-row { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; padding: .625rem 1rem; border-bottom: 1px solid var(--color-border); font-size: .8rem; }
  .info-row:last-child { border-bottom: none; }
  .info-row span:first-child { color: var(--color-muted); font-weight: 500; flex-shrink: 0; }
  .info-row span:last-child  { color: var(--color-text); font-weight: 600; text-align: right; word-break: break-all; font-family: monospace; font-size: .75rem; }

  :global(.spinning) { animation: spin .7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>