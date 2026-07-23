<script lang="ts">
	import { parseCRSHtml } from '$lib';

	type Pe2Status = 'new' | 'unchanged' | 'gone';
	interface Pe2Section {
		code: string;
		slotsLeft: number;
		capacity: number;
		status: Pe2Status;
	}

	const LS_PE2_SECTIONS = 'pe2-sections';
	const LS_PE2_PREV = 'pe2-previous';
	const LS_PE2_FETCHED = 'pe2-fetched-at';
	const LS_PE2_SHOW_ALL = 'pe2-show-all';

	let pe2Sections = $state<Pe2Section[]>(loadJson(LS_PE2_SECTIONS, []));
	let previousSections = $state<Array<{ code: string; slotsLeft: number; capacity: number }>>(
		loadJson(LS_PE2_PREV, [])
	);
	let isPe2Fetching = $state(false);
	let pe2Error = $state<string | null>(null);
	let pe2FetchedAt = $state<number | null>(loadJson(LS_PE2_FETCHED, null));
	let showAllPe2 = $state(loadJson(LS_PE2_SHOW_ALL, false));
	let pe2Search = $state('');

	function loadJson<T>(key: string, fallback: T): T {
		try {
			const raw = localStorage.getItem(key);
			return raw ? JSON.parse(raw) : fallback;
		} catch {
			return fallback;
		}
	}

	function savePersistence() {
		localStorage.setItem(LS_PE2_SECTIONS, JSON.stringify(pe2Sections));
		localStorage.setItem(LS_PE2_PREV, JSON.stringify(previousSections));
		localStorage.setItem(LS_PE2_FETCHED, JSON.stringify(pe2FetchedAt));
		localStorage.setItem(LS_PE2_SHOW_ALL, JSON.stringify(showAllPe2));
	}

	$effect(() => {
		// track dependencies — save on any change
		pe2Sections; previousSections; pe2FetchedAt; showAllPe2;
		savePersistence();
	});

	const visibleCount = $derived(pe2Sections.filter((s) => s.status !== 'gone').length);

	const filteredPe2Sections = $derived(
		pe2Sections.filter((s) => {
			const term = pe2Search.trim().toLowerCase();
			if (!term) return true;
			return s.code.toLowerCase().includes(term);
		})
	);

	async function fetchPe2() {
		pe2Error = null;
		isPe2Fetching = true;

		try {
			const res = await fetch('/api/fetch-crs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url: 'https://crs.upd.edu.ph/schedule/120261/P' })
			});
			if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
			const data = await res.json();
			const sections = parseCRSHtml(data.html);

			const fresh = sections
				.filter((s) => s.code.toUpperCase().startsWith('PE 2'))
				.filter((s) => showAllPe2 || s.slotsLeft > 0)
				.map((s) => ({ code: s.code, slotsLeft: s.slotsLeft, capacity: s.capacity }))
				.sort((a, b) => a.code.localeCompare(b.code));

			const previousCodes = new Set(previousSections.map((s) => s.code));
			const freshCodes = new Set(fresh.map((s) => s.code));

			const current: Pe2Section[] = fresh.map((s) => ({
				...s,
				status: previousCodes.size === 0 || previousCodes.has(s.code) ? 'unchanged' : 'new'
			}));

			const gone: Pe2Section[] = previousSections
				.filter((s) => !freshCodes.has(s.code))
				.map((s) => ({ ...s, status: 'gone' as Pe2Status }));

			pe2Sections = [...current, ...gone];
			previousSections = fresh;
			pe2FetchedAt = Date.now();
		} catch (err) {
			pe2Error = err instanceof Error ? err.message : 'Failed to fetch PE 2 classes.';
		}
		isPe2Fetching = false;
	}
</script>

<section class="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
	<div class="mb-4 flex items-center justify-between">
		<div>
			<h2 class="text-sm font-semibold tracking-wide text-emerald-800 uppercase">PE 2 Classes</h2>
			<p class="mt-0.5 text-xs text-emerald-600">
				{visibleCount} {showAllPe2 ? 'section' : 'open section'}{visibleCount === 1 ? '' : 's'}
				{#if pe2FetchedAt}
					• updated {new Date(pe2FetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
				{/if}
			</p>
		</div>
		<div class="flex items-center gap-2">
			<label class="flex cursor-pointer items-center gap-1.5 text-xs text-emerald-700">
				<input
					type="checkbox"
					bind:checked={showAllPe2}
					onchange={fetchPe2}
					class="h-3.5 w-3.5 rounded border-emerald-300 text-emerald-600"
				/>
				Show all
			</label>
			<button
				onclick={fetchPe2}
				disabled={isPe2Fetching}
				class="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:bg-emerald-400"
			>
				{#if isPe2Fetching}
					<svg class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
						<circle
							class="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							stroke-width="4"
						/>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
						/>
					</svg>
					Refreshing…
				{:else}
					<svg
						class="h-3.5 w-3.5"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
						/>
					</svg>
					Refresh
				{/if}
			</button>
		</div>
	</div>

	<div class="mb-3">
		<input
			type="text"
			bind:value={pe2Search}
			placeholder="Search course code or section..."
			class="w-full rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs text-slate-700 placeholder:text-emerald-300 focus:border-emerald-400 focus:outline-none"
		/>
		{#if pe2Search.trim()}
			<p class="mt-1 text-xs text-emerald-600">
				{filteredPe2Sections.length} of {pe2Sections.length} sections
			</p>
		{/if}
	</div>

	{#if pe2Error}
		<div class="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
			{pe2Error}
		</div>
	{/if}

	{#if pe2Sections.length === 0}
		<div class="rounded-lg border border-dashed border-emerald-300 bg-emerald-50/50 py-6 text-center">
			<p class="text-sm font-medium text-emerald-700">
				{isPe2Fetching ? 'Loading…' : 'No open PE 2 classes'}
			</p>
			{#if !isPe2Fetching}
				<p class="mt-1 text-xs text-emerald-600">Click Refresh to check availability.</p>
			{/if}
		</div>
	{:else}
		<ul class="max-h-64 space-y-1.5 overflow-y-auto">
			{#each filteredPe2Sections as section (section.code + '-' + section.status)}
				<li
					class="flex items-center justify-between rounded-lg border px-3 py-2 {section.status === 'new'
						? 'border-emerald-300 bg-emerald-100/60 border-l-4 border-l-emerald-500'
						: section.status === 'gone'
							? 'border-slate-200 bg-slate-100/70 opacity-70'
							: 'border-emerald-100 bg-white'}"
				>
					<div class="min-w-0 flex-1">
						<p
							class="truncate text-sm font-semibold {section.status === 'gone'
								? 'text-slate-500 line-through'
								: 'text-slate-800'}"
						>
							{section.code}
						</p>
						<p
							class="text-xs {section.status === 'gone' ? 'text-slate-400' : 'text-slate-500'}"
						>
							{#if section.capacity > 0}
								{section.slotsLeft} / {section.capacity} slots
							{:else}
								{section.slotsLeft} slots left
							{/if}
						</p>
					</div>
					<span
						class="ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium {section.status === 'new'
							? 'bg-emerald-200 text-emerald-800'
							: section.status === 'gone'
								? 'bg-red-100 text-red-700'
								: section.slotsLeft > 0
									? 'bg-emerald-100 text-emerald-700'
									: 'bg-slate-100 text-slate-500'}"
					>
						{section.status === 'new'
							? 'New'
							: section.status === 'gone'
								? 'Gone'
								: section.slotsLeft > 0
									? section.slotsLeft + ' left'
									: 'Full'}
					</span>
				</li>
			{:else}
				<li class="rounded-lg border border-dashed border-emerald-300 bg-emerald-50/50 py-4 text-center text-xs text-emerald-600">
					No sections match "{pe2Search}"
				</li>
			{/each}
		</ul>
	{/if}
</section>
