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
		{ bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
		{ bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
		{ bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' }
	];

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

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
	onclick={onclose}
	role="dialog"
	aria-modal="true"
	aria-labelledby="compare-title"
>
	<div
		class="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
		onclick={(e) => e.stopPropagation()}
	>
		<div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
			<h2 id="compare-title" class="text-lg font-semibold text-slate-900">Compare Schedules</h2>
			<button
				onclick={onclose}
				class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
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
					<section class="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
						<div class="border-b border-slate-200 bg-slate-50 px-4 py-3">
							<div class="mb-2 flex items-center gap-2">
								<span
									class="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full border px-2 text-xs font-bold {badge.bg} {badge.text} {badge.border}"
								>
									#{idx + 1}
								</span>
								<span class="text-sm font-medium text-slate-700">Chance</span>
								<span class="text-base font-bold text-slate-900">{(schedule.probability * 100).toFixed(1)}%</span>
							</div>
							<div class="h-2 w-full overflow-hidden rounded-full bg-slate-200">
								<div
									class="h-full rounded-full {idx === 0
										? 'bg-blue-600'
										: idx === 1
											? 'bg-emerald-600'
											: 'bg-amber-500'}"
									style="width: {Math.min(100, Math.max(0, schedule.probability * 100))}%"
								></div>
							</div>
						</div>

						<div class="flex-1 divide-y divide-slate-100">
							{#each courseNames as courseName}
								{@const section = sectionByCourse[idx][courseName]}
								{@const isDifferent = section !== undefined && differingCourses.has(courseName)}
								<div class="px-4 py-3 {isDifferent ? 'bg-amber-50' : ''}">
									<div class="flex items-start justify-between gap-2">
										<div class="min-w-0 flex-1">
											<p class="truncate text-sm font-semibold text-slate-900">{courseName}</p>
											{#if section}
												<p class="text-sm font-medium text-blue-700">{section.code}</p>
												<div class="mt-1 space-y-0.5 text-xs text-slate-600">
													{#each section.meetings as meeting}
														<p>{formatMeeting(meeting)}</p>
													{/each}
												</div>
											{:else}
												<p class="text-sm text-slate-400">—</p>
											{/if}
										</div>
										{#if isDifferent}
											<span
												class="mt-0.5 shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
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
