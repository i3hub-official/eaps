<!-- src/routes/student/messages/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Card } from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import MessageSquarePlus from '@lucide/svelte/icons/message-square-plus';
	import Send from '@lucide/svelte/icons/send';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import MessagesSquare from '@lucide/svelte/icons/messages-square';

	let { data, form } = $props();

	let newDialogOpen = $state(false);
	let starting = $state(false);
	let sending = $state(false);
	let resolving = $state(false);
	let messageBody = $state('');

	let selectedId = $derived($page.url.searchParams.get('c'));

	$effect(() => {
		if (form?.startSuccess && form.conversationId) {
			newDialogOpen = false;
			goto(`?c=${form.conversationId}`, { invalidateAll: true });
		}
	});

	const statusVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
		OPEN: 'default',
		RESOLVED: 'secondary',
		CLOSED: 'outline'
	};

	function formatTime(d: string | Date) {
		return new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
	}

	function preview(text: string | null) {
		if (!text) return 'No messages yet';
		return text.length > 60 ? text.slice(0, 60) + '…' : text;
	}
</script>

<svelte:head>
	<title>Messages — MOUAU e-Test</title>
</svelte:head>

<Topbar title="Messages" />

<main class="flex flex-1 gap-6 overflow-hidden p-6">
	<!-- Conversation list -->
	<Card class="flex w-80 shrink-0 flex-col overflow-hidden p-0">
		<div class="flex items-center justify-between border-b p-4">
			<h2 class="text-sm font-semibold">Conversations</h2>
			<Dialog.Root bind:open={newDialogOpen}>
				<Dialog.Trigger>
					{#snippet child({ props })}
						<Button {...props} size="sm">
							<MessageSquarePlus class="size-4" />
							New
						</Button>
					{/snippet}
				</Dialog.Trigger>
				<Dialog.Content class="max-w-md">
					<Dialog.Header>
						<Dialog.Title>Start a new conversation</Dialog.Title>
						<Dialog.Description>
							Your message goes to your department's exam support team.
						</Dialog.Description>
					</Dialog.Header>

					{#if form?.startError}
						<div class="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
							<AlertCircle class="mt-0.5 size-4 shrink-0" />
							<span>{form.startError}</span>
						</div>
					{/if}

					<form
						method="POST"
						action="?/start"
						use:enhance={() => {
							starting = true;
							return async ({ update }) => {
								await update();
								starting = false;
							};
						}}
						class="flex flex-col gap-4"
					>
						<div class="flex flex-col gap-2">
							<label for="subject" class="text-sm font-medium">Subject</label>
							<Input id="subject" name="subject" placeholder="e.g. Unable to register for CSC301" required maxlength={150} />
						</div>
						<div class="flex flex-col gap-2">
							<label for="body" class="text-sm font-medium">Message</label>
							<Textarea id="body" name="body" placeholder="Describe your issue…" required rows={5} maxlength={4000} />
						</div>
						<Dialog.Footer>
							<Button type="button" variant="ghost" onclick={() => (newDialogOpen = false)}>Cancel</Button>
							<Button type="submit" disabled={starting}>{starting ? 'Sending…' : 'Send'}</Button>
						</Dialog.Footer>
					</form>
				</Dialog.Content>
			</Dialog.Root>
		</div>

		<div class="flex flex-1 flex-col overflow-y-auto">
			{#if data.conversations.length === 0}
				<p class="p-6 text-center text-sm text-muted-foreground">
					No conversations yet. Start one if you need help from your department.
				</p>
			{:else}
				{#each data.conversations as conv (conv.id)}
					<a
						href="?c={conv.id}"
						class="flex flex-col gap-1 border-b p-4 text-left transition-colors hover:bg-muted {selectedId === conv.id ? 'bg-muted' : ''}"
					>
						<div class="flex items-center justify-between gap-2">
							<span class="truncate text-sm font-medium">{conv.subject}</span>
							{#if conv.unreadCount > 0}
								<span class="flex size-2 shrink-0 rounded-full bg-primary"></span>
							{/if}
						</div>
						<p class="truncate text-xs text-muted-foreground">
							{conv.lastMessageFromStaff ? '' : 'You: '}{preview(conv.lastMessagePreview)}
						</p>
						<div class="flex items-center gap-2">
							<Badge variant={statusVariant[conv.status]} class="text-[10px]">{conv.status}</Badge>
							{#if conv.assignedToName}
								<span class="text-[11px] text-muted-foreground">{conv.assignedToName}</span>
							{/if}
						</div>
					</a>
				{/each}
			{/if}
		</div>
	</Card>

	<!-- Thread -->
	<Card class="flex flex-1 flex-col overflow-hidden p-0">
		{#if !data.selected}
			<div class="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center">
				<div class="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
					<MessagesSquare class="size-5" />
				</div>
				<div>
					<p class="text-base font-semibold">Select a conversation</p>
					<p class="mt-1 text-sm text-muted-foreground">
						Choose a conversation on the left, or start a new one.
					</p>
				</div>
			</div>
		{:else}
			<div class="flex items-center justify-between border-b p-4">
				<div>
					<h2 class="text-sm font-semibold">{data.selected.subject}</h2>
					<p class="text-xs text-muted-foreground">
						{data.selected.assignedToName ? `Assigned to ${data.selected.assignedToName}` : 'Awaiting assignment'}
					</p>
				</div>
				<div class="flex items-center gap-2">
					<Badge variant={statusVariant[data.selected.status]}>{data.selected.status}</Badge>
					{#if data.selected.status === 'OPEN'}
						<form
							method="POST"
							action="?/resolve"
							use:enhance={() => {
								resolving = true;
								return async ({ update }) => {
									await update();
									resolving = false;
								};
							}}
						>
							<input type="hidden" name="conversationId" value={data.selected.id} />
							<Button type="submit" variant="outline" size="sm" disabled={resolving}>
								<CheckCircle2 class="size-3.5" />
								{resolving ? 'Closing…' : 'Mark resolved'}
							</Button>
						</form>
					{/if}
				</div>
			</div>

			{#if form?.resolveError}
				<div class="mx-4 mt-4 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
					<AlertCircle class="mt-0.5 size-4 shrink-0" />
					<span>{form.resolveError}</span>
				</div>
			{/if}

			<div class="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
				{#each data.selected.messages as msg (msg.id)}
					<div class="flex flex-col gap-1 {msg.senderType === 'student' ? 'items-end' : 'items-start'}">
						<div
							class="max-w-md rounded-lg px-4 py-2 text-sm {msg.senderType === 'student'
								? 'bg-primary text-primary-foreground'
								: 'bg-muted text-foreground'}"
						>
							{msg.body}
						</div>
						<span class="px-1 text-[11px] text-muted-foreground">
							{msg.senderType === 'staff' ? msg.senderName ?? 'Support' : 'You'} · {formatTime(msg.createdAt)}
						</span>
					</div>
				{/each}
			</div>

			{#if data.selected.status === 'OPEN'}
				{#if form?.sendError}
					<div class="mx-4 mb-2 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
						<AlertCircle class="mt-0.5 size-4 shrink-0" />
						<span>{form.sendError}</span>
					</div>
				{/if}
				<form
					method="POST"
					action="?/send"
					use:enhance={() => {
						sending = true;
						return async ({ update }) => {
							await update();
							sending = false;
							messageBody = '';
						};
					}}
					class="flex items-end gap-2 border-t p-4"
				>
					<input type="hidden" name="conversationId" value={data.selected.id} />
					<Textarea
						name="body"
						placeholder="Type your message…"
						rows={2}
						maxlength={4000}
						required
						bind:value={messageBody}
						class="flex-1 resize-none"
					/>
					<Button type="submit" size="icon" disabled={sending || !messageBody.trim()}>
						<Send class="size-4" />
					</Button>
				</form>
			{:else}
				<div class="border-t p-4 text-center text-sm text-muted-foreground">
					This conversation is closed. Start a new one if you need further help.
				</div>
			{/if}
		{/if}
	</Card>
</main>