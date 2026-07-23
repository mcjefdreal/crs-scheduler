<script lang="ts">
	import { onMount } from 'svelte';
	import {
		parseCRSHtml,
		generateSchedules,
		db,
		sectionScore,
		type Course,
		type Schedule,
		type ScheduleResult,
		type Section,
		type ScheduleOptions
	} from '$lib';
	import TimelineGrid from '$lib/components/TimelineGrid.svelte';
	import ScheduleCompare from '$lib/components/ScheduleCompare.svelte';
	import RefreshDiff from '$lib/components/RefreshDiff.svelte';
	import Pe2Monitor from '$lib/components/Pe2Monitor.svelte';

	let courses = $state<Course[]>([]);
	let courseName = $state('');
	let sourceUrl = $state('');
	let isGenerating = $state(false);
	let schedules = $state<Schedule[]>([]);
	let lockedConflict = $state(false);
	let expandedSchedule = $state<number | null>(null);
	let showInstructions = $state(false);
	let showExcluded = $state(false);
	let showZeroSlot = $state(false);

	let isFetching = $state(false);
	let fetchError = $state<string | null>(null);
	let fetchSuccess = $state('');
	let fetchProgress = $state('');
	let earliestStartMin = $state<number | undefined>(undefined);
	let refreshProgress = $state('');
	let selectedForCompare = $state<number[]>([]);
	let showCompare = $state(false);

	let minGapMinutes = $state<number | undefined>(undefined);
	let daysOff = $state<number[]>([]);
	let excludedInstructors = $state<string[]>([]);
	let newInstructor = $state('');
	let lockedCrns = $state<number[]>([]);
	let scheduleFilter = $state('');
	let showDiff = $state(false);
	let diffData = $state<{
		added: Array<{ crn: number; code: string; courseName: string }>;
		removed: Array<{ crn: number; code: string; courseName: string }>;
		changed: Array<{
			crn: number;
			code: string;
			courseName: string;
			slotsLeft: number;
			oldSlotsLeft: number;
			capacity: number;
			oldCapacity: number;
		}>;
	}>({ added: [], removed: [], changed: [] });

	const excludedSections = $derived(
		courses.flatMap((c) =>
			c.sections
				.filter((s) => s.excluded)
				.map((s) => ({ ...s, courseName: c.name, courseId: c.id }))
		)
	);
	const totalExcluded = $derived(excludedSections.length);

	const zeroSlotSections = $derived(
		courses.flatMap((c) =>
			c.sections
				.filter((s) => s.slotsLeft === 0 && !s.excluded)
				.map((s) => ({ ...s, courseName: c.name, courseId: c.id }))
		)
	);
	const totalZeroSlot = $derived(zeroSlotSections.length);

	async function saveCoursePriority(courseId: string, priority: number) {
		await db.courses.update(courseId, { priority });
		courses = await db.courses.toArray();
	}

	onMount(async () => {
		courses = await db.courses.toArray();
		loadPrefs();
	});

	const totalSections = $derived(courses.reduce((sum, c) => sum + c.sections.length, 0));
	const canGenerate = $derived(courses.length > 0 && !isGenerating);

	const filteredSchedules = $derived(
		scheduleFilter.trim()
			? schedules.filter((s) =>
					s.sections.some(
						(sec) =>
							sec.instructor.toLowerCase().includes(scheduleFilter.toLowerCase()) ||
							sec.code.toLowerCase().includes(scheduleFilter.toLowerCase()) ||
							String(sec.crn).includes(scheduleFilter)
					)
				)
			: schedules
	);


	function loadPrefs() {
		const stored = localStorage.getItem('showExcluded');
		if (stored === 'true') showExcluded = true;
		const earliest = localStorage.getItem('earliestStartMin');
		if (earliest && earliest !== 'undefined') earliestStartMin = parseInt(earliest);
		const gap = localStorage.getItem('minGapMinutes');
		if (gap && gap !== 'undefined') minGapMinutes = parseInt(gap);
		const off = localStorage.getItem('daysOff');
		if (off) {
			try {
				daysOff = JSON.parse(off);
			} catch {
				daysOff = [];
			}
		}
		const excl = localStorage.getItem('excludedInstructors');
		if (excl) {
			try {
				excludedInstructors = JSON.parse(excl);
			} catch {
				excludedInstructors = [];
			}
		}
		const locked = localStorage.getItem('lockedCrns');
		if (locked) {
			try {
				lockedCrns = JSON.parse(locked);
			} catch {
				lockedCrns = [];
			}
		}
		const zs = localStorage.getItem('showZeroSlot');
		if (zs === 'true') showZeroSlot = true;
	}

	function saveShowExcluded(v: boolean) {
		showExcluded = v;
		localStorage.setItem('showExcluded', String(v));
	}

	function saveShowZeroSlot(v: boolean) {
		showZeroSlot = v;
		localStorage.setItem('showZeroSlot', String(v));
	}

	function saveEarliestStartMin() {
		if (earliestStartMin !== undefined) {
			localStorage.setItem('earliestStartMin', String(earliestStartMin));
		} else {
			localStorage.removeItem('earliestStartMin');
		}
	}

	function saveMinGapMinutes() {
		if (minGapMinutes !== undefined) {
			localStorage.setItem('minGapMinutes', String(minGapMinutes));
		} else {
			localStorage.removeItem('minGapMinutes');
		}
	}

	function saveDaysOff() {
		localStorage.setItem('daysOff', JSON.stringify(daysOff));
	}

	function saveExcludedInstructors() {
		localStorage.setItem('excludedInstructors', JSON.stringify(excludedInstructors));
	}

	function saveLockedCrns() {
		localStorage.setItem('lockedCrns', JSON.stringify(lockedCrns));
	}

	function toggleLock(crn: number) {
		lockedCrns = lockedCrns.includes(crn)
			? lockedCrns.filter((c) => c !== crn)
			: [...lockedCrns, crn];
		saveLockedCrns();
	}

	function clearLocks() {
		lockedCrns = [];
		saveLockedCrns();
	}

	function addInstructor() {
		const name = newInstructor.trim();
		if (name && !excludedInstructors.includes(name)) {
			excludedInstructors = [...excludedInstructors, name];
			saveExcludedInstructors();
		}
		newInstructor = '';
	}

	function removeInstructor(name: string) {
		excludedInstructors = excludedInstructors.filter((i) => i !== name);
		saveExcludedInstructors();
	}

	function toggleDayOff(day: number) {
		daysOff = daysOff.includes(day) ? daysOff.filter((d) => d !== day) : [...daysOff, day];
		saveDaysOff();
	}

	function sanitizeCourseId(name: string) {
		return name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '');
	}


	async function removeCourse(id: string) {
		await db.courses.delete(id);
		courses = await db.courses.toArray();
		schedules = [];
		lockedConflict = false;
		expandedSchedule = null;
		selectedForCompare = [];
		showCompare = false;
	}

	async function handleGenerate() {
		if (!canGenerate) return;
		isGenerating = true;
		lockedConflict = false;
		schedules = [];
		expandedSchedule = null;
		selectedForCompare = [];
		showCompare = false;
		await new Promise((resolve) => setTimeout(resolve, 0));
		const opts: ScheduleOptions = {
			earliestStartMin,
			minGapMinutes,
			daysOff: daysOff.length > 0 ? daysOff : undefined,
			lockedCrns: lockedCrns.length > 0 ? lockedCrns : undefined,
			excludedInstructors: excludedInstructors.length > 0 ? excludedInstructors : undefined,
			includeZeroSlot: showZeroSlot
		};
		const result: ScheduleResult = generateSchedules(courses, opts);
		schedules = result.schedules;
		lockedConflict = result.lockedConflict ?? false;
		if (result.lockedConflict) {
			// shown as alert in template
		}
		isGenerating = false;
	}

	async function fetchFromCrs() {
		fetchError = null;
		fetchSuccess = '';
		fetchProgress = '';
		isFetching = true;

		const names = courseName
			.trim()
			.split(',')
			.map((n) => n.trim())
			.filter(Boolean);
		if (names.length === 0) {
			fetchError = 'Enter at least one course name.';
			isFetching = false;
			return;
		}

		try {
			if (sourceUrl.trim()) {
				// Single URL mode
				fetchProgress = 'Fetching...';
				const res = await fetch('/api/fetch-crs', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ url: sourceUrl.trim() })
				});
				if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
				const data = await res.json();
				const sections = parseCRSHtml(data.html);

				for (const name of names) {
					const matched = sections.filter((s) => {
						const parts = s.code.split(/\s+/);
						const prefix = parts.slice(0, name.split(/\s+/).length).join(' ');
						return prefix.toLowerCase() === name.toLowerCase();
					});
					if (matched.length > 0) {
						const id = `${sanitizeCourseId(name)}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
						const course: Course = {
							id,
							name,
							sections: matched,
							sourceUrl: sourceUrl.trim(),
							scrapedAt: Date.now(),
							priority: 0
						};
						await db.courses.put(course);
						fetchSuccess += `${name}: ${matched.length} sections loaded. `;
					} else {
						fetchSuccess += `${name}: No sections found. `;
					}
				}
			} else {
				// Batch mode
				fetchProgress = 'Preparing batch fetch...';
				const letters = [...new Set(names.map((n) => n.trim()[0]?.toUpperCase()).filter(Boolean))];
				const urls = letters.map((l) => `https://crs.upd.edu.ph/schedule/120261/${l}`);

				const results = await Promise.allSettled(
					urls.map((url) =>
						fetch('/api/fetch-crs', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ url })
						}).then((r) => {
							if (!r.ok) throw new Error(`HTTP ${r.status}`);
							return r.json();
						})
					)
				);

				let allSections: Section[] = [];
				for (const [i, result] of results.entries()) {
					if (result.status === 'fulfilled') {
						const parsed = parseCRSHtml(result.value.html);
						allSections.push(...parsed);
					} else {
						fetchError = `Failed to fetch letter ${letters[i]}: ${result.reason?.message || 'Unknown error'}`;
					}
				}

				for (const name of names) {
					const matched = allSections.filter((s) => {
						const parts = s.code.split(/\s+/);
						const prefix = parts.slice(0, name.split(/\s+/).length).join(' ');
						return prefix.toLowerCase() === name.toLowerCase();
					});
					if (matched.length > 0) {
						const id = `${sanitizeCourseId(name)}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
						const course: Course = {
							id,
							name,
							sections: matched,
							sourceUrl: '',
							scrapedAt: Date.now(),
							priority: 0
						};
						await db.courses.put(course);
						fetchSuccess += `${name}: ${matched.length} sections loaded. `;
					} else {
						fetchSuccess += `${name}: No sections found. `;
					}
				}
			}

			courses = await db.courses.toArray();
			schedules = [];
			lockedConflict = false;
			expandedSchedule = null;
			selectedForCompare = [];
			showCompare = false;
			courseName = '';
			sourceUrl = '';
		} catch (err) {
			if (!fetchError)
				fetchError = err instanceof Error ? err.message : 'Failed to fetch from CRS.';
		}
		fetchProgress = '';
		isFetching = false;
	}

	async function refreshAllCourses() {
		if (isFetching || isGenerating) return;
		refreshProgress = 'Preparing...';
		fetchError = null;
		fetchSuccess = '';
		showDiff = false;

		const oldSections = new Map<
			number,
			{ code: string; courseName: string; slotsLeft: number; capacity: number }
		>();
		for (const course of courses) {
			for (const section of course.sections) {
				oldSections.set(section.crn, {
					code: section.code,
					courseName: course.name,
					slotsLeft: section.slotsLeft,
					capacity: section.capacity
				});
			}
		}

		const urlMap = new Map<string, string[]>();
		for (const course of courses) {
			if (course.sourceUrl) {
				const existing = urlMap.get(course.sourceUrl) || [];
				existing.push(course.name);
				urlMap.set(course.sourceUrl, existing);
			} else {
				const letter = course.name.trim()[0]?.toUpperCase();
				if (!letter) continue;
				const url = `https://crs.upd.edu.ph/schedule/120261/${letter}`;
				const existing = urlMap.get(url) || [];
				existing.push(course.name);
				urlMap.set(url, existing);
			}
		}

		let refreshed = 0;
		let failed = 0;
		const errors: string[] = [];

		for (const [url, courseNames] of urlMap) {
			refreshProgress = `Fetching ${url.split('/').pop()}...`;
			try {
				const res = await fetch('/api/fetch-crs', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ url })
				});
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const data = await res.json();
				const sections = parseCRSHtml(data.html);

				for (const name of courseNames) {
					const matched = sections.filter((s) => {
						const prefix = s.code.split(/\s+/).slice(0, 2).join(' ');
						return prefix.toLowerCase() === name.toLowerCase();
					});

					const existingCourse = courses.find((c) => c.name === name);
					if (existingCourse) {
						const merged = matched.map((newS) => {
							const old = existingCourse.sections.find((s) => s.crn === newS.crn);
							if (old) return { ...newS, excluded: old.excluded };
							return { ...newS, excluded: newS.excluded };
						});
						existingCourse.sections = merged;
						existingCourse.sourceUrl = url;
						existingCourse.scrapedAt = Date.now();
						await db.courses.put(JSON.parse(JSON.stringify(existingCourse)));
					}
					refreshed++;
				}
			} catch (err) {
				failed++;
				errors.push(
					`${url.split('/').pop()}: ${err instanceof Error ? err.message : 'Unknown error'}`
				);
			}
		}

		const newSections = new Map<
			number,
			{ code: string; courseName: string; slotsLeft: number; capacity: number }
		>();
		for (const course of courses) {
			for (const section of course.sections) {
				newSections.set(section.crn, {
					code: section.code,
					courseName: course.name,
					slotsLeft: section.slotsLeft,
					capacity: section.capacity
				});
			}
		}

		const added: Array<{ crn: number; code: string; courseName: string }> = [];
		const removed: Array<{ crn: number; code: string; courseName: string }> = [];
		const changed: Array<{
			crn: number;
			code: string;
			courseName: string;
			slotsLeft: number;
			oldSlotsLeft: number;
			capacity: number;
			oldCapacity: number;
		}> = [];

		for (const [crn, info] of newSections) {
			if (!oldSections.has(crn)) {
				added.push({ crn, code: info.code, courseName: info.courseName });
			} else {
				const old = oldSections.get(crn)!;
				if (info.slotsLeft !== old.slotsLeft || info.capacity !== old.capacity) {
					changed.push({
						crn,
						code: info.code,
						courseName: info.courseName,
						slotsLeft: info.slotsLeft,
						oldSlotsLeft: old.slotsLeft,
						capacity: info.capacity,
						oldCapacity: old.capacity
					});
				}
			}
		}
		for (const [crn, info] of oldSections) {
			if (!newSections.has(crn)) {
				removed.push({ crn, code: info.code, courseName: info.courseName });
			}
		}

		if (added.length > 0 || removed.length > 0 || changed.length > 0) {
			diffData = { added, removed, changed };
			showDiff = true;
		}

		courses = await db.courses.toArray();
		schedules = [];
		lockedConflict = false;
		expandedSchedule = null;
		selectedForCompare = [];
		showCompare = false;

		if (failed > 0) {
			refreshProgress = `Refreshed ${refreshed} course(s), ${failed} failed. ${errors.join('; ')}`;
		} else {
			refreshProgress = `All ${refreshed} course(s) refreshed.`;
		}

		setTimeout(() => {
			refreshProgress = '';
		}, 3000);
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
		await db.courses.put(JSON.parse(JSON.stringify(course)));
		courses = await db.courses.toArray();
		schedules = [];
		lockedConflict = false;
		expandedSchedule = null;
		selectedForCompare = [];
		showCompare = false;
	}
</script>

<svelte:head>
	<title>CRS Scheduler</title>
	<meta name="description" content="Generate conflict-free UPD CRS class schedules." />
</svelte:head>

<main class="flex min-h-screen flex-col">
	<header class="border-b border-slate-200 bg-white">
		<div class="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
			<div class="flex items-center gap-3">
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
					<svg
						class="h-5 w-5"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
						/>
					</svg>
				</div>
				<h1 class="text-xl font-semibold tracking-tight text-slate-900">CRS Scheduler</h1>
			</div>
			<button
				onclick={() => (showInstructions = true)}
				class="text-sm font-medium text-slate-500 hover:text-blue-600"
			>
				Instructions
			</button>
		</div>
	</header>

	<div class="mx-auto max-w-[95vw] px-4 py-8 sm:px-6 lg:px-8">
		<div class="grid gap-8 lg:grid-cols-[1fr_1fr_2fr]">
			<!-- Sidebar -->
			<section class="min-w-0 space-y-6">
				<!-- Courses section -->
				<section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
					<div class="mb-4 flex items-center justify-between">
						<h2 class="text-sm font-semibold tracking-wide text-slate-500 uppercase">Courses</h2>
						<div class="flex items-center gap-2">
							<button
								onclick={refreshAllCourses}
								disabled={isFetching || isGenerating}
								class="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:text-slate-400"
							>
								Refresh All
							</button>
							<span class="text-xs text-slate-500"
								>{courses.length} course{courses.length === 1 ? '' : 's'} • {totalSections} section{totalSections ===
								1
									? ''
									: 's'}</span
							>
						</div>
					</div>
					{#if refreshProgress}
						<div class="mb-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
							{refreshProgress}
						</div>
					{/if}
					{#if courses.length === 0}
						<div
							class="rounded-lg border border-dashed border-slate-300 bg-slate-50 py-8 text-center"
						>
							<p class="text-sm font-medium text-slate-500">Add courses to get started</p>
							<p class="mt-1 text-xs text-slate-400">Paste CRS HTML and click Add Course.</p>
						</div>
					{:else}
						<ul class="space-y-2">
							{#each courses as course}
								<li
									class="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
								>
									<div>
										<p class="text-sm font-medium text-slate-800">{course.name}</p>
										<p class="text-xs text-slate-500">
											{course.sections.length} section{course.sections.length === 1 ? '' : 's'}
											{#if course.sections.some((s) => s.restrictions)}
												<span class="text-amber-700">
													• {course.sections.filter((s) => s.restrictions).length} section{course.sections.filter(
														(s) => s.restrictions
													).length === 1
														? ''
														: 's'} restricted
												</span>
											{/if}
										</p>
									</div>
									<div class="flex items-center gap-2">
										<select
											value={course.priority ?? 0}
											onchange={async (e) => {
												const p = parseInt(e.currentTarget.value);
												course.priority = p;
												await saveCoursePriority(course.id, p);
											}}
											class="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 outline-none"
											aria-label="Priority for {course.name}"
										>
											<option value={0}>—</option>
											<option value={1}>P1 ↑</option>
											<option value={2}>P2</option>
											<option value={3}>P3</option>
											<option value={4}>P4</option>
											<option value={5}>P5 ↓</option>
										</select>
										<button
											onclick={() => removeCourse(course.id)}
											class="rounded-md p-1.5 text-slate-400 hover:bg-red-100 hover:text-red-600"
											aria-label="Remove {course.name}"
										>
											<svg
												class="h-4 w-4"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M6 18 18 6M6 6l12 12"
												/>
											</svg>
										</button>
									</div>
								</li>
							{/each}
						</ul>
					{/if}
				</section>

				<!-- PE 2 monitor -->
				<Pe2Monitor />

				<!-- Excluded section -->
				<section>
					{#if totalExcluded > 0}
						<section class="rounded-xl border border-amber-200 bg-amber-50 p-5">
							<div class="mb-3 flex items-center justify-between">
								<h2 class="text-sm font-semibold tracking-wide text-amber-700 uppercase">
									Excluded ({totalExcluded})
								</h2>
								<button
									onclick={() => saveShowExcluded(!showExcluded)}
									class="text-xs font-medium text-amber-700 hover:text-amber-900"
								>
									{showExcluded ? 'Hide' : 'Show'}
								</button>
							</div>
							{#if showExcluded}
								<ul class="max-h-64 space-y-1 overflow-y-auto">
									{#each excludedSections as section}
										<li
											class="flex items-center justify-between rounded border border-amber-200 bg-white px-2 py-1.5 text-xs {lockedCrns.includes(
												section.crn
											)
												? 'border-l-2 border-blue-300 bg-blue-50'
												: ''}"
										>
											<div class="min-w-0 flex-1">
												<p class="truncate font-medium text-slate-800">{section.code}</p>
												<p class="truncate text-slate-500">
													{section.courseName} • CRN {section.crn}
												</p>
												{#if section.restrictions}
													<p class="truncate text-amber-600">{section.restrictions}</p>
												{/if}
											</div>
											<div class="ml-2 flex shrink-0 items-center gap-1">
												<button
													onclick={() => toggleLock(section.crn)}
													class="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
													title={lockedCrns.includes(section.crn) ? 'Unlock' : 'Lock section'}
												>
													{#if lockedCrns.includes(section.crn)}
														<svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
															<path
																d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"
															/>
														</svg>
													{:else}
														<svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
															<path
																d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"
															/>
														</svg>
													{/if}
												</button>
												<button
													onclick={async () => {
														await toggleSectionExclusion(section.courseId, section.crn, false);
													}}
													class="rounded bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-emerald-700"
												>
													Include
												</button>
											</div>
										</li>
									{/each}
								</ul>
							{/if}
						</section>
					{/if}

				<!-- Zero-slot sections -->
				{#if totalZeroSlot > 0}
					<section class="mt-6 rounded-xl border border-purple-200 bg-purple-50 p-5">
						<div class="mb-3 flex items-center justify-between">
							<h2 class="text-sm font-semibold tracking-wide text-purple-700 uppercase">
								Zero Slots ({totalZeroSlot})
							</h2>
							<button
								onclick={() => saveShowZeroSlot(!showZeroSlot)}
								class="text-xs font-medium text-purple-700 hover:text-purple-900"
							>
								{showZeroSlot ? 'Hide' : 'Show'}
							</button>
						</div>
						<p class="mb-3 text-xs text-purple-600">
							Sections with 0 slots remaining. Toggle to include in schedule generation.
						</p>
						{#if showZeroSlot}
							<ul class="max-h-64 space-y-1 overflow-y-auto">
								{#each zeroSlotSections as section}
									<li
										class="flex items-center justify-between rounded border border-purple-200 bg-white px-2 py-1.5 text-xs {lockedCrns.includes(
											section.crn
										)
											? 'border-l-2 border-blue-300 bg-blue-50'
											: ''}"
									>
										<div class="min-w-0 flex-1">
											<p class="truncate font-medium text-slate-800">{section.code}</p>
											<p class="truncate text-slate-500">
												{section.courseName} • CRN {section.crn}
											</p>
											<p class="truncate text-slate-400">
												{section.slotsLeft}/{section.capacity} slots • Demand: {section.demand}
											</p>
											{#if section.restrictions}
												<p class="truncate text-purple-600">{section.restrictions}</p>
											{/if}
										</div>
										<div class="ml-2 flex shrink-0 items-center gap-1">
											<button
												onclick={() => toggleLock(section.crn)}
												class="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
												title={lockedCrns.includes(section.crn) ? 'Unlock' : 'Lock section'}
											>
												{#if lockedCrns.includes(section.crn)}
													<svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
														<path
															d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"
														/>
													</svg>
												{:else}
													<svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
														<path
															d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"
														/>
													</svg>
												{/if}
											</button>
										</div>
									</li>
								{/each}
							</ul>
						{/if}
					</section>
				{/if}
				</section>
			</section>
			<aside class="space-y-6">
				<!-- Add Course section -->
				<section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
					<h2 class="mb-4 text-sm font-semibold tracking-wide text-slate-500 uppercase">
						Add Course
					</h2>
					<div class="space-y-4">
						<div>
							<label for="course-name" class="mb-1 block text-sm font-medium text-slate-700"
								>Course name</label
							>
							<input
								id="course-name"
								type="text"
								bind:value={courseName}
								placeholder="e.g. Eng 13, CS 133, Math 21"
								class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm ring-blue-500/20 transition outline-none focus:border-blue-500 focus:ring-4"
							/>
							<p class="mt-1 text-xs text-slate-500">
								Separate multiple courses with commas for batch fetch
							</p>
						</div>
						<div>
							<div class="flex gap-2">
								<input
									id="source-url"
									type="url"
									bind:value={sourceUrl}
									placeholder="https://crs.upd.edu.ph/..."
									class="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm ring-blue-500/20 transition outline-none focus:border-blue-500 focus:ring-4"
								/>
								<button
									onclick={fetchFromCrs}
									disabled={isFetching}
									class="shrink-0 rounded-lg border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 active:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{isFetching ? fetchProgress || 'Fetching...' : 'Fetch'}
								</button>
							</div>
							{#if fetchError}
								<div
									class="mt-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
								>
									<p>{fetchError}</p>
								</div>
							{/if}
							{#if fetchSuccess}
								<div
									class="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
								>
									<p>{fetchSuccess}</p>
								</div>
							{/if}
						</div>




					</div>
				</section>

				<!-- Preferences section -->
				<section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
					<h2 class="mb-4 text-sm font-semibold tracking-wide text-slate-500 uppercase">
						Preferences
					</h2>
					<div>
						<label class="mb-1 block text-sm font-medium text-slate-700">Avoid classes before</label
						>
						<select
							bind:value={earliestStartMin}
							onchange={saveEarliestStartMin}
							class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm ring-blue-500/20 transition outline-none focus:border-blue-500 focus:ring-4"
						>
							<option value={undefined}>None</option>
							<option value={420}>7:00 AM</option>
							<option value={480}>8:00 AM</option>
							<option value={540}>9:00 AM</option>
							<option value={600}>10:00 AM</option>
						</select>
						<p class="mt-1 text-xs text-slate-500">
							Early classes get a score penalty. Only affects new schedule generation.
						</p>
					</div>

					<div>
						<label class="mb-1 block text-sm font-medium text-slate-700"
							>Minimum gap between classes</label
						>
						<input
							type="number"
							min="0"
							max="120"
							step="5"
							placeholder="Minutes"
							bind:value={minGapMinutes}
							onchange={saveMinGapMinutes}
							class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm ring-blue-500/20 transition outline-none focus:border-blue-500 focus:ring-4"
						/>
						<p class="mt-1 text-xs text-slate-500">Minutes between classes on the same day</p>
					</div>

					<div>
						<label class="mb-1 block text-sm font-medium text-slate-700">Prefer no classes on</label
						>
						<div class="flex gap-1">
							{#each ['M', 'T', 'W', 'TH', 'F', 'S'] as day, i}
								<button
									onclick={() => toggleDayOff(i)}
									class="rounded-lg px-3 py-1.5 text-xs font-medium transition {daysOff.includes(i)
										? 'bg-blue-600 text-white'
										: 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-100'}"
								>
									{day}
								</button>
							{/each}
						</div>
						<p class="mt-1 text-xs text-slate-500">
							Schedules with classes on selected days get a score penalty
						</p>
					</div>

					<div>
						<label class="mb-1 block text-sm font-medium text-slate-700">Exclude instructors</label>
						<div class="flex gap-2">
							<input
								type="text"
								placeholder="Instructor name"
								bind:value={newInstructor}
								onkeydown={(e) => {
									if (e.key === 'Enter') addInstructor();
								}}
								class="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm ring-blue-500/20 transition outline-none focus:border-blue-500 focus:ring-4"
							/>
							<button
								onclick={addInstructor}
								disabled={!newInstructor.trim()}
								class="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
							>
								Add
							</button>
						</div>
						{#if excludedInstructors.length > 0}
							<div class="mt-2 flex flex-wrap gap-1.5">
								{#each excludedInstructors as instructor}
									<span
										class="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700"
									>
										{instructor}
										<button
											onclick={() => removeInstructor(instructor)}
											class="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-red-500 hover:bg-red-200 hover:text-red-700"
											aria-label="Remove {instructor}"
										>
											<svg
												class="h-3 w-3"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M6 18 18 6M6 6l12 12"
												/>
											</svg>
										</button>
									</span>
								{/each}
							</div>
						{/if}
						<p class="mt-1 text-xs text-slate-500">
							Sections taught by excluded instructors will be skipped
						</p>
					</div>
				</section>

				{#if lockedCrns.length > 0}
					<div class="rounded-lg border border-blue-200 bg-blue-50 p-3">
						<div class="mb-2 flex items-center justify-between">
							<span class="text-sm font-medium text-blue-700"
								>{lockedCrns.length} section{lockedCrns.length === 1 ? '' : 's'} locked</span
							>
							<button
								onclick={clearLocks}
								class="text-xs font-medium text-blue-600 hover:text-blue-800"
							>
								Clear all
							</button>
						</div>
						<ul class="space-y-1">
							{#each lockedCrns as crn}
								{@const info = findCourseForSection(crn)}
								<li class="flex items-center justify-between rounded border border-blue-100 bg-white px-2 py-1 text-xs">
									{#if info}
										<div class="min-w-0 flex-1">
											<p class="truncate font-medium text-slate-800">{info.section.code}</p>
											<p class="truncate text-slate-500">{info.course.name} • CRN {crn}</p>
										</div>
									{:else}
										<div class="min-w-0 flex-1">
											<p class="truncate text-slate-500">CRN {crn} (not in any course)</p>
										</div>
									{/if}
									<button
										onclick={() => toggleLock(crn)}
										class="ml-2 shrink-0 rounded p-1 text-slate-400 hover:bg-red-100 hover:text-red-600"
										title="Unlock"
									>
										<svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
										</svg>
									</button>
								</li>
							{/each}
						</ul>
					</div>
				{/if}

				<!-- Generate button -->
				<button
					onclick={handleGenerate}
					disabled={!canGenerate}
					class="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#if isGenerating}
						<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
							></path>
						</svg>
						<span>Generating...</span>
					{:else}
						<span>Generate Schedules</span>
					{/if}
				</button>
			</aside>

			<!-- Results panel -->
			<section class="space-y-6">
				{#if lockedConflict && schedules.length === 0}
					<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
						<p class="font-medium">Locked sections conflict</p>
						<p class="mt-1">
							Two or more locked sections have overlapping schedules or violate the minimum gap.
							Unlock or remove conflicting sections to generate schedules.
						</p>
					</div>
				{/if}

				{#if schedules.length === 0 && !lockedConflict}
					<div
						class="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-center"
					>
						<p class="text-sm font-medium text-slate-500">Click Generate to see schedules</p>
						<p class="mt-1 max-w-xs text-xs text-slate-400">
							Add all your courses first, then run the scheduler to find conflict-free combinations.
						</p>
					</div>
				{/if}

				{#if schedules.length > 0}
					<div class="mb-2 flex items-center justify-between">
						<h2 class="text-lg font-semibold text-slate-900">Top schedules</h2>
						<div class="flex items-center gap-3">
							<span class="text-sm text-slate-500">
								{scheduleFilter.trim()
									? `${filteredSchedules.length}/${schedules.length}`
									: schedules.length} result{schedules.length === 1 ? '' : 's'}
							</span>
							{#if selectedForCompare.length >= 2}
								<button
									onclick={() => (showCompare = true)}
									class="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
								>
									Compare ({selectedForCompare.length})
								</button>
							{/if}
						</div>
					</div>

					<div class="relative mb-3">
						<svg
							class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
							/>
						</svg>
						<input
							type="text"
							placeholder="Filter by instructor, code, or CRN..."
							bind:value={scheduleFilter}
							class="w-full rounded-lg border border-slate-300 py-2 pr-3 pl-10 text-sm ring-blue-500/20 transition outline-none focus:border-blue-500 focus:ring-4"
						/>
					</div>

					{#if schedules.length > 0 && minGapMinutes && minGapMinutes > 0 && filteredSchedules.length === 0}
						<div class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
							No schedules match your filter. Try adjusting the filter or reducing the minimum gap.
						</div>
					{/if}

					{#if filteredSchedules.length === 0}
						<div
							class="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center"
						>
							<p class="text-sm text-slate-500">No matching schedules</p>
						</div>
					{/if}

					{#each filteredSchedules as schedule, idx}
						<article class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
							<div
								class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3"
							>
								<div class="flex items-center gap-3">
									<input
										type="checkbox"
										bind:group={selectedForCompare}
										value={idx}
										class="h-4 w-4 rounded border-slate-300 text-blue-600"
									/>
									<span class="text-sm font-semibold text-slate-500">#{idx + 1}</span>
									<div class="flex items-center gap-2">
								<span class="text-sm font-medium text-slate-700">Chance</span>
									<div class="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
										<div
											class="h-full rounded-full bg-blue-600"
											style="width: {Math.min(100, Math.max(0, schedule.probability * 100))}%"
										></div>
									</div>
									<span class="text-sm font-semibold text-slate-900"
										>{(schedule.probability * 100).toFixed(1)}%</span
									>
									</div>
								</div>
								<button
									onclick={() => (expandedSchedule = expandedSchedule === idx ? null : idx)}
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
									<h3 class="mb-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
										Sections
									</h3>
									<div class="grid gap-3 sm:grid-cols-2">
										{#each schedule.sections as section}
											<div
												class="rounded-lg border border-slate-200 p-3 {lockedCrns.includes(
													section.crn
												)
													? 'border-l-2 border-blue-300 bg-blue-50'
													: ''}"
											>
												<div class="flex items-start justify-between">
													<div>
														<p class="text-sm font-semibold text-slate-900">{section.code}</p>
														<p class="text-xs text-slate-500">CRN {section.crn}</p>
													</div>
													<div class="flex items-center gap-2">
														<button
															onclick={() => toggleLock(section.crn)}
															class="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
															title={lockedCrns.includes(section.crn)
																? 'Unlock section'
																: 'Lock section'}
														>
															{#if lockedCrns.includes(section.crn)}
																<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
																	<path
																		d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"
																	/>
																</svg>
															{:else}
																<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
																	<path
																		d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"
																	/>
																</svg>
															{/if}
														</button>
														<span class="text-xs font-semibold text-blue-700"
															>{sectionScore(section).toFixed(2)}</span
														>
														<button
															onclick={async () => {
																const found = findCourseForSection(section.crn);
																if (found)
																	await toggleSectionExclusion(found.course.id, section.crn, true);
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
															{formatTime(meeting.startMin)}–{formatTime(meeting.endMin)}
															{meeting.type.toUpperCase()}
															{meeting.room}
														{/each}
													</p>
													<p class="flex gap-2">
														<span
															class={slotsLeft(section) > 0 ? 'text-emerald-600' : 'text-red-600'}
														>
															{slotsLeft(section)} slot{slotsLeft(section) === 1 ? '' : 's'} left
														</span>
														<span class="text-slate-400">•</span>
														<span>Demand: {section.demand}</span>
													</p>
													{#if section.restrictions}
														<p
															class="rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800"
														>
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
				{/if}
			</section>
		</div>
	</div>

	<footer class="border-t border-slate-200 bg-white">
		<div class="mx-auto max-w-3xl px-4 py-6 text-center text-xs text-slate-500 sm:px-6 lg:px-8">
			<p>
				CRS Scheduler — built for University of the Philippines Diliman students.
				<button
					onclick={() => (showInstructions = true)}
					class="font-medium text-blue-600 hover:underline">How to use</button
				>
			</p>
		</div>
	</footer>

	{#if showDiff}
		<RefreshDiff
			added={diffData.added}
			removed={diffData.removed}
			changed={diffData.changed}
			onclose={() => (showDiff = false)}
		/>
	{/if}

	{#if showCompare}
		<ScheduleCompare
			schedules={selectedForCompare.map((i) => schedules[i])}
			{courses}
			onclose={() => (showCompare = false)}
		/>
	{/if}

	{#if showInstructions}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
			onclick={() => (showInstructions = false)}
			role="dialog"
			aria-modal="true"
		>
			<div class="max-w-md rounded-xl bg-white p-6 shadow-xl" onclick={(e) => e.stopPropagation()}>
				<h3 class="mb-2 text-lg font-semibold text-slate-900">How to use</h3>
				<ol class="list-decimal space-y-2 pl-5 text-sm text-slate-600">
					<li>
						<strong>Add courses:</strong> Enter a course name and optionally paste a CRS schedule URL, then click <strong>Fetch</strong>. For batch import, separate multiple course names with commas (e.g. <em>Eng 13, Math 21</em>).
					</li>
					<li>
						<strong>Set priorities:</strong> Use the P1↑–P5↓ dropdown on each course to rank importance.
						Higher-priority courses get weighted more heavily when generating schedules.
					</li>
					<li>
						<strong>Customize:</strong> Set <em>Avoid classes before</em> to penalize early classes,
						and use the <strong>Refresh All</strong> button to re-scrape all courses for updated section
						data.
					</li>
					<li>
						<strong>Manage exclusions:</strong> Auto-excluded sections appear below the course list.
						Click <em>Include</em> to add them back, or <em>Exclude</em> on any schedule result card to
						remove a section.
					</li>
					<li>
						<strong>Generate and compare:</strong> Click <em>Generate Schedules</em> to find all
						non-overlapping combinations. Check the boxes on result cards and click <em>Compare</em> to
						view two schedules side-by-side.
					</li>
				</ol>
				<button
					onclick={() => (showInstructions = false)}
					class="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
				>
					Got it
				</button>
			</div>
		</div>
	{/if}
</main>
