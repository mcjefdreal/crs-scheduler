<script lang="ts">
	import { onMount } from 'svelte';
	import { parseCRSHtml, generateSchedules, db, sectionScore, type Course, type Schedule, type Section } from '$lib';
	import TimelineGrid from '$lib/components/TimelineGrid.svelte';

	let courses = $state<Course[]>([]);
	let htmlInput = $state('');
	let courseName = $state('');
	let sourceUrl = $state('');
	let isGenerating = $state(false);
	let schedules = $state<Schedule[]>([]);
	let parseError = $state<string | null>(null);
	let expandedSchedule = $state<number | null>(null);
	let showInstructions = $state(false);
	let showExcluded = $state(false);

	const excludedSections = $derived(
		courses.flatMap((c) => c.sections.filter((s) => s.excluded).map((s) => ({ ...s, courseName: c.name, courseId: c.id })))
	);
	const totalExcluded = $derived(excludedSections.length);

	onMount(async () => {
		courses = await db.courses.toArray();
	});

	const totalSections = $derived(courses.reduce((sum, c) => sum + c.sections.length, 0));
	const canGenerate = $derived(courses.length > 0 && !isGenerating);

	function sanitizeCourseId(name: string) {
		return name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '');
	}

	async function addCourse() {
		parseError = null;
		const name = courseName.trim();
		const html = htmlInput.trim();
		if (!name) {
			parseError = 'Enter a course name.';
			return;
		}
		if (!html) {
			parseError = 'Paste the CRS HTML first.';
			return;
		}

		try {
			const sections = parseCRSHtml(html);
			if (sections.length === 0) {
				parseError = 'No valid sections found. Make sure you pasted the full table HTML from CRS.';
				return;
			}

			const id = `${sanitizeCourseId(name)}-${Date.now()}`;
			const course: Course = {
				id,
				name,
				sections,
				sourceUrl: sourceUrl.trim(),
				scrapedAt: Date.now()
			};

			await db.courses.put(course);
			courses = await db.courses.toArray();
			schedules = [];
			expandedSchedule = null;
			htmlInput = '';
			courseName = '';
			sourceUrl = '';
		} catch (err) {
			parseError = err instanceof Error ? err.message : 'Failed to parse CRS HTML.';
		}
	}

	async function removeCourse(id: string) {
		await db.courses.delete(id);
		courses = await db.courses.toArray();
		schedules = [];
		expandedSchedule = null;
	}

	async function handleGenerate() {
		if (!canGenerate) return;
		isGenerating = true;
		schedules = [];
		expandedSchedule = null;
		await new Promise((resolve) => setTimeout(resolve, 0));
		schedules = generateSchedules(courses);
		isGenerating = false;
	}

	function formatTime(min: number) {
		const h = Math.floor(min / 60);
		const m = min % 60;
		const ampm = h >= 12 ? 'PM' : 'AM';
		const h12 = h % 12 || 12;
		return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
	}

	function slotsLeft(section: Section) {
		return section.slotsLeft;
	}

	function findCourseForSection(crn: number): { course: Course; section: Section } | null {
		for (const c of courses) {
			const s = c.sections.find((s) => s.crn === crn);
			if (s) return { course: c, section: s };
		}
		return null;
	}

	async function toggleSectionExclusion(courseId: string, crn: number, exclude: boolean) {
		const course = courses.find((c) => c.id === courseId);
		if (!course) return;
		const section = course.sections.find((s) => s.crn === crn);
		if (!section) return;
		section.excluded = exclude;
		await db.courses.put(course);
		courses = await db.courses.toArray();
		schedules = [];
		expandedSchedule = null;
	}
</script>

<svelte:head>
	<title>CRS Scheduler</title>
	<meta name="description" content="Generate conflict-free UPD CRS class schedules." />
</svelte:head>

<main class="flex min-h-screen flex-col">
	<header class="border-b border-slate-200 bg-white">
		<div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
			<div class="flex items-center gap-3">
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
					<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
					</svg>
				</div>
				<h1 class="text-xl font-semibold tracking-tight text-slate-900">CRS Scheduler</h1>
			</div>
			<button
				onclick={() => showInstructions = true}
				class="text-sm font-medium text-slate-500 hover:text-blue-600"
			>
				Instructions
			</button>
		</div>
	</header>

	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<div class="grid gap-8 lg:grid-cols-[360px_1fr]">
			<!-- Input panel -->
			<aside class="space-y-6">
				<section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
					<h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Add Course</h2>
					<div class="space-y-4">
						<div>
							<label for="course-name" class="mb-1 block text-sm font-medium text-slate-700">Course name</label>
							<input
								id="course-name"
								type="text"
								bind:value={courseName}
								placeholder="e.g. Eng 13"
								class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500/20 transition focus:border-blue-500 focus:ring-4"
							/>
						</div>
						<div>
							<label for="source-url" class="mb-1 block text-sm font-medium text-slate-700">Source URL</label>
							<input
								id="source-url"
								type="url"
								bind:value={sourceUrl}
								placeholder="https://crs.upd.edu.ph/..."
								class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500/20 transition focus:border-blue-500 focus:ring-4"
							/>
						</div>
						<div>
							<label for="crs-html" class="mb-1 block text-sm font-medium text-slate-700">CRS table HTML</label>
							<textarea
								id="crs-html"
								bind:value={htmlInput}
								rows="10"
								placeholder="Paste the raw HTML of the CRS course table here..."
								class="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs leading-relaxed outline-none ring-blue-500/20 transition focus:border-blue-500 focus:ring-4"
							></textarea>
						</div>
						{#if parseError}
							<div class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
								<p class="font-medium">Parse error</p>
								<p class="mt-1">{parseError}</p>
							</div>
						{/if}
						<button
							onclick={addCourse}
							class="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800"
						>
							Add Course
						</button>
					</div>
				</section>

				<section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
					<div class="mb-4 flex items-center justify-between">
						<h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Courses</h2>
						<span class="text-xs text-slate-500">{courses.length} course{courses.length === 1 ? '' : 's'} • {totalSections} section{totalSections === 1 ? '' : 's'}</span>
					</div>

					{#if courses.length === 0}
						<div class="rounded-lg border border-dashed border-slate-300 bg-slate-50 py-8 text-center">
							<p class="text-sm font-medium text-slate-500">Add courses to get started</p>
							<p class="mt-1 text-xs text-slate-400">Paste CRS HTML and click Add Course.</p>
						</div>
					{:else}
						<ul class="space-y-2">
							{#each courses as course}
								<li class="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
									<div>
										<p class="text-sm font-medium text-slate-800">{course.name}</p>
										<p class="text-xs text-slate-500">{course.sections.length} section{course.sections.length === 1 ? '' : 's'}
											{#if course.sections.some((s) => s.restrictions)}
												<span class="text-amber-700">
													• {course.sections.filter((s) => s.restrictions).length} section{course.sections.filter((s) => s.restrictions).length === 1 ? '' : 's'} restricted
												</span>
											{/if}
										</p>
									</div>
									<button
										onclick={() => removeCourse(course.id)}
										class="rounded-md p-1.5 text-slate-400 hover:bg-red-100 hover:text-red-600"
										aria-label="Remove {course.name}"
									>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
										</svg>
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				</section>

				<button
					onclick={handleGenerate}
					disabled={!canGenerate}
					class="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#if isGenerating}
						<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
						</svg>
						<span>Generating...</span>
					{:else}
						<span>Generate Schedules</span>
					{/if}
				</button>

				{#if totalExcluded > 0}
					<section class="rounded-xl border border-amber-200 bg-amber-50 p-5">
						<div class="mb-3 flex items-center justify-between">
							<h2 class="text-sm font-semibold uppercase tracking-wide text-amber-700">
								Excluded ({totalExcluded})
							</h2>
							<button
								onclick={() => (showExcluded = !showExcluded)}
								class="text-xs font-medium text-amber-700 hover:text-amber-900"
							>
								{showExcluded ? 'Hide' : 'Show'}
							</button>
						</div>
						{#if showExcluded}
							<ul class="max-h-64 space-y-1 overflow-y-auto">
								{#each excludedSections as section}
									<li class="flex items-center justify-between rounded border border-amber-200 bg-white px-2 py-1.5 text-xs">
										<div class="min-w-0 flex-1">
											<p class="truncate font-medium text-slate-800">{section.code}</p>
											<p class="truncate text-slate-500">{section.restrictions || 'No details'}</p>
										</div>
										<button
											onclick={async () => { await toggleSectionExclusion(section.courseId, section.crn, false); }}
											class="ml-2 shrink-0 rounded bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-emerald-700"
										>
											Include
										</button>
									</li>
								{/each}
							</ul>
						{/if}
					</section>
				{/if}
			</aside>

			<!-- Results panel -->
			<section class="space-y-6">
				{#if schedules.length === 0}
					<div class="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-center">
						<p class="text-sm font-medium text-slate-500">Click Generate to see schedules</p>
						<p class="mt-1 max-w-xs text-xs text-slate-400">Add all your courses first, then run the scheduler to find conflict-free combinations.</p>
					</div>
				{:else}
					<div class="mb-2 flex items-center justify-between">
						<h2 class="text-lg font-semibold text-slate-900">Top schedules</h2>
						<span class="text-sm text-slate-500">{schedules.length} result{schedules.length === 1 ? '' : 's'}</span>
					</div>

					<div class="space-y-6">
						{#each schedules as schedule, idx}
							<article class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
								<div class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
									<div class="flex items-center gap-3">
										<span class="text-sm font-semibold text-slate-500">#{idx + 1}</span>
										<div class="flex items-center gap-2">
											<span class="text-sm font-medium text-slate-700">Score</span>
											<div class="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
												<div
													class="h-full rounded-full bg-blue-600"
													style="width: {Math.min(100, Math.max(0, schedule.score * 10))}%"
												></div>
											</div>
											<span class="text-sm font-semibold text-slate-900">{schedule.score.toFixed(2)}</span>
										</div>
									</div>
									<button
										onclick={() => expandedSchedule = expandedSchedule === idx ? null : idx}
										class="text-sm font-medium text-blue-600 hover:text-blue-700"
									>
										{expandedSchedule === idx ? 'Hide details' : 'Show details'}
									</button>
								</div>

								<div class="p-5">
									<TimelineGrid sections={schedule.sections} />
								</div>

								{#if expandedSchedule === idx}
									<div class="border-t border-slate-200 px-5 py-4">
										<h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Sections</h3>
										<div class="grid gap-3 sm:grid-cols-2">
											{#each schedule.sections as section}
												<div class="rounded-lg border border-slate-200 p-3">
													<div class="flex items-start justify-between">
														<div>
															<p class="text-sm font-semibold text-slate-900">{section.code}</p>
															<p class="text-xs text-slate-500">CRN {section.crn}</p>
														</div>
														<div class="flex items-center gap-2">
															<span class="text-xs font-semibold text-blue-700">{sectionScore(section).toFixed(2)}</span>
															<button
																onclick={async () => {
																	const found = findCourseForSection(section.crn);
																	if (found) await toggleSectionExclusion(found.course.id, section.crn, true);
																}}
																class="rounded border border-red-200 px-1.5 py-0.5 text-[10px] font-medium text-red-600 hover:bg-red-50"
																title="Exclude this section from scheduling"
															>
																Exclude
															</button>
														</div>
													</div>
													<div class="mt-2 space-y-1 text-xs text-slate-600">
														<p>{section.instructor}</p>
														<p>
															{#each section.meetings as meeting, mIdx}
																{mIdx > 0 ? '; ' : ''}
																{meeting.days.map((d) => ['M', 'T', 'W', 'H', 'F', 'S'][d]).join('')}
																 {formatTime(meeting.startMin)}–{formatTime(meeting.endMin)} {meeting.type.toUpperCase()} {meeting.room}
															{/each}
														</p>
														<p class="flex gap-2">
															<span class={slotsLeft(section) > 0 ? 'text-emerald-600' : 'text-red-600'}>
																{slotsLeft(section)} slot{slotsLeft(section) === 1 ? '' : 's'} left
															</span>
															<span class="text-slate-400">•</span>
															<span>Demand: {section.demand}</span>
														</p>
														{#if section.restrictions}
															<p class="rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
																Restricted: {section.restrictions}
															</p>
														{/if}
													</div>
												</div>
											{/each}
										</div>
									</div>
								{/if}
							</article>
						{/each}
					</div>
				{/if}
			</section>
		</div>
	</div>

	<footer class="border-t border-slate-200 bg-white">
		<div class="mx-auto max-w-7xl px-4 py-6 text-center text-xs text-slate-500 sm:px-6 lg:px-8">
			<p>
				CRS Scheduler — built for University of the Philippines Diliman students.
				<button onclick={() => showInstructions = true} class="font-medium text-blue-600 hover:underline">How to use</button>
			</p>
		</div>
	</footer>

	{#if showInstructions}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
			onclick={() => showInstructions = false}
			role="dialog"
			aria-modal="true"
		>
			<div
				class="max-w-md rounded-xl bg-white p-6 shadow-xl"
				onclick={(e) => e.stopPropagation()}
			>
				<h3 class="mb-2 text-lg font-semibold text-slate-900">How to use</h3>
				<ol class="list-decimal space-y-2 pl-5 text-sm text-slate-600">
					<li>Open the CRS portal and view a course's section table.</li>
					<li>Copy the full HTML of the table (right-click → Inspect → copy the <code>&lt;table&gt;</code> element).</li>
					<li>Paste it into the CRS table HTML field, give the course a name, and click Add Course.</li>
					<li>Repeat for every course you want to schedule.</li>
					<li>Click Generate Schedules to see conflict-free combinations ranked by enrollment chance.</li>
				</ol>
				<button
					onclick={() => showInstructions = false}
					class="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
				>
					Got it
				</button>
			</div>
		</div>
	{/if}
</main>
