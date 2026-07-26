<script lang="ts">
	import type { Schedule, Course, Meeting, Section } from '$lib';

	interface Props {
		schedules: Schedule[];
		courses: Course[];
		onclose: () => void;
	}

	let { schedules, courses, onclose }: Props = $props();

	const DAY_LETTERS = ['M', 'T', 'W', 'H', 'F', 'S'];

	const rankBadge = [
		{ bg: 'bg-[#E8EFF5]', text: 'text-[#1E3A5F]', border: 'border-[#B8CDDD]' },
		{ bg: 'bg-[#E5EFE9]', text: 'text-[#1F4A35]', border: 'border-[#B0CFB7]' },
		{ bg: 'bg-[#F5EDDF]', text: 'text-[#5C4117]', border: 'border-[#D9C496]' }
	];

	const rankProbColor = ['bg-[#1E3A5F]', 'bg-[#1F4A35]', 'bg-[#5C4117]'];

	const courseByCrn = $derived(
		Object.fromEntries(courses.flatMap((c) => c.sections.map((s) => [s.crn, c])))
	);

	const courseNames = $derived(
		[
			...new Set(
				schedules.flatMap((s) =>
					s.sections.map((section) => courseByCrn[section.crn]?.name ?? section.code)
				)
			)
		].sort()
	);

	const sectionByCourse = $derived(
		schedules.map((schedule) => {
			const map: Record<string, Section> = {};
			for (const section of schedule.sections) {
				const courseName = courseByCrn[section.crn]?.name ?? section.code;
				map[courseName] = section;
			}
			return map;
		})
	);

	const differingCourses = $derived(
		new Set(
			courseNames.filter((name) => {
				const codes = new Set(sectionByCourse.map((map) => map[name]?.code).filter(Boolean));
				return codes.size > 1;
			})
		)
	);

	function formatTime(min: number) {
		const h = Math.floor(min / 60);
		const m = min % 60;
		const ampm = h >= 12 ? 'PM' : 'AM';
		const h12 = h % 12 || 12;
		return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
	}

	function formatMeeting(meeting: Meeting) {
		const days = meeting.days.map((d) => DAY_LETTERS[d]).join('');
		return `${days} ${formatTime(meeting.startMin)}–${formatTime(meeting.endMin)} ${meeting.type.toUpperCase()} ${meeting.room}`;
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
	onclick={onclose}
	onkeydown={(e) => e.key === 'Escape' && onclose()}
	role="dialog"
	aria-modal="true"
	tabindex="-1"
	aria-labelledby="compare-title"
>
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-md border border-border bg-surface shadow-xl"
		onclick={(e) => e.stopPropagation()}
	>
		<div class="flex items-center justify-between border-b border-border px-6 py-4">
			<h2 id="compare-title" class="text-lg font-semibold text-ink">Compare Schedules</h2>
			<button
				onclick={onclose}
				class="rounded-md p-2 text-ink-muted hover:bg-maroon-subtle hover:text-maroon focus:ring-2 focus:ring-maroon focus:outline-none"
				aria-label="Close comparison"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<div class="overflow-y-auto p-6">
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each schedules as schedule, idx}
					{@const badge = rankBadge[idx % rankBadge.length]}
					<section
						class="flex flex-col rounded-md border border-border bg-surface transition hover:border-border-hover hover:shadow-sm"
					>
						<div class="border-b border-border bg-paper px-4 py-3">
							<div class="mb-2 flex items-center gap-2">
								<span
									class="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full border px-2 text-xs font-bold {badge.bg} {badge.text} {badge.border}"
								>
									#{idx + 1}
								</span>
								<span class="text-sm font-medium text-ink-muted">Chance</span>
								<span class="font-mono text-base font-bold text-ink"
									>{(schedule.probability * 100).toFixed(1)}%</span
								>
							</div>
							<div class="h-2 w-full overflow-hidden rounded-full bg-border">
								<div
									class="h-full rounded-full {rankProbColor[idx % rankProbColor.length]}"
									style="width: {Math.min(100, Math.max(0, schedule.probability * 100))}%"
								></div>
							</div>
						</div>

						<div class="flex-1 divide-y divide-border">
							{#each courseNames as courseName}
								{@const section = sectionByCourse[idx][courseName]}
								{@const isDifferent = section !== undefined && differingCourses.has(courseName)}
								<div class="px-4 py-3 {isDifferent ? 'bg-excluded-bg' : ''}">
									<div class="flex items-start justify-between gap-2">
										<div class="min-w-0 flex-1">
											<p class="truncate text-sm font-semibold text-ink">{courseName}</p>
											{#if section}
												<p class="font-mono text-sm font-medium text-maroon">{section.code}</p>
												<div class="mt-1 space-y-0.5 text-xs text-ink-muted">
													{#each section.meetings as meeting}
														<p class="font-mono">{formatMeeting(meeting)}</p>
													{/each}
												</div>
											{:else}
												<p class="text-sm text-ink-muted">—</p>
											{/if}
										</div>
										{#if isDifferent}
											<span
												class="mt-0.5 shrink-0 rounded-full bg-excluded-bg px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-excluded uppercase"
												title="Section differs from the other schedules"
											>
												Differs
											</span>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</section>
				{/each}
			</div>
		</div>
	</div>
</div>
