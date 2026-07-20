<script lang="ts">
	import type { Section, Meeting } from '$lib';

	interface Props {
		sections: Section[];
	}

	let { sections }: Props = $props();

	const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const START_HOUR = 7;
	const END_HOUR = 19;
	const HOURS = END_HOUR - START_HOUR;

	const COLORS = [
		{ bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-900' },
		{ bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-900' },
		{ bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-900' },
		{ bg: 'bg-rose-100', border: 'border-rose-300', text: 'text-rose-900' },
		{ bg: 'bg-violet-100', border: 'border-violet-300', text: 'text-violet-900' },
		{ bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-900' },
		{ bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-900' },
		{ bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-900' }
	];

	interface Block {
		day: number;
		top: number;
		height: number;
		section: Section;
		meeting: Meeting;
		color: (typeof COLORS)[number];
	}

	const courseCodes = $derived([
		...new Set(sections.map((s) => s.code.split(' ').slice(0, 2).join(' ')))
	]);

	function colorFor(section: Section) {
		const code = section.code.split(' ').slice(0, 2).join(' ');
		const idx = courseCodes.indexOf(code);
		return COLORS[idx % COLORS.length];
	}

	function formatTime(min: number) {
		const h = Math.floor(min / 60);
		const m = min % 60;
		const ampm = h >= 12 ? 'PM' : 'AM';
		const h12 = h % 12 || 12;
		return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
	}

	const blocks = $derived<Block[]>(
		sections.flatMap((section) => {
			const color = colorFor(section);
			return section.meetings.flatMap((meeting) =>
				meeting.days.map((day) => ({
					day,
					top: ((meeting.startMin - START_HOUR * 60) / (HOURS * 60)) * 100,
					height: ((meeting.endMin - meeting.startMin) / (HOURS * 60)) * 100,
					section,
					meeting,
					color
				}))
			);
		})
	);
</script>

<div class="overflow-hidden rounded-lg border border-slate-200 bg-white pb-4 text-slate-700">
	<!-- Header -->
	<div class="grid grid-cols-[4rem_repeat(6,1fr)] border-b border-slate-200 bg-slate-50">
		<div class="border-r border-slate-200"></div>
		{#each DAYS as day}
			<div class="py-2 text-center text-xs font-semibold tracking-wide text-slate-600">{day}</div>
		{/each}
	</div>

	<!-- Body -->
	<div class="grid grid-cols-[4rem_repeat(6,1fr)]">
		<!-- Time labels -->
		<div class="relative border-r border-slate-200 bg-slate-50" style="height: {HOURS * 48}px">
			{#each { length: HOURS + 1 } as _, i}
				<div
					class="absolute right-1.5 -translate-y-1/2 text-[10px] font-medium text-slate-400"
					style="top: {(i / HOURS) * 100}%"
				>
					{formatTime((START_HOUR + i) * 60)}
				</div>
			{/each}
		</div>

		<!-- Day columns -->
		{#each DAYS as _, dayIdx}
			<div class="relative border-r border-slate-100" style="height: {HOURS * 48}px">
				<!-- Hour grid lines -->
				{#each { length: HOURS }, i}
					<div
						class="absolute left-0 right-0 border-t border-slate-100"
						style="top: {((i + 1) / HOURS) * 100}%"
					></div>
				{/each}

				<!-- Meeting blocks -->
				{#each blocks.filter((b) => b.day === dayIdx) as block}
					<div
						class="absolute inset-x-1 overflow-hidden rounded border px-1 py-0.5 text-[10px] leading-tight shadow-sm {block.color.bg} {block.color.border} {block.color.text}"
						style="top: {Math.max(0, block.top)}%; height: {Math.max(4, block.height)}%;"
					>
						<div class="truncate font-semibold">{block.section.code}</div>
						<div class="truncate opacity-90">
							{formatTime(block.meeting.startMin)}–{formatTime(block.meeting.endMin)}
						</div>
						<div class="truncate opacity-75">{block.meeting.room}</div>
					</div>
				{/each}
			</div>
		{/each}
	</div>
</div>
