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

	// Muted course color palette (course code hash → consistent hue)
	const COLORS = [
		{ bg: 'bg-[#E8EFF5]', border: 'border-[#B8CDDD]', text: 'text-[#1E3A5F]' },
		{ bg: 'bg-[#E5EFE9]', border: 'border-[#B0CFB7]', text: 'text-[#1F4A35]' },
		{ bg: 'bg-[#F5EDDF]', border: 'border-[#D9C496]', text: 'text-[#5C4117]' },
		{ bg: 'bg-[#F2E2E3]', border: 'border-[#D4A5A8]', text: 'text-[#5A1F22]' },
		{ bg: 'bg-[#EAE5F0]', border: 'border-[#BFB1D1]', text: 'text-[#3A2A5C]' },
		{ bg: 'bg-[#E2EEF0]', border: 'border-[#A9C8CD]', text: 'text-[#1B4651]' },
		{ bg: 'bg-[#F4E8E0]', border: 'border-[#D6B69F]', text: 'text-[#5C3318]' },
		{ bg: 'bg-[#E6E7EE]', border: 'border-[#B6BACB]', text: 'text-[#222A4C]' }
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

<div class="overflow-hidden rounded-md border border-border bg-surface pb-4 text-ink">
	<!-- Header -->
	<div class="grid grid-cols-[4rem_repeat(6,1fr)] border-b border-border bg-paper">
		<div class="border-r border-border"></div>
		{#each DAYS as day}
			<div class="py-2 text-center text-xs font-semibold tracking-wide text-ink-muted uppercase">
				{day}
			</div>
		{/each}
	</div>

	<!-- Body -->
	<div class="grid grid-cols-[4rem_repeat(6,1fr)]">
		<!-- Time labels -->
		<div class="relative border-r border-border bg-paper" style="height: {HOURS * 48}px">
			{#each { length: HOURS + 1 } as _, i}
				<div
					class="absolute right-1.5 -translate-y-1/2 font-mono text-[10px] font-medium text-ink-muted"
					style="top: {(i / HOURS) * 100}%"
				>
					{formatTime((START_HOUR + i) * 60)}
				</div>
			{/each}
		</div>

		<!-- Day columns -->
		{#each DAYS as _, dayIdx}
			<div class="relative border-r border-border" style="height: {HOURS * 48}px">
				<!-- Hour grid lines -->
				{#each { length: HOURS }, i}
					<div
						class="absolute right-0 left-0 border-t border-border"
						style="top: {((i + 1) / HOURS) * 100}%"
					></div>
				{/each}

				<!-- Meeting blocks -->
				{#each blocks.filter((b) => b.day === dayIdx) as block}
					<div
						class="absolute inset-x-1 overflow-hidden rounded-sm border px-1.5 py-0.5 text-[10px] leading-tight transition {block
							.color.bg} {block.color.border} {block.color.text}"
						style="top: {Math.max(0, block.top)}%; height: {Math.max(4, block.height)}%;"
					>
						<div class="truncate font-semibold">{block.section.code}</div>
						<div class="truncate font-mono opacity-90">
							{formatTime(block.meeting.startMin)}–{formatTime(block.meeting.endMin)}
						</div>
						<div class="truncate opacity-75">{block.meeting.room}</div>
					</div>
				{/each}
			</div>
		{/each}
	</div>
</div>
