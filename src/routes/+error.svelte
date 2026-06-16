<!-- src/routes/+error.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { getContext } from 'svelte';
  import { ROLE_CONTEXT_KEY } from '$lib/constants/context';
  import { Home, ArrowLeft, SearchX, ShieldAlert, Bug, Frown, Clock, User, Users, GraduationCap, UserCog } from '@lucide/svelte';
  import { onMount } from 'svelte';

  // Get role from context (set in layout files)
  const contextRole = getContext<string | undefined>(ROLE_CONTEXT_KEY);
  
  // Fallback to route detection
  let currentRole = $derived.by(() => {
    if (contextRole) return contextRole;
    const path = $page.url.pathname;
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/lecturer')) return 'lecturer';
    if (path.startsWith('/invigilator')) return 'invigilator';
    if (path.startsWith('/student')) return 'student';
    return 'default';
  });

  // Role-specific configurations
  const roleConfig = {
    admin: {
      icon: UserCog,
      label: 'Admin',
      color: '#6366f1',
      colorVar: 'var(--admin-accent, #6366f1)',
      bgVar: 'var(--admin-accent-bg, rgba(99,102,241,0.1))',
      homeRoute: '/admin',
      titlePrefix: 'Administrator'
    },
    lecturer: {
      icon: Users,
      label: 'Lecturer',
      color: '#8b5cf6',
      colorVar: 'var(--lecturer-accent, #8b5cf6)',
      bgVar: 'var(--lecturer-accent-bg, rgba(139,92,246,0.1))',
      homeRoute: '/lecturer',
      titlePrefix: 'Lecturer'
    },
    invigilator: {
      icon: User,
      label: 'Invigilator',
      color: '#f59e0b',
      colorVar: 'var(--invigilator-accent, #f59e0b)',
      bgVar: 'var(--invigilator-accent-bg, rgba(245,158,11,0.1))',
      homeRoute: '/invigilator',
      titlePrefix: 'Invigilator'
    },
    student: {
      icon: GraduationCap,
      label: 'Student',
      color: '#10b981',
      colorVar: 'var(--student-accent, #10b981)',
      bgVar: 'var(--student-accent-bg, rgba(16,185,129,0.1))',
      homeRoute: '/student',
      titlePrefix: 'Student'
    },
    default: {
      icon: Home,
      label: 'Home',
      color: '#22c55e',
      colorVar: 'var(--g500, #22c55e)',
      bgVar: 'rgba(34,197,94,0.1)',
      homeRoute: '/',
      titlePrefix: ''
    }
  };

  const role = $derived(roleConfig[currentRole] || roleConfig.default);

  const messagePools = {
    404: {
      main: {
        admin: [
          "Looks like this page pulled a Houdini and vanished into thin air. Maybe it never existed, or maybe it's just playing hide and seek with the admin panel.",
          "This page is like your ex — gone, not coming back, and you're better off without it. Even admin privileges can't bring it back.",
          "We searched high and low, under the server rack, behind the database... nowhere to be found. This one's beyond even admin powers.",
          "This URL leads to a dimension where pages don't exist. Try another portal, oh mighty admin.",
          "Oops! This page must have graduated and left the university. No forwarding address. Admin override not available.",
          "You know that feeling when you walk into a room and forget why? This page had the same problem. Except it's permanent.",
          "404: Page not found. Have you tried turning the internet off and on again? We have, didn't help.",
          "This page is currently on sabbatical. Please check back in 2050. We'll mark it on your admin calendar.",
          "We asked the server about this page. It just shrugged and said 'IDK bro'. Even the admin can't force it.",
          "This page is like a ghost — people claim they've seen it, but there's no proof. Admin ghost hunters report.",
        ],
        lecturer: [
          "Looks like this page pulled a Houdini and vanished into thin air. Maybe it never existed, or maybe it's just playing hide and seek with the lecturer portal.",
          "This page is like your ex — gone, not coming back, and you're better off without it. Even your lecturer powers can't save it.",
          "We searched high and low, under the podium, behind the whiteboard... nowhere to be found.",
          "This URL leads to a dimension where pages don't exist. Try another portal, professor.",
          "Oops! This page must have graduated and left the university. No forwarding address.",
          "You know that feeling when you walk into a classroom and forget your lesson plan? This page had the same problem.",
          "404: Page not found. Have you tried turning the projector off and on again?",
          "This page is currently on sabbatical. Please check back in 2050.",
          "We asked the server about this page. It just shrugged and said 'IDK bro'.",
          "This page is like a ghost — people claim they've seen it, but there's no proof.",
        ],
        invigilator: [
          "Looks like this page pulled a Houdini and vanished into thin air. Even with your invigilator eyes, you can't spot it.",
          "This page is like a student who skipped the exam — gone, not coming back, and you're better off without it.",
          "We searched high and low, under the desks, behind the exam hall... nowhere to be found.",
          "This URL leads to a dimension where pages don't exist. Try another portal, chief invigilator.",
          "Oops! This page must have graduated and left the university. No forwarding address.",
          "You know that feeling when you're invigilating and a student disappears? This page had the same problem.",
          "404: Page not found. Have you tried turning the exam hall lights off and on again?",
          "This page is currently on sabbatical. Please check back in 2050.",
          "We asked the server about this page. It just shrugged and said 'IDK bro'.",
          "This page is like a ghost — people claim they've seen it, but there's no proof.",
        ],
        student: [
          "Looks like this page pulled a Houdini and vanished into thin air. Maybe it never existed, or maybe it's just playing hide and seek.",
          "This page is like your ex — gone, not coming back, and you're better off without it.",
          "We searched high and low, under the library desk, behind the lecture hall... nowhere to be found.",
          "This URL leads to a dimension where pages don't exist. Try another portal, student.",
          "Oops! This page must have graduated and left the university. No forwarding address.",
          "You know that feeling when you walk into a lecture hall and forget your seat? This page had the same problem.",
          "404: Page not found. Have you tried turning your phone off and on again?",
          "This page is currently on sabbatical. Please check back in 2050.",
          "We asked the server about this page. It just shrugged and said 'IDK bro'.",
          "This page is like a ghost — people claim they've seen it, but there's no proof.",
        ],
        default: [
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
        ]
      },
      footer: [
        "Don't worry, even GPS gets lost sometimes.",
        "Maybe try shouting the page name three times into your screen.",
        "Have you considered that the page might be avoiding you?",
        "Pro tip: pages can't hide forever. Except this one, apparently.",
        "Even Columbus took a wrong turn once in a while.",
      ]
    },
    403: {
      main: {
        admin: [
          "Nope, not happening! Even admin powers have limits. This area is more restricted than the dean's office.",
          "This page is VIP-only, and your admin badge isn't enough. Sorry, not sorry.",
          "Access denied! It's like trying to enter the server room without a key. Bold, but no.",
          "You shall not pass! — Gandalf (and also this server, despite your admin role)",
          "This page requires clearance level: 'Super Admin'. You currently have: 'Admin'.",
          "We'd let you in, but even as an admin, you're not on the list. And we can't have that kind of chaos.",
          "This is a restricted zone. Even admins need special permission. The system has spoken.",
          "Your permissions are like your admin powers — not high enough for this level.",
          "Nice try, but this page is behind a firewall thicker than your admin dashboard.",
          "Unauthorized access attempt logged. The IT department is judging you right now, admin.",
        ],
        lecturer: [
          "Nope, not happening! This area is more restricted than the exam office. Your lecturer pass doesn't work here.",
          "This page is VIP-only, and your name is not on the list. Sorry, not sorry, professor.",
          "Access denied! It's like trying to enter the exam hall without an invigilator pass. Bold, but no.",
          "You shall not pass! — Gandalf (and also this server)",
          "This page requires clearance level: 'Admin'. You currently have: 'Lecturer'.",
          "We'd let you in, but then we'd have to let every lecturer in. And we can't have that.",
          "This is a restricted zone. Only admin can access this area. Your lecturer privileges won't cut it.",
          "Your permissions are like your course load — not enough for this level.",
          "Nice try, but this page is behind a firewall thicker than the university library walls.",
          "Unauthorized access attempt logged. The IT department is watching you, lecturer.",
        ],
        invigilator: [
          "Nope, not happening! This area is more restricted than the exam vault. Your invigilator badge doesn't open this.",
          "This page is VIP-only, and your name is not on the list. Sorry, not sorry.",
          "Access denied! It's like trying to enter the dean's office without an appointment. Bold, but no.",
          "You shall not pass! — Gandalf (and also this server)",
          "This page requires clearance level: 'Lecturer' or higher. You currently have: 'Invigilator'.",
          "We'd let you in, but then we'd have to let ALL invigilators in. Can't have that kind of chaos.",
          "This is a restricted zone. If you proceed, campus security WILL be called. And they don't play.",
          "Your permissions are like your invigilation schedule — not high enough for this level.",
          "Nice try, but this page is behind a firewall thicker than the exam hall walls.",
          "Unauthorized access attempt logged. The IT department is judging you right now.",
        ],
        student: [
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
        default: [
          "Nope, not happening! This area is more restricted than the dean's office. You don't have the magic key for this one.",
          "This page is VIP-only, and your name is not on the list. Sorry, not sorry.",
          "Access denied! It's like trying to enter a final year project defense as a fresher. Bold, but no.",
          "You shall not pass! — Gandalf (and also this server)",
          "This page requires clearance level: 'Professor Emeritus'. You currently have: 'Unknown'.",
          "We'd let you in, but then we'd have to let EVERYONE in. And we can't have that kind of chaos.",
          "This is a restricted zone. If you proceed, campus security WILL be called. And they don't play.",
          "Your permissions are like your CGPA — not high enough for this level.",
          "Nice try, but this page is behind a firewall thicker than the school library walls.",
          "Unauthorized access attempt logged. The IT department is judging you right now.",
        ]
      },
      footer: [
        "If you think this is a mistake, contact the admin. Or bribe them with jollof.",
        "Have you tried being more... authorized?",
        "Maybe ask your HOD for a permission slip?",
        "The password is definitely not 'password123'. We checked.",
        "Try again after you've completed your clearance. Yes, all of it.",
      ]
    },
    500: {
      main: {
        admin: [
          "Oops! Our servers are having a bit of a meltdown. Even the admin dashboard can't fix this one.",
          "Something exploded on our end. Don't panic, we have a guy. He's currently crying into his keyboard. Even admin can't help.",
          "Error 500: Our code did a backflip and landed on its face. We're applying ice packs now. Admin override not available.",
          "The server encountered an internal error, which is tech speak for 'we have no idea what happened'. Even the admin is clueless.",
          "Our backend just had an existential crisis. It's questioning its purpose in life. Admin, send help.",
          "Houston, we have a problem. And by Houston, we mean our server room. And by problem, we mean fire. Admin, evacuate.",
          "A wild bug appeared! Our developers used 'fix bug'... it's not very effective. Even admin debug can't catch it.",
          "The hamster powering our server just fell off the wheel. We're getting a new hamster. Admin, fetch one.",
          "Our database took a coffee break and forgot to come back. We're negotiating its return. Admin, negotiate.",
          "This error is so rare, we might frame it. Thanks for being part of history, admin!",
        ],
        lecturer: [
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
        invigilator: [
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
        student: [
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
        default: [
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
        ]
      },
      footer: [
        "Our developers have been notified. They're probably crying already.",
        "Refresh if you dare. No promises though.",
        "We're fixing this faster than you can say 'infrastructure as code'.",
        "This is fine. (It's not fine. Send help.)",
        "Bug report submitted. Someone will look at it... eventually.",
      ]
    },
    429: {
      main: {
        admin: [
          "Whoa there, speed racer! Even admins need to slow down sometimes.",
          "Too many requests! Even the server needs a breather. Give it a moment.",
          "You're hitting us harder than a fresher hitting the cafeteria on day one. Pace yourself, admin!",
          "Rate limit reached. Our server is like a strict lecturer — it needs time between questions. Even the admin can't rush it.",
          "Chill! You're sending more requests than assignment deadline reminders. Admin, take a break.",
          "Our server is overwhelmed. It's currently in a corner doing breathing exercises. Admin, give it space.",
          "429: Too many requests. Have you tried... not doing that? Admin, stop it.",
          "You're going at this like it's a 100m sprint. This is a marathon, admin.",
          "The server is giving you the side-eye. Maybe take a 14-minute break? Admin, relax.",
          "Easy there! Even the admin dashboard has limits, and so do you.",
        ],
        lecturer: [
          "Whoa there, speed racer! You're going faster than the campus shuttle. Slow down a bit.",
          "Too many requests! Even the server needs a breather. Give it a moment.",
          "You're hitting us harder than a fresher hitting the cafeteria on day one. Pace yourself!",
          "Rate limit reached. Our server is like a strict lecturer — it needs time between questions.",
          "Chill! You're sending more requests than assignment deadline reminders.",
          "Our server is overwhelmed. It's currently in a corner doing breathing exercises.",
          "429: Too many requests. Have you tried... not doing that?",
          "You're going at this like it's a 100m sprint. This is a marathon, friend.",
          "The server is giving you the side-eye. Maybe take a 14-minute break?",
          "Easy there! Even the Wi-Fi at the library has limits, and so do we.",
        ],
        invigilator: [
          "Whoa there, speed racer! You're going faster than the campus shuttle. Slow down a bit.",
          "Too many requests! Even the server needs a breather. Give it a moment.",
          "You're hitting us harder than a fresher hitting the cafeteria on day one. Pace yourself!",
          "Rate limit reached. Our server is like a strict lecturer — it needs time between questions.",
          "Chill! You're sending more requests than assignment deadline reminders.",
          "Our server is overwhelmed. It's currently in a corner doing breathing exercises.",
          "429: Too many requests. Have you tried... not doing that?",
          "You're going at this like it's a 100m sprint. This is a marathon, friend.",
          "The server is giving you the side-eye. Maybe take a 14-minute break?",
          "Easy there! Even the Wi-Fi at the library has limits, and so do we.",
        ],
        student: [
          "Whoa there, speed racer! You're going faster than the campus shuttle. Slow down a bit.",
          "Too many requests! Even the server needs a breather. Give it a moment.",
          "You're hitting us harder than a fresher hitting the cafeteria on day one. Pace yourself!",
          "Rate limit reached. Our server is like a strict lecturer — it needs time between questions.",
          "Chill! You're sending more requests than assignment deadline reminders.",
          "Our server is overwhelmed. It's currently in a corner doing breathing exercises.",
          "429: Too many requests. Have you tried... not doing that?",
          "You're going at this like it's a 100m sprint. This is a marathon, friend.",
          "The server is giving you the side-eye. Maybe take a 14-minute break?",
          "Easy there! Even the Wi-Fi at the library has limits, and so do we.",
        ],
        default: [
          "Whoa there, speed racer! You're going faster than the campus shuttle. Slow down a bit.",
          "Too many requests! Even the server needs a breather. Give it a moment.",
          "You're hitting us harder than a fresher hitting the cafeteria on day one. Pace yourself!",
          "Rate limit reached. Our server is like a strict lecturer — it needs time between questions.",
          "Chill! You're sending more requests than assignment deadline reminders.",
          "Our server is overwhelmed. It's currently in a corner doing breathing exercises.",
          "429: Too many requests. Have you tried... not doing that?",
          "You're going at this like it's a 100m sprint. This is a marathon, friend.",
          "The server is giving you the side-eye. Maybe take a 14-minute break?",
          "Easy there! Even the Wi-Fi at the library has limits, and so do we.",
        ]
      },
      footer: [
        "Take a deep breath. Maybe grab some water. The server will be ready soon.",
        "Patience is a virtue. And also required by our rate limiter.",
        "Try again after the cooldown. Use the time to stretch or something.",
        "Pro tip: batch your requests like you batch your laundry.",
        "The countdown is on. Use this time to plan your next move wisely.",
      ]
    },
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

  function formatCountdown(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  let mainMessage = $state('');
  let footerMessage = $state('');
  let currentStatus = $state(500);
  let mounted = $state(false);
  let retryAfter = $state(0);
  let countdownText = $state('');
  let countdownInterval: ReturnType<typeof setInterval> | null = null;

  onMount(() => {
    const status = $page.status;
    currentStatus = status;

    const statusKey = status === 404 ? 404 
                      : status === 403 ? 403 
                      : status === 429 ? 429
                      : 500;
    const pool = messagePools[statusKey];

    // Get role-specific messages
    const roleMessages = pool.main[currentRole] || pool.main.default || pool.main[Object.keys(pool.main)[0]];
    
    const mainIdx = getMessageIndex(roleMessages.length, statusKey, 'main');
    const footerIdx = getMessageIndex(pool.footer.length, statusKey, 'footer');

    mainMessage = roleMessages[mainIdx];
    footerMessage = pool.footer[footerIdx];

    const storageKey = `error-msg-${statusKey}-${currentRole}`;
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

    // Handle retryAfter countdown for 429 errors
    const rawRetry = ($page.error as any)?.retryAfter;
    if (status === 429 && rawRetry) {
      retryAfter = typeof rawRetry === 'number' ? rawRetry : parseInt(rawRetry, 10);
      if (!isNaN(retryAfter) && retryAfter > 0) {
        let remaining = retryAfter;
        countdownText = formatCountdown(remaining);
        countdownInterval = setInterval(() => {
          remaining--;
          if (remaining <= 0) {
            countdownText = 'Ready!';
            if (countdownInterval) clearInterval(countdownInterval);
          } else {
            countdownText = formatCountdown(remaining);
          }
        }, 1000);
      }
    }

    // Trigger entrance animations after a tiny delay
    requestAnimationFrame(() => {
      mounted = true;
    });

    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
    };
  });
</script>

<svelte:head>
  <title>{$page.status} — MOUAU eTest</title>
</svelte:head>

<div class="error-page" style="--role-color: {role.colorVar}; --role-bg: {role.bgVar};">
  <!-- Floating background particles with role color -->
  <div class="particles" aria-hidden="true">
    {#each Array(12) as _, i}
      <div class="particle" style="--i: {i}; background: {role.colorVar};"></div>
    {/each}
  </div>

  <div class="error-card" class:mounted>
    <!-- Role Badge -->
    <div class="role-badge" style="--role-color: {role.colorVar};">
      <svelte:component this={role.icon} size={14} />
      <span>{role.label}</span>
    </div>

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
          <text x="35" y="95" font-size="14" fill="{role.colorVar}" font-weight="bold" class="q-mark q1">?</text>
          <text x="85" y="100" font-size="12" fill="{role.colorVar}" font-weight="bold" class="q-mark q2">?</text>
          <text x="120" y="88" font-size="11" fill="{role.colorVar}" font-weight="bold" class="q-mark q3">?</text>
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
          <rect x="70" y="30" width="60" height="120" rx="2" fill="none" stroke="{role.colorVar}" stroke-width="4" class="door-pulse"/>
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
            <path d="M40 85 L40 110 Q40 125 55 130 Q70 125 70 110 L70 85 Q55 90 40 85Z" fill="{role.colorVar}" opacity="0.2"/>
            <path d="M40 85 L40 110 Q40 125 55 130 Q70 125 70 110 L70 85 Q55 90 40 85Z" fill="none" stroke="{role.colorVar}" stroke-width="2"/>
            <text x="55" y="112" text-anchor="middle" font-size="10" fill="{role.colorVar}" font-weight="bold">403</text>
          </g>
        </svg>

      {:else if currentStatus === 429}
        <svg viewBox="0 0 200 180" class="error-svg" aria-hidden="true">
          <!-- Clock/timer -->
          <circle cx="100" cy="90" r="55" fill="none" stroke="{role.colorVar}" stroke-width="4" class="clock-ring"/>
          <circle cx="100" cy="90" r="50" fill="var(--color-surface)" stroke="{role.colorVar}" stroke-width="2" opacity="0.1"/>
          <!-- Clock hands -->
          <line x1="100" y1="90" x2="100" y2="55" stroke="{role.colorVar}" stroke-width="3" stroke-linecap="round" class="hand-min"/>
          <line x1="100" y1="90" x2="125" y2="90" stroke="{role.colorVar}" stroke-width="2" stroke-linecap="round" class="hand-hour"/>
          <!-- Center dot -->
          <circle cx="100" cy="90" r="4" fill="{role.colorVar}"/>
          <!-- Ticks -->
          {#each [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330] as deg}
            <line 
              x1="100" y1="45" 
              x2="100" y2="50" 
              stroke="var(--color-muted)" 
              stroke-width="2"
              transform="rotate({deg} 100 90)"
            />
          {/each}
          <!-- Snail / slow character -->
          <g class="snail">
            <path d="M140 135 Q140 120 150 115 Q160 110 165 120 Q170 130 160 135 Q150 140 140 135Z" fill="var(--color-text)"/>
            <circle cx="155" cy="118" r="2" fill="var(--color-bg)"/>
            <path d="M165 120 Q175 115 178 110" stroke="var(--color-text)" stroke-width="2" fill="none" stroke-linecap="round" class="antenna"/>
            <circle cx="178" cy="110" r="2" fill="var(--color-text)" class="antenna"/>
          </g>
          <!-- "429" text -->
          <text x="100" y="160" text-anchor="middle" font-size="14" font-weight="bold" fill="{role.colorVar}">429</text>
          <!-- Zzz bubbles -->
          <text x="185" y="105" font-size="10" fill="var(--color-muted)" class="zzz z1">z</text>
          <text x="192" y="98" font-size="8" fill="var(--color-muted)" class="zzz z2">z</text>
        </svg>

      {:else}
        <svg viewBox="0 0 200 180" class="error-svg" aria-hidden="true">
          <!-- Shaking screen -->
          <g class="screen-shake">
            <rect x="45" y="30" width="110" height="80" rx="6" fill="var(--color-surface)" stroke="{role.colorVar}" stroke-width="3"/>
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
            <ellipse cx="155" cy="100" rx="14" ry="10" fill="{role.colorVar}"/>
            <circle cx="150" cy="96" r="2" fill="white"/>
            <circle cx="160" cy="96" r="2" fill="white"/>
            <circle cx="150" cy="96" r="1" fill="var(--color-text)"/>
            <circle cx="160" cy="96" r="1" fill="var(--color-text)"/>
          </g>
          <!-- Wiggling antennae -->
          <line x1="148" y1="92" x2="143" y2="82" stroke="{role.colorVar}" stroke-width="2" stroke-linecap="round" class="antenna-l"/>
          <line x1="162" y1="92" x2="167" y2="82" stroke="{role.colorVar}" stroke-width="2" stroke-linecap="round" class="antenna-r"/>
          <circle cx="143" cy="82" r="2" fill="{role.colorVar}" class="antenna-l"/>
          <circle cx="167" cy="82" r="2" fill="{role.colorVar}" class="antenna-r"/>
          <!-- Wiggling legs -->
          <line x1="145" y1="104" x2="138" y2="110" stroke="{role.colorVar}" stroke-width="2" stroke-linecap="round" class="leg leg-a"/>
          <line x1="165" y1="104" x2="172" y2="110" stroke="{role.colorVar}" stroke-width="2" stroke-linecap="round" class="leg leg-b"/>
          <line x1="148" y1="108" x2="142" y2="115" stroke="{role.colorVar}" stroke-width="2" stroke-linecap="round" class="leg leg-b"/>
          <line x1="162" y1="108" x2="168" y2="115" stroke="{role.colorVar}" stroke-width="2" stroke-linecap="round" class="leg leg-a"/>
          <!-- Smoke puffs -->
          <path d="M55 25 Q60 15 65 20 Q70 10 75 18" fill="none" stroke="#94a3b8" stroke-width="2" opacity="0.6" class="smoke s1"/>
          <path d="M125 22 Q130 12 135 18 Q140 8 145 16" fill="none" stroke="#94a3b8" stroke-width="2" opacity="0.6" class="smoke s2"/>
        </svg>
      {/if}
    </div>

    <!-- Status badge -->
    <div class="status-badge" style="--badge-color: {role.colorVar};">
      {#if currentStatus === 404}
        <SearchX size={18} />
      {:else if currentStatus === 403}
        <ShieldAlert size={18} />
      {:else if currentStatus === 429}
        <Clock size={18} />
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
      {:else if currentStatus === 429}
        Too Many Requests
      {:else}
        Something Went Wrong
      {/if}
    </h1>

    <p class="message">{mainMessage}</p>

    {#if currentStatus === 429 && countdownText}
      <div class="countdown-badge" style="--badge-color: {role.colorVar};">
        <Clock size={14} />
        <span>Retry in: {countdownText}</span>
      </div>
    {/if}

    <div class="actions">
      <a href={role.homeRoute} class="btn-primary" style="--btn-bg: {role.colorVar};">
        <Home size={16} />
        Go {role.label} Home
      </a>
      <button onclick={() => history.back()} class="btn-outline" style="--btn-color: {role.colorVar};" type="button">
        <ArrowLeft size={16} />
        Go Back
      </button>
    </div>

    <div class="fun-note" style="--note-color: {role.colorVar};">
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
    background: var(--role-color);
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

  .error-card.mounted > *:nth-child(1) { transition-delay: 0.05s; }
  .error-card.mounted > *:nth-child(2) { transition-delay: 0.1s; }
  .error-card.mounted > *:nth-child(3) { transition-delay: 0.18s; }
  .error-card.mounted > *:nth-child(4) { transition-delay: 0.25s; }
  .error-card.mounted > *:nth-child(5) { transition-delay: 0.32s; }
  .error-card.mounted > *:nth-child(6) { transition-delay: 0.4s; }
  .error-card.mounted > *:nth-child(7) { transition-delay: 0.47s; }
  .error-card.mounted > *:nth-child(8) { transition-delay: 0.54s; }

  /* ── Role Badge ────────────────────────────────────────────────── */
  .role-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.25rem 0.75rem;
    background: var(--role-bg);
    color: var(--role-color);
    border: 1.5px solid var(--role-color);
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.7;
    animation: badge-enter 0.6s ease;
  }

  @keyframes badge-enter {
    from { opacity: 0; transform: scale(0.8); }
    to { opacity: 0.7; transform: scale(1); }
  }

  /* ── Illustration float ───────────────────────────────────────── */
  .illustration {
    width: 200px;
    height: 180px;
    margin-bottom: 0.25rem;
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
    from { stroke: var(--role-color); opacity: 0.5; }
    to   { stroke: var(--role-color); opacity: 1; }
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

  /* 429 — clock hands spin */
  .hand-min {
    transform-origin: 100px 90px;
    animation: spin-min 2s linear infinite;
  }
  .hand-hour {
    transform-origin: 100px 90px;
    animation: spin-hour 24s linear infinite;
  }
  @keyframes spin-min {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes spin-hour {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  /* 429 — clock ring pulse */
  .clock-ring {
    animation: ring-pulse 1.5s ease-in-out infinite alternate;
  }
  @keyframes ring-pulse {
    from { stroke: var(--role-color); opacity: 0.5; }
    to   { stroke: var(--role-color); opacity: 1; }
  }

  /* 429 — snail crawl */
  .snail {
    animation: crawl 3s ease-in-out infinite alternate;
  }
  @keyframes crawl {
    from { transform: translateX(0); }
    to   { transform: translateX(-8px); }
  }

  /* 429 — zzz float */
  .zzz {
    animation: zzz-rise 2s ease-in-out infinite;
    opacity: 0;
  }
  .z1 { animation-delay: 0s; }
  .z2 { animation-delay: 0.6s; }
  @keyframes zzz-rise {
    0%   { opacity: 0; transform: translateY(0); }
    30%  { opacity: 0.8; }
    100% { opacity: 0; transform: translateY(-10px) translateX(5px); }
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
    background: var(--badge-color);
    color: white;
    border-radius: 999px;
    font-weight: 800;
    font-size: 0.95rem;
    letter-spacing: 0.05em;
    animation: badge-pulse 2.4s ease-in-out infinite;
  }

  @keyframes badge-pulse {
    0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--badge-color) 40%, transparent); }
    50%       { box-shadow: 0 0 0 8px color-mix(in srgb, var(--badge-color) 0%, transparent); }
  }

  .status-code {
    font-weight: 900;
  }

  /* ── Countdown badge (429 only) ───────────────────────────────── */
  .countdown-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 1rem;
    background: var(--role-bg);
    border: 1.5px solid var(--badge-color);
    color: var(--badge-color);
    border-radius: 999px;
    font-weight: 700;
    font-size: 0.9rem;
    animation: badge-pulse 2.4s ease-in-out infinite;
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
    background: var(--btn-bg);
    color: #fff;
    border: none;
    animation: btn-breathe 3s ease-in-out infinite;
  }

  @keyframes btn-breathe {
    0%, 100% { transform: scale(1); }
    50%       { transform: scale(1.02); }
  }

  .btn-primary:hover {
    filter: brightness(0.9);
    transform: translateY(-2px) scale(1.04);
    box-shadow: 0 6px 16px color-mix(in srgb, var(--btn-bg) 35%, transparent);
    animation: none;
  }

  .btn-outline {
    border: 1.5px solid var(--color-border);
    color: var(--color-text);
    background: none;
  }

  .btn-outline:hover {
    border-color: var(--btn-color);
    color: var(--btn-color);
    background: var(--role-bg);
    transform: translateX(-2px);
  }

  /* ── Fun footer note ──────────────────────────────────────────── */
  .fun-note {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: 0.75rem;
    padding: 0.5rem 1rem;
    background: var(--role-bg);
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
    color: var(--note-color);
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
    .role-badge {
      font-size: 0.6rem;
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