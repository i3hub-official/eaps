<!-- src/routes/(lecturer)/lecturer/messages/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger,
	} from '$lib/components/ui/select/index.js';
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '$lib/components/ui/dialog/index.js';
	import {
		MessageSquare,
		Users,
		Send,
		Search,
		User,
		Clock,
		CheckCircle,
		AlertCircle,
		LoaderCircle,
		RefreshCw,
		Building2,
		X,
		Paperclip,
		Reply,
		Archive,
		Flag,
	} from '@lucide/svelte/icons';
	import { invalidateAll } from '$app/navigation';
	import { format } from '$lib/utils/date';

	let { data, form } = $props();

	// ─── State ────────────────────────────────────────────────────────────────
	let isRefreshing = $state(false);
	let searchQuery = $state('');
	let filterStatus = $state('all');
	let selectedConversation = $state<string | null>(null);
	let newMessage = $state('');
	let isSending = $state(false);
	let showNewConversation = $state(false);
	let selectedStudent = $state('');
	let subject = $state('');
	let messageBody = $state('');

	// ─── Data ────────────────────────────────────────────────────────────────
	let user = $derived(data?.user);
	let conversations = $derived(data?.conversations || []);
	let students = $derived(data?.students || []);
	let stats = $derived(data?.stats);
	let error = $derived(data?.error);

	// ─── Computed ────────────────────────────────────────────────────────────
	let filteredConversations = $derived(
		conversations.filter(c => {
			const matchesSearch = c.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
				c.subject.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
			return matchesSearch && matchesStatus;
		})
	);

	let currentConversation = $derived(
		selectedConversation 
			? conversations.find(c => c.id === selectedConversation)
			: null
	);

	// ─── Handlers ────────────────────────────────────────────────────────────
	async function handleRefresh() {
		if (isRefreshing) return;
		isRefreshing = true;
		await invalidateAll();
		isRefreshing = false;
	}

	async function sendMessage() {
		if (!newMessage.trim() || !selectedConversation) return;
		isSending = true;
		
		try {
			const response = await fetch('/api/messages/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					conversationId: selectedConversation,
					body: newMessage,
				}),
			});
			
			if (response.ok) {
				newMessage = '';
				await invalidateAll();
			}
		} catch (err) {
			console.error('Failed to send message:', err);
		} finally {
			isSending = false;
		}
	}

	async function startNewConversation() {
		if (!selectedStudent || !subject.trim() || !messageBody.trim()) return;
		
		try {
			const response = await fetch('/api/messages/new', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					studentId: selectedStudent,
					subject: subject.trim(),
					body: messageBody.trim(),
				}),
			});
			
			if (response.ok) {
				showNewConversation = false;
				selectedStudent = '';
				subject = '';
				messageBody = '';
				await invalidateAll();
			}
		} catch (err) {
			console.error('Failed to start conversation:', err);
		}
	}

	async function updateConversationStatus(conversationId: string, status: string) {
		try {
			const response = await fetch(`/api/messages/${conversationId}/status`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status }),
			});
			
			if (response.ok) {
				await invalidateAll();
			}
		} catch (err) {
			console.error('Failed to update conversation status:', err);
		}
	}

	function getStatusBadge(status: string) {
		const variants: Record<string, { variant: string; label: string; icon: any }> = {
			OPEN: { variant: 'success', label: 'Open', icon: MessageSquare },
			RESOLVED: { variant: 'default', label: 'Resolved', icon: CheckCircle },
			CLOSED: { variant: 'secondary', label: 'Closed', icon: X },
		};
		return variants[status] || { variant: 'secondary', label: status, icon: MessageSquare };
	}

	function getTimeAgo(date: Date) {
		const now = new Date();
		const diff = now.getTime() - new Date(date).getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 1) return 'Just now';
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		if (days < 7) return `${days}d ago`;
		return format(new Date(date), 'PP');
	}
</script>

<svelte:head>
	<title>Messages — EAPS</title>
</svelte:head>

<Topbar title="Messages" description="Communicate with your students">
	{#snippet actions()}
		<Button
			variant="outline"
			size="sm"
			onclick={handleRefresh}
			disabled={isRefreshing}
		>
			{#if isRefreshing}
				<LoaderCircle class="size-4 animate-spin" />
			{:else}
				<RefreshCw class="size-4" />
			{/if}
			Refresh
		</Button>
		<Dialog bind:open={showNewConversation}>
			<DialogTrigger asChild>
				<Button size="sm">
					<MessageSquare class="mr-2 size-4" />
					New Message
				</Button>
			</DialogTrigger>
			<DialogContent class="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>New Conversation</DialogTitle>
					<DialogDescription>
						Start a new conversation with a student.
					</DialogDescription>
				</DialogHeader>
				<div class="space-y-4 py-4">
					<div class="space-y-2">
						<Label for="student">Student</Label>
						<Select>
							<SelectTrigger id="student" onchange={(e) => selectedStudent = e.currentTarget.value}>
								<span class="truncate">
									{selectedStudent 
										? students.find(s => s.id === selectedStudent)?.name 
										: 'Select a student'}
								</span>
							</SelectTrigger>
							<SelectContent>
								{#each students as student}
									<SelectItem 
										value={student.id}
										selected={selectedStudent === student.id}
										onclick={() => selectedStudent = student.id}
									>
										{student.name} ({student.matricNumber})
									</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>
					<div class="space-y-2">
						<Label for="subject">Subject</Label>
						<Input
							id="subject"
							bind:value={subject}
							placeholder="Enter subject..."
						/>
					</div>
					<div class="space-y-2">
						<Label for="message">Message</Label>
						<Textarea
							id="message"
							bind:value={messageBody}
							placeholder="Type your message..."
							rows={4}
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onclick={() => showNewConversation = false}>
						Cancel
					</Button>
					<Button onclick={startNewConversation} disabled={!selectedStudent || !subject.trim() || !messageBody.trim()}>
						<Send class="mr-2 size-4" />
						Send
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	{/snippet}
</Topbar>

<!-- ─── Main Content ──────────────────────────────────────────────────────── -->
<div class="p-6">
	{#if !data}
		<!-- ─── Loading State ────────────────────────────────────────────── -->
		<div class="grid gap-6 md:grid-cols-3">
			{#each [1, 2, 3] as item (item)}
				<Card>
					<CardHeader>
						<Skeleton class="h-4 w-24" />
					</CardHeader>
					<CardContent>
						<Skeleton class="h-8 w-16" />
						<Skeleton class="mt-2 h-3 w-32" />
					</CardContent>
				</Card>
			{/each}
		</div>
		<div class="mt-6 grid gap-6 md:grid-cols-3">
			<Card class="md:col-span-1">
				<CardContent class="p-4">
					<div class="space-y-2">
						{#each [1, 2, 3, 4, 5] as item (item)}
							<Skeleton class="h-16 w-full" />
						{/each}
					</div>
				</CardContent>
			</Card>
			<Card class="md:col-span-2">
				<CardContent class="p-4">
					<Skeleton class="h-32 w-full" />
					<div class="mt-4 space-y-2">
						{#each [1, 2, 3] as item (item)}
							<Skeleton class="h-12 w-3/4" />
						{/each}
					</div>
				</CardContent>
			</Card>
		</div>
	{:else if error}
		<!-- ─── Error State ──────────────────────────────────────────────── -->
		<Alert variant="destructive" class="mb-6">
			<AlertCircle class="size-4" />
			<AlertDescription>{error}</AlertDescription>
		</Alert>

		<Card>
			<CardContent class="flex flex-col items-center justify-center py-12">
				<Building2 class="size-12 text-muted-foreground/50 mb-4" />
				<h3 class="text-lg font-semibold">Cannot load messages</h3>
				<p class="text-sm text-muted-foreground mt-1">
					{error === 'No department assigned. Contact your HOD.' 
						? 'Please contact your HOD to assign a department.' 
						: 'There was an error loading your messages.'}
				</p>
				<Button variant="outline" class="mt-4" onclick={handleRefresh}>
					<RefreshCw class="mr-2 size-4" />
					Try Again
				</Button>
			</CardContent>
		</Card>
	{:else}
		<!-- ─── Statistics Cards ──────────────────────────────────────────── -->
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Total Conversations</CardTitle>
					<MessageSquare class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{stats?.total || 0}</div>
					<p class="text-xs text-muted-foreground">all conversations</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Open</CardTitle>
					<MessageSquare class="size-4 text-green-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold text-green-600">{stats?.open || 0}</div>
					<p class="text-xs text-muted-foreground">active conversations</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Resolved</CardTitle>
					<CheckCircle class="size-4 text-blue-500" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold text-blue-600">{stats?.resolved || 0}</div>
					<p class="text-xs text-muted-foreground">completed</p>
				</CardContent>
			</Card>
		</div>

		<!-- ─── Conversations ────────────────────────────────────────────────── -->
		<div class="mt-6 grid gap-6 md:grid-cols-3">
			<!-- Conversation List -->
			<Card class="md:col-span-1">
				<CardHeader class="pb-3">
					<div class="flex items-center gap-2">
						<Search class="size-4 text-muted-foreground" />
						<Input
							bind:value={searchQuery}
							placeholder="Search conversations..."
							class="h-8"
						/>
					</div>
					<div class="mt-2">
						<Select>
							<SelectTrigger class="h-8" onchange={(e) => filterStatus = e.currentTarget.value}>
								<span class="truncate text-xs">
									{filterStatus === 'all' ? 'All Status' : 
									 filterStatus === 'OPEN' ? 'Open' : 
									 filterStatus === 'RESOLVED' ? 'Resolved' : 'Closed'}
								</span>
							</SelectTrigger>
							<SelectContent>
								<SelectItem 
									value="all" 
									selected={filterStatus === 'all'}
									onclick={() => filterStatus = 'all'}
								>
									All Status
								</SelectItem>
								<SelectItem 
									value="OPEN" 
									selected={filterStatus === 'OPEN'}
									onclick={() => filterStatus = 'OPEN'}
								>
									Open
								</SelectItem>
								<SelectItem 
									value="RESOLVED" 
									selected={filterStatus === 'RESOLVED'}
									onclick={() => filterStatus = 'RESOLVED'}
								>
									Resolved
								</SelectItem>
								<SelectItem 
									value="CLOSED" 
									selected={filterStatus === 'CLOSED'}
									onclick={() => filterStatus = 'CLOSED'}
								>
									Closed
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</CardHeader>
				<CardContent class="p-0">
					{#if filteredConversations.length === 0}
						<div class="p-4 text-center text-sm text-muted-foreground">
							<MessageSquare class="mx-auto size-8 text-muted-foreground/50 mb-2" />
							<p>No conversations</p>
						</div>
					{:else}
						<div class="divide-y divide-border">
							{#each filteredConversations as conversation}
								<div 
									class={`cursor-pointer p-3 transition-colors hover:bg-muted/50 ${selectedConversation === conversation.id ? 'bg-muted' : ''}`}
									onclick={() => selectedConversation = conversation.id}
								>
									<div class="flex items-start justify-between">
										<div class="flex-1 min-w-0">
											<p class="text-sm font-medium truncate">{conversation.studentName}</p>
											<p class="text-xs text-muted-foreground truncate">{conversation.subject}</p>
										</div>
										<Badge variant={getStatusBadge(conversation.status).variant} class="text-xs shrink-0 ml-2">
											{getStatusBadge(conversation.status).label}
										</Badge>
									</div>
									<div class="flex items-center gap-2 mt-1">
										<Clock class="size-3 text-muted-foreground" />
										<span class="text-xs text-muted-foreground">
											{getTimeAgo(conversation.lastMessageAt)}
										</span>
										{#if conversation.unreadCount > 0}
											<Badge variant="destructive" class="text-xs">
												{conversation.unreadCount}
											</Badge>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</CardContent>
			</Card>

			<!-- Message Thread -->
			<Card class="md:col-span-2">
				{#if currentConversation}
					<CardHeader class="pb-3 border-b">
						<div class="flex items-center justify-between">
							<div>
								<CardTitle class="text-base">{currentConversation.subject}</CardTitle>
								<CardDescription>
									With {currentConversation.studentName} • {currentConversation.studentMatric}
								</CardDescription>
							</div>
							<div class="flex gap-2">
								{#if currentConversation.status === 'OPEN'}
									<Button 
										variant="outline" 
										size="sm" 
										onclick={() => updateConversationStatus(currentConversation.id, 'RESOLVED')}
									>
										<CheckCircle class="mr-2 size-4" />
										Resolve
									</Button>
								{:else if currentConversation.status === 'RESOLVED'}
									<Button 
										variant="outline" 
										size="sm" 
										onclick={() => updateConversationStatus(currentConversation.id, 'OPEN')}
									>
										<Reply class="mr-2 size-4" />
										Reopen
									</Button>
								{/if}
								<Button 
									variant="ghost" 
									size="sm" 
									onclick={() => updateConversationStatus(currentConversation.id, 'CLOSED')}
								>
									<X class="size-4" />
								</Button>
							</div>
						</div>
					</CardHeader>
					<CardContent class="p-4">
						<!-- Messages -->
						<div class="space-y-4 max-h-[400px] overflow-y-auto">
							{#if currentConversation.messages?.length === 0}
								<div class="text-center py-8 text-muted-foreground">
									<MessageSquare class="mx-auto size-8 text-muted-foreground/50 mb-2" />
									<p>No messages yet</p>
								</div>
							{:else}
								{#each currentConversation.messages as message}
									<div class={`flex ${message.senderType === 'staff' ? 'justify-end' : 'justify-start'}`}>
										<div class={`max-w-[80%] rounded-lg p-3 ${message.senderType === 'staff' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
											<p class="text-sm">{message.body}</p>
											<p class="text-xs opacity-70 mt-1">
												{getTimeAgo(message.createdAt)}
												{#if message.senderType === 'staff'}
													<span class="ml-2">• You</span>
												{/if}
											</p>
										</div>
									</div>
								{/each}
							{/if}
						</div>

						<!-- Reply Input -->
						<div class="mt-4 flex gap-2">
							<Textarea
								bind:value={newMessage}
								placeholder="Type your reply..."
								class="flex-1 resize-none"
								rows={2}
								onkeydown={(e) => {
									if (e.key === 'Enter' && !e.shiftKey) {
										e.preventDefault();
										sendMessage();
									}
								}}
							/>
							<Button 
								onclick={sendMessage} 
								disabled={!newMessage.trim() || isSending}
								class="self-end"
							>
								{#if isSending}
									<LoaderCircle class="size-4 animate-spin" />
								{:else}
									<Send class="size-4" />
								{/if}
							</Button>
						</div>
					</CardContent>
				{:else}
					<div class="flex flex-col items-center justify-center h-[400px]">
						<MessageSquare class="size-16 text-muted-foreground/30 mb-4" />
						<h3 class="text-lg font-semibold">Select a conversation</h3>
						<p class="text-sm text-muted-foreground">
							Choose a conversation from the list to view messages
						</p>
					</div>
				{/if}
			</Card>
		</div>

		<!-- ─── Footer Stats ────────────────────────────────────────────────── -->
		{#if filteredConversations.length > 0}
			<Card class="mt-6 bg-muted/30 border-border">
				<CardContent class="py-4">
					<div class="flex flex-wrap items-center justify-between gap-4 text-sm">
						<span class="text-muted-foreground">
							Showing <strong class="text-foreground">{filteredConversations.length}</strong> of <strong class="text-foreground">{conversations.length}</strong> conversations
						</span>
						<div class="flex items-center gap-4">
							<span class="flex items-center gap-1">
								<MessageSquare class="size-4 text-green-500" />
								{filteredConversations.filter(c => c.status === 'OPEN').length} Open
							</span>
							<span class="flex items-center gap-1">
								<CheckCircle class="size-4 text-blue-500" />
								{filteredConversations.filter(c => c.status === 'RESOLVED').length} Resolved
							</span>
							<span class="flex items-center gap-1">
								<X class="size-4 text-gray-500" />
								{filteredConversations.filter(c => c.status === 'CLOSED').length} Closed
							</span>
						</div>
					</div>
				</CardContent>
			</Card>
		{/if}
	{/if}
</div>