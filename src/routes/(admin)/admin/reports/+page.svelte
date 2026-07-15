<!-- src/routes/(admin)/admin/reports/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow,
	} from '$lib/components/ui/table/index.js';
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import {
		FileText,
		Users,
		BookOpen,
		ClipboardList,
		GraduationCap,
		Download,
		AlertCircle,
		Shield,
	} from '@lucide/svelte/icons';

	let { data } = $props();

	const reports = data?.reports || {}

	function getStatusColor(status: string) {
		const colors: Record<string, string> = {
			ACTIVE: 'text-green-500',
			INACTIVE: 'text-yellow-500',
			PENDING: 'text-blue-500',
			APPROVED: 'text-green-500',
			REJECTED: 'text-red-500',
			CANCELLED: 'text-red-500',
			DRAFT: 'text-gray-500',
			PUBLISHED: 'text-blue-500',
			SCHEDULED: 'text-yellow-500',
			ENDED: 'text-purple-500',
			COMPLETED: 'text-green-500',
			DISCONTINUED: 'text-red-500',
			GRADUATED: 'text-purple-500',
			SUSPENDED: 'text-red-500',
			WITHDRAWN: 'text-gray-500',
			RETIRED: 'text-gray-500',
		}
		return colors[status] || 'text-gray-500'
	}
</script>

<svelte:head>
	<title>Reports — EAPS</title>
</svelte:head>

<Topbar title="Reports" description="View and export system reports">
	{#snippet actions()}
		<Button variant="outline" size="sm">
			<Download class="mr-2 size-4" />
			Export All
		</Button>
	{/snippet}
</Topbar>

<main class="flex flex-1 flex-col gap-6 p-6">
	{#if data?.error}
		<Alert variant="destructive">
			<AlertCircle class="size-4" />
			<AlertDescription>{data.error}</AlertDescription>
		</Alert>
	{:else}
		<Tabs defaultValue="students" class="space-y-4">
			<TabsList>
				<TabsTrigger value="students">Students</TabsTrigger>
				<TabsTrigger value="courses">Courses</TabsTrigger>
				<TabsTrigger value="assessments">Assessments</TabsTrigger>
				<TabsTrigger value="registrations">Registrations</TabsTrigger>
				<TabsTrigger value="staff">Staff</TabsTrigger>
			</TabsList>

			<!-- Students Report -->
			<TabsContent value="students">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Users class="size-4" />
							Student Report
						</CardTitle>
						<CardDescription>Student distribution by status and department</CardDescription>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Department</TableHead>
									<TableHead>Status</TableHead>
									<TableHead class="text-right">Count</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#each reports?.students || [] as item}
									<TableRow>
										<TableCell>{item.departmentId || 'N/A'}</TableCell>
										<TableCell>
											<Badge variant="outline" class={getStatusColor(item.status)}>
												{item.status}
											</Badge>
										</TableCell>
										<TableCell class="text-right font-bold">{item._count.status}</TableCell>
									</TableRow>
								{:else}
									<TableRow>
										<TableCell colspan="3" class="text-center text-muted-foreground py-8">
											No student data available
										</TableCell>
									</TableRow>
								{/each}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			</TabsContent>

			<!-- Courses Report -->
			<TabsContent value="courses">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<BookOpen class="size-4" />
							Course Report
						</CardTitle>
						<CardDescription>Course distribution by status, type, and level</CardDescription>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Level</TableHead>
									<TableHead>Type</TableHead>
									<TableHead>Status</TableHead>
									<TableHead class="text-right">Count</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#each reports?.courses || [] as item}
									<TableRow>
										<TableCell>{item.levelId || 'N/A'}</TableCell>
										<TableCell>
											<Badge variant="outline">{item.type}</Badge>
										</TableCell>
										<TableCell>
											<Badge variant="outline" class={getStatusColor(item.status)}>
												{item.status}
											</Badge>
										</TableCell>
										<TableCell class="text-right font-bold">{item._count.status}</TableCell>
									</TableRow>
								{:else}
									<TableRow>
										<TableCell colspan="4" class="text-center text-muted-foreground py-8">
											No course data available
										</TableCell>
									</TableRow>
								{/each}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			</TabsContent>

			<!-- Assessments Report -->
			<TabsContent value="assessments">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<ClipboardList class="size-4" />
							Assessment Report
						</CardTitle>
						<CardDescription>Assessment distribution by status and type</CardDescription>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Type</TableHead>
									<TableHead>Status</TableHead>
									<TableHead class="text-right">Count</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#each reports?.assessments || [] as item}
									<TableRow>
										<TableCell>
											<Badge variant="outline">{item.type}</Badge>
										</TableCell>
										<TableCell>
											<Badge variant="outline" class={getStatusColor(item.status)}>
												{item.status}
											</Badge>
										</TableCell>
										<TableCell class="text-right font-bold">{item._count.status}</TableCell>
									</TableRow>
								{:else}
									<TableRow>
										<TableCell colspan="3" class="text-center text-muted-foreground py-8">
											No assessment data available
										</TableCell>
									</TableRow>
								{/each}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			</TabsContent>

			<!-- Registrations Report -->
			<TabsContent value="registrations">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<FileText class="size-4" />
							Registration Report
						</CardTitle>
						<CardDescription>Registration distribution by status and type</CardDescription>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Type</TableHead>
									<TableHead>Status</TableHead>
									<TableHead class="text-right">Count</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#each reports?.registrations || [] as item}
									<TableRow>
										<TableCell>
											<Badge variant="outline">{item.type}</Badge>
										</TableCell>
										<TableCell>
											<Badge variant="outline" class={getStatusColor(item.status)}>
												{item.status}
											</Badge>
										</TableCell>
										<TableCell class="text-right font-bold">{item._count.status}</TableCell>
									</TableRow>
								{:else}
									<TableRow>
										<TableCell colspan="3" class="text-center text-muted-foreground py-8">
											No registration data available
										</TableCell>
									</TableRow>
								{/each}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			</TabsContent>

			<!-- Staff Report -->
			<TabsContent value="staff">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<GraduationCap class="size-4" />
							Staff Report
						</CardTitle>
						<CardDescription>Staff distribution by role and status</CardDescription>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Role</TableHead>
									<TableHead>Status</TableHead>
									<TableHead class="text-right">Count</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#each reports?.staff || [] as item}
									<TableRow>
										<TableCell>
											<Badge variant="outline">{item.primaryRole.replace(/_/g, ' ')}</Badge>
										</TableCell>
										<TableCell>
											<Badge variant="outline" class={getStatusColor(item.status)}>
												{item.status}
											</Badge>
										</TableCell>
										<TableCell class="text-right font-bold">{item._count.primaryRole}</TableCell>
									</TableRow>
								{:else}
									<TableRow>
										<TableCell colspan="3" class="text-center text-muted-foreground py-8">
											No staff data available
										</TableCell>
									</TableRow>
								{/each}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			</TabsContent>
		</Tabs>
	{/if}
</main>