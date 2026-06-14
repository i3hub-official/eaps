<!-- src/routes/+error.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { Home, ArrowLeft, SearchX, ShieldAlert, Bug, Frown } from '@lucide/svelte';
  import { onMount } from 'svelte';

  const messagePools = {
    404: {
      main: [
        "Looks like this page pulled a Houdini and vanished into thin air. Maybe it never existed, or maybe it's just playing hide and seek.",
        "This page is like your ex — gone, not coming back, and you're better off without it.",
        "We searched high and low, under the couch, behind the server rack... nowhere to be found.",
        "This URL leads to a dimension where pages don't exist. Try another portal.",
        "Oops! This page must have graduated and left the university. No forwarding address.",
        "You know that feeling when you walk into a room and forget why? This page had the same problem.",
        "404: Page not found. Have you tried turning the internet off and on again?",
        "This page is currently on sabbatical. Please check back in 2050.",
        "We asked the server about this page. It just shrugged and said 'IDK bro'.",
        "This page is like a ghost — people claim they've seen it, but there's no proof.",
      ],
      footer: [
        "Don't worry, even GPS gets lost sometimes.",
        "Maybe try shouting the page name three times into your screen.",
        "Have you considered that the page might be avoiding you?",
        "Pro tip: pages can't hide forever. Except this one, apparently.",
        "Even Columbus took a wrong turn once in a while.",
      ]
    },
    403: {
      main: [
        "Nope, not happening! This area is more restricted than the dean's office. You don't have the magic key for this one.",
        "This page is VIP-only, and your name is not on the list. Sorry, not sorry.",
        "Access denied! It's like trying to enter a final year project defense as a fresher. Bold, but no.",
        "You shall not pass! — Gandalf (and also this server)",
        "This page requires clearance level: 'Professor Emeritus'. You currently have: 'Student'.",
        "We'd let you in, but then we'd have to let EVERYONE in. And we can't have that kind of chaos.",
        "This is a restricted zone. If you proceed, campus security WILL be called. And they don't play.",
        "Your permissions are like your CGPA — not high enough for this level.",
        "Nice try, but this page is behind a firewall thicker than the school library walls.",
        "Unauthorized access attempt logged. The IT department is judging you right now.",
      ],
      footer: [
        "If you think this is a mistake, contact the admin. Or bribe them with jollof.",
        "Have you tried being more... authorized?",
        "Maybe ask your HOD for a permission slip?",
        "The password is definitely not 'password123'. We checked.",
        "Try again after you've completed your clearance. Yes, all of it.",
      ]
    },
    500: {
      main: [
        "Oops! Our servers are having a bit of a meltdown. It's not you, it's us. Probably a rogue semicolon somewhere.",
        "Something exploded on our end. Don't panic, we have a guy. He's currently crying into his keyboard.",
        "Error 500: Our code did a backflip and landed on its face. We're applying ice packs now.",
        "The server encountered an internal error, which is tech speak for 'we have no idea what happened'.",
        "Our backend just had an existential crisis. It's questioning its purpose in life.",
        "Houston, we have a problem. And by Houston, we mean our server room. And by problem, we mean fire.",
        "A wild bug appeared! Our developers used 'fix bug'... it's not very effective.",
        "The hamster powering our server just fell off the wheel. We're getting a new hamster.",
        "Our database took a coffee break and forgot to come back. We're negotiating its return.",
        "This error is so rare, we might frame it. Thanks for being part of history!",
      ],
      footer: [
        "Our developers have been notified. They're probably crying already.",
        "Refresh if you dare. No promises though.",
        "We're fixing this faster than you can say 'infrastructure as code'.",
        "This is fine. (It's not fine. Send help.)",
        "Bug report submitted. Someone will look at it... eventually.",
      ]
    }
  };

  function getTimeBlock() {
    const now = Date.now();
    const sixHours = 6 * 60 * 60 * 1000;
    return Math.floor(now / sixHours);
  }

  function seededRandom(seed: number) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function getMessageIndex(poolLength: number, status: number, type: 'main' | 'footer') {
    const timeBlock = getTimeBlock();
    const seed = timeBlock * 1000 + status * 10 + (type === 'footer' ? 1 : 0);
    return Math.floor(seededRandom(seed) * poolLength);
  }

  let mainMessage = $state('');
  let footerMessage = $state('');
  let currentStatus = $state(500);
  let mounted = $state(false);

  onMount(() => {
    const status = $page.status;
    currentStatus = status;

    const statusKey = status === 404 ? 404 : status === 403 ? 403 : 500;
    const pool = messagePools[statusKey];

    const mainIdx = getMessageIndex(pool.main.length, statusKey, 'main');
    const footerIdx = getMessageIndex(pool.footer.length, statusKey, 'footer');

    mainMessage = pool.main[mainIdx];
    footerMessage = pool.footer[footerIdx];

    const storageKey = `error-msg-${statusKey}`;
    const stored = localStorage.getItem(storageKey);
    const currentBlock = getTimeBlock();

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.block === currentBlock) {
          mainMessage = parsed.main;
          footerMessage = parsed.footer;
        }
      } catch { /* invalid JSON, fall through */ }
    }

    localStorage.setItem(storageKey, JSON.stringify({
      block: currentBlock,
      main: mainMessage,
      footer: footerMessage
    }));

    // Trigger entrance animations after a tiny delay
    requestAnimationFrame(() => {
      mounted = true;
    });
  });
</script>

<svelte:head>
  <title>{$page.status} — MOUAU eTest</title>
</svelte:head>

<div class="error-page">
  <!-- Floating background particles -->
  <div class="particles" aria-hidden="true">
    {#each Array(12) as _, i}
      <div class="particle" style="--i: {i}"></div>
    {/each}
  </div>

  <div class="error-card" class:mounted>
    <!-- Illustration -->
    <div class="illustration">
      {#if currentStatus === 404}
        <svg viewBox="0 0 200 180" class="error-svg" aria-hidden="true">
          <ellipse cx="100" cy="165" rx="80" ry="12" fill="var(--color-border)" opacity="0.5"/>
          <rect x="95" y="40" width="10" height="80" rx="2" fill="#92400e"/>
          <rect x="75" y="35" width="50" height="22" rx="3" fill="#f59e0b" stroke="#92400e" stroke-width="2"/>
          <text x="100" y="50" text-anchor="middle" font-size="10" font-weight="bold" fill="#92400e">404</text>
          <rect x="80" y="62" width="40" height="18" rx="2" fill="#fbbf24" stroke="#92400e" stroke-width="1.5"/>
          <text x="100" y="74" text-anchor="middle" font-size="8" fill="#92400e">LOST?</text>
          <!-- Character body with walk animation -->
          <g class="walker">
            <circle cx="60" cy="115" r="10" fill="var(--color-text)"/>
            <line x1="60" y1="125" x2="60" y2="155" stroke="var(--color-text)" stroke-width="3" stroke-linecap="round"/>
            <line x1="45" y1="140" x2="75" y2="140" stroke="var(--color-text)" stroke-width="3" stroke-linecap="round"/>
            <line x1="60" y1="155" x2="50" y2="170" stroke="var(--color-text)" stroke-width="3" stroke-linecap="round"/>
            <line x1="60" y1="155" x2="70" y2="170" stroke="var(--color-text)" stroke-width="3" stroke-linecap="round"/>
          </g>
          <!-- Bouncing question marks -->
          <text x="35" y="95" font-size="14" fill="var(--color-focus)" font-weight="bold" class="q-mark q1">?</text>
          <text x="85" y="100" font-size="12" fill="var(--color-focus)" font-weight="bold" class="q-mark q2">?</text>
          <text x="120" y="88" font-size="11" fill="var(--color-focus)" font-weight="bold" class="q-mark q3">?</text>
          <!-- Spinning map/note -->
          <g class="spin-note">
            <rect x="130" y="80" width="16" height="20" rx="1" fill="var(--color-surface)" stroke="var(--color-border)" stroke-width="1" transform="rotate(15 138 90)"/>
            <line x1="134" y1="86" x2="142" y2="86" stroke="var(--color-muted)" stroke-width="1"/>
            <line x1="134" y1="90" x2="140" y2="90" stroke="var(--color-muted)" stroke-width="1"/>
            <line x1="134" y1="94" x2="142" y2="94" stroke="var(--color-muted)" stroke-width="1"/>
          </g>
        </svg>

      {:else if currentStatus === 403}
        <svg viewBox="0 0 200 180" class="error-svg" aria-hidden="true">
          <!-- Pulsing door -->
          <rect x="70" y="30" width="60" height="120" rx="2" fill="none" stroke="var(--color-border)" stroke-width="4" class="door-pulse"/>
          <rect x="74" y="34" width="52" height="116" rx="1" fill="var(--color-surface-hover)"/>
          <!-- Animated X cross -->
          <line x1="78" y1="40" x2="122" y2="140" stroke="#ef4444" stroke-width="4" opacity="0.8" class="cross-line"/>
          <line x1="122" y1="40" x2="78" y2="140" stroke="#ef4444" stroke-width="4" opacity="0.8" class="cross-line"/>
          <!-- Bouncer character -->
          <g class="bouncer">
            <circle cx="140" cy="100" r="14" fill="var(--color-text)"/>
            <rect x="132" y="114" width="16" height="28" rx="3" fill="var(--color-text)"/>
            <line x1="125" y1="125" x2="132" y2="130" stroke="var(--color-text)" stroke-width="3" stroke-linecap="round"/>
            <line x1="155" y1="125" x2="148" y2="130" stroke="var(--color-text)" stroke-width="3" stroke-linecap="round"/>
            <!-- Arm gesture -->
            <line x1="135" y1="120" x2="145" y2="120" stroke="var(--color-text)" stroke-width="4" stroke-linecap="round" class="stop-arm"/>
            <line x1="134" y1="96" x2="140" y2="98" stroke="var(--color-text)" stroke-width="2"/>
            <line x1="146" y1="96" x2="140" y2="98" stroke="var(--color-text)" stroke-width="2"/>
          </g>
          <!-- Pulsing shield -->
          <g class="shield-pulse">
            <path d="M40 85 L40 110 Q40 125 55 130 Q70 125 70 110 L70 85 Q55 90 40 85Z" fill="var(--color-focus)" opacity="0.2"/>
            <path d="M40 85 L40 110 Q40 125 55 130 Q70 125 70 110 L70 85 Q55 90 40 85Z" fill="none" stroke="var(--color-focus)" stroke-width="2"/>
            <text x="55" y="112" text-anchor="middle" font-size="10" fill="var(--color-focus)" font-weight="bold">403</text>
          </g>
        </svg>

      {:else}
        <svg viewBox="0 0 200 180" class="error-svg" aria-hidden="true">
          <!-- Shaking screen -->
          <g class="screen-shake">
            <rect x="45" y="30" width="110" height="80" rx="6" fill="var(--color-surface)" stroke="var(--color-border)" stroke-width="3"/>
            <rect x="50" y="35" width="100" height="65" rx="3" fill="#0f172a"/>
            <text x="100" y="55" text-anchor="middle" font-size="8" fill="#ef4444" font-family="monospace">ERROR {currentStatus}</text>
            <line x1="60" y1="65" x2="140" y2="65" stroke="#334155" stroke-width="1"/>
            <line x1="60" y1="72" x2="120" y2="72" stroke="#334155" stroke-width="1"/>
            <line x1="60" y1="79" x2="100" y2="79" stroke="#334155" stroke-width="1"/>
          </g>
          <rect x="85" y="110" width="30" height="8" rx="2" fill="var(--color-border)"/>
          <rect x="70" y="118" width="60" height="6" rx="3" fill="var(--color-border)"/>
          <!-- Bug character with leg wiggle -->
          <g class="bug-body">
            <ellipse cx="155" cy="100" rx="14" ry="10" fill="var(--color-focus)"/>
            <circle cx="150" cy="96" r="2" fill="white"/>
            <circle cx="160" cy="96" r="2" fill="white"/>
            <circle cx="150" cy="96" r="1" fill="var(--color-text)"/>
            <circle cx="160" cy="96" r="1" fill="var(--color-text)"/>
          </g>
          <!-- Wiggling antennae -->
          <line x1="148" y1="92" x2="143" y2="82" stroke="var(--color-focus)" stroke-width="2" stroke-linecap="round" class="antenna-l"/>
          <line x1="162" y1="92" x2="167" y2="82" stroke="var(--color-focus)" stroke-width="2" stroke-linecap="round" class="antenna-r"/>
          <circle cx="143" cy="82" r="2" fill="var(--color-focus)" class="antenna-l"/>
          <circle cx="167" cy="82" r="2" fill="var(--color-focus)" class="antenna-r"/>
          <!-- Wiggling legs -->
          <line x1="145" y1="104" x2="138" y2="110" stroke="var(--color-focus)" stroke-width="2" stroke-linecap="round" class="leg leg-a"/>
          <line x1="165" y1="104" x2="172" y2="110" stroke="var(--color-focus)" stroke-width="2" stroke-linecap="round" class="leg leg-b"/>
          <line x1="148" y1="108" x2="142" y2="115" stroke="var(--color-focus)" stroke-width="2" stroke-linecap="round" class="leg leg-b"/>
          <line x1="162" y1="108" x2="168" y2="115" stroke="var(--color-focus)" stroke-width="2" stroke-linecap="round" class="leg leg-a"/>
          <!-- Smoke puffs -->
          <path d="M55 25 Q60 15 65 20 Q70 10 75 18" fill="none" stroke="#94a3b8" stroke-width="2" opacity="0.6" class="smoke s1"/>
          <path d="M125 22 Q130 12 135 18 Q140 8 145 16" fill="none" stroke="#94a3b8" stroke-width="2" opacity="0.6" class="smoke s2"/>
        </svg>
      {/if}
    </div>

    <!-- Status badge -->
    <div class="status-badge">
      {#if currentStatus === 404}
        <SearchX size={18} />
      {:else if currentStatus === 403}
        <ShieldAlert size={18} />
      {:else}
        <Bug size={18} />
      {/if}
      <span class="status-code">{currentStatus}</span>
    </div>

    <h1>
      {#if currentStatus === 404}
        Page Not Found
      {:else if currentStatus === 403}
        Access Denied
      {:else}
        Something Went Wrong
      {/if}
    </h1>

    <p class="message">{mainMessage}</p>

    <div class="actions">
      <a href="/" class="btn-primary">
        <Home size={16} />
        Go Home
      </a>
      <button onclick={() => history.back()} class="btn-outline" type="button">
        <ArrowLeft size={16} />
        Go Back
      </button>
    </div>

    <div class="fun-note">
      <Frown size={14} />
      <span>{footerMessage}</span>
    </div>
  </div>
</div>

<style>
  /* ── Page layout ──────────────────────────────────────────────── */
  .error-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background: var(--color-bg);
    position: relative;
    overflow: hidden;
  }

  /* ── Floating background particles ───────────────────────────── */
  .particles {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .particle {
    position: absolute;
    width: calc(4px + var(--i) * 2px);
    height: calc(4px + var(--i) * 2px);
    border-radius: 50%;
    background: var(--color-focus);
    opacity: 0.08;
    left: calc(5% + var(--i) * 8%);
    top: calc(10% + (var(--i) * 37% + 13%) % 80%);
    animation: particle-drift calc(6s + var(--i) * 1.1s) ease-in-out infinite alternate;
    animation-delay: calc(var(--i) * -0.7s);
  }

  @keyframes particle-drift {
    0%   { transform: translateY(0)   scale(1);   opacity: 0.06; }
    50%  { transform: translateY(-28px) scale(1.3); opacity: 0.14; }
    100% { transform: translateY(12px)  scale(0.8); opacity: 0.05; }
  }

  /* ── Card entrance ────────────────────────────────────────────── */
  .error-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1.5rem;
    padding: 2.5rem 2rem;
    max-width: 480px;
    width: 100%;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);
    position: relative;

    /* entrance state */
    opacity: 0;
    transform: translateY(32px) scale(0.97);
    transition: opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1),
                transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .error-card.mounted {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  /* Stagger children entrance */
  .error-card > * {
    opacity: 0;
    transform: translateY(16px);
    transition: opacity 0.4s ease, transform 0.4s ease;
  }

  .error-card.mounted > * {
    opacity: 1;
    transform: translateY(0);
  }

  .error-card.mounted > *:nth-child(1) { transition-delay: 0.1s; }
  .error-card.mounted > *:nth-child(2) { transition-delay: 0.2s; }
  .error-card.mounted > *:nth-child(3) { transition-delay: 0.28s; }
  .error-card.mounted > *:nth-child(4) { transition-delay: 0.35s; }
  .error-card.mounted > *:nth-child(5) { transition-delay: 0.42s; }
  .error-card.mounted > *:nth-child(6) { transition-delay: 0.5s; }

  /* ── Illustration float ───────────────────────────────────────── */
  .illustration {
    width: 200px;
    height: 180px;
    margin-bottom: 0.5rem;
    animation: float 4s ease-in-out infinite;
  }

  .error-svg {
    width: 100%;
    height: 100%;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(-8px); }
  }

  /* ── SVG character animations ─────────────────────────────────── */

  /* 404 — walker sway */
  .walker {
    transform-origin: 60px 140px;
    animation: sway 1.6s ease-in-out infinite alternate;
  }

  @keyframes sway {
    from { transform: rotate(-4deg); }
    to   { transform: rotate(4deg); }
  }

  /* 404 — bouncing question marks */
  .q-mark { animation: q-bounce 1.8s ease-in-out infinite; }
  .q1     { animation-delay: 0s; }
  .q2     { animation-delay: 0.3s; }
  .q3     { animation-delay: 0.6s; }

  @keyframes q-bounce {
    0%, 100% { transform: translateY(0);   opacity: 1; }
    50%       { transform: translateY(-6px); opacity: 0.6; }
  }

  /* 404 — spinning note */
  .spin-note {
    transform-origin: 138px 90px;
    animation: spin-slow 4s linear infinite;
  }

  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  /* 403 — pulsing door border */
  .door-pulse {
    animation: door-glow 1.5s ease-in-out infinite alternate;
  }

  @keyframes door-glow {
    from { stroke: var(--color-border); }
    to   { stroke: #ef4444; opacity: 0.7; }
  }

  /* 403 — cross lines draw in */
  .cross-line {
    stroke-dasharray: 120;
    stroke-dashoffset: 120;
    animation: draw-line 0.8s ease forwards;
  }

  .cross-line:nth-child(3) { animation-delay: 0.1s; }
  .cross-line:nth-child(4) { animation-delay: 0.4s; }

  @keyframes draw-line {
    to { stroke-dashoffset: 0; }
  }

  /* 403 — bouncer nod */
  .bouncer {
    transform-origin: 140px 107px;
    animation: nod 1.2s ease-in-out infinite alternate;
  }

  @keyframes nod {
    from { transform: rotate(-3deg); }
    to   { transform: rotate(3deg); }
  }

  /* 403 — stop arm pulse */
  .stop-arm {
    transform-origin: 140px 120px;
    animation: arm-pulse 0.8s ease-in-out infinite alternate;
  }

  @keyframes arm-pulse {
    from { transform: scaleX(1); }
    to   { transform: scaleX(1.15); }
  }

  /* 403 — shield pulse */
  .shield-pulse {
    animation: shield-throb 1.4s ease-in-out infinite alternate;
  }

  @keyframes shield-throb {
    from { transform: scale(1); opacity: 1; }
    to   { transform: scale(1.06); opacity: 0.85; }
  }

  /* 500 — screen shake */
  .screen-shake {
    animation: shake 0.4s ease-in-out infinite;
  }

  @keyframes shake {
    0%, 100% { transform: translate(0, 0); }
    20%       { transform: translate(-1px, 1px); }
    40%       { transform: translate(1px, -1px); }
    60%       { transform: translate(-1px, -1px); }
    80%       { transform: translate(1px, 1px); }
  }

  /* 500 — bug bounce */
  .bug-body {
    animation: bug-hop 0.7s ease-in-out infinite alternate;
    transform-origin: 155px 100px;
  }

  @keyframes bug-hop {
    from { transform: translateY(0) rotate(0deg); }
    to   { transform: translateY(-4px) rotate(6deg); }
  }

  /* 500 — antenna wiggle */
  .antenna-l {
    transform-origin: 148px 92px;
    animation: ant-l 0.5s ease-in-out infinite alternate;
  }

  .antenna-r {
    transform-origin: 162px 92px;
    animation: ant-r 0.5s ease-in-out infinite alternate;
  }

  @keyframes ant-l {
    from { transform: rotate(-10deg); }
    to   { transform: rotate(10deg); }
  }

  @keyframes ant-r {
    from { transform: rotate(10deg); }
    to   { transform: rotate(-10deg); }
  }

  /* 500 — leg wiggle */
  .leg { animation: leg-kick 0.4s ease-in-out infinite alternate; }
  .leg-a { animation-direction: alternate; }
  .leg-b { animation-direction: alternate-reverse; }

  @keyframes leg-kick {
    from { transform: rotate(-8deg); }
    to   { transform: rotate(8deg); }
  }

  /* 500 — rising smoke */
  .smoke {
    animation: smoke-rise 2s ease-in-out infinite;
    transform-origin: center bottom;
  }

  .s1 { animation-delay: 0s; }
  .s2 { animation-delay: 0.7s; }

  @keyframes smoke-rise {
    0%   { opacity: 0;   transform: translateY(4px)  scaleX(0.9); }
    40%  { opacity: 0.6; transform: translateY(0)    scaleX(1); }
    100% { opacity: 0;   transform: translateY(-8px) scaleX(1.2); }
  }

  /* ── Status badge pulse ───────────────────────────────────────── */
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 1rem;
    background: var(--color-focus);
    color: white;
    border-radius: 999px;
    font-weight: 800;
    font-size: 0.95rem;
    letter-spacing: 0.05em;
    animation: badge-pulse 2.4s ease-in-out infinite;
  }

  @keyframes badge-pulse {
    0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-focus) 40%, transparent); }
    50%       { box-shadow: 0 0 0 8px color-mix(in srgb, var(--color-focus) 0%, transparent); }
  }

  .status-code {
    font-weight: 900;
  }

  /* ── Typography ───────────────────────────────────────────────── */
  h1 {
    font-size: 1.5rem;
    font-weight: 800;
    margin: 0;
    color: var(--color-text);
  }

  .message {
    color: var(--color-muted);
    margin: 0;
    line-height: 1.7;
    font-size: 0.95rem;
    max-width: 360px;
    min-height: 3.5em;
  }

  /* ── Action buttons ───────────────────────────────────────────── */
  .actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    justify-content: center;
    margin-top: 0.5rem;
    width: 100%;
  }

  .btn-primary,
  .btn-outline {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.7rem 1.5rem;
    border-radius: 0.625rem;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.15s ease;
    text-decoration: none;
  }

  .btn-primary {
    background: var(--color-focus);
    color: #fff;
    border: none;
    animation: btn-breathe 3s ease-in-out infinite;
  }

  @keyframes btn-breathe {
    0%, 100% { transform: scale(1); }
    50%       { transform: scale(1.02); }
  }

  .btn-primary:hover {
    background: #15803d;
    transform: translateY(-2px) scale(1.04);
    box-shadow: 0 6px 16px rgb(22 163 74 / 0.35);
    animation: none;
  }

  .btn-outline {
    border: 1.5px solid var(--color-border);
    color: var(--color-text);
    background: none;
  }

  .btn-outline:hover {
    border-color: var(--color-focus);
    color: var(--color-focus);
    background: var(--color-primary-subtle);
    transform: translateX(-2px);
  }

  /* ── Fun footer note ──────────────────────────────────────────── */
  .fun-note {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: 0.75rem;
    padding: 0.5rem 1rem;
    background: var(--color-primary-subtle);
    border-radius: 999px;
    color: var(--color-muted);
    font-size: 0.8rem;
    font-style: italic;
    animation: note-shimmer 4s ease-in-out infinite alternate;
  }

  @keyframes note-shimmer {
    from { opacity: 0.7; }
    to   { opacity: 1; }
  }

  .fun-note :global(svg) {
    flex-shrink: 0;
    opacity: 0.7;
    animation: frown-bob 2s ease-in-out infinite;
  }

  @keyframes frown-bob {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50%       { transform: translateY(-2px) rotate(-8deg); }
  }

  /* ── Responsive ───────────────────────────────────────────────── */
  @media (max-width: 480px) {
    .error-card {
      padding: 2rem 1.25rem;
    }
    .illustration {
      width: 160px;
      height: 144px;
    }
    h1 {
      font-size: 1.25rem;
    }
  }

  /* ── Reduced motion ───────────────────────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
</style>