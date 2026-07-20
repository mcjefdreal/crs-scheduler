<script lang="ts">
	interface SectionInfo {
		crn: number;
		code: string;
		courseName: string;
	}

	interface ChangedSection extends SectionInfo {
		slotsLeft: number;
		oldSlotsLeft: number;
		capacity: number;
		oldCapacity: number;
	}

	interface Props {
		added: SectionInfo[];
		removed: SectionInfo[];
		changed: ChangedSection[];
		onclose: () => void;
	}

	let { added, removed, changed, onclose }: Props = $props();
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
	onclick={onclose}
	role="dialog"
	aria-modal="true"
	aria-labelledby="diff-title"
>
	<div
		class="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
		onclick={(e) => e.stopPropagation()}
	>
		<div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
			<h2 id="diff-title" class="text-lg font-semibold text-slate-900">Refresh Results</h2>
			<button
				onclick={onclose}
				class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
				aria-label="Close diff view"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<div class="overflow-y-auto p-6">
			{#if removed.length > 0}
				<section class="mb-6">
					<h3 class="mb-3 text-sm font-semibold tracking-wide text-red-700 uppercase">
						Removed Sections
					</h3>
					<ul class="space-y-2">
						{#each removed as item}
							<li
								class="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm"
							>
								<svg
									class="h-4 w-4 shrink-0 text-red-500"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									viewBox="0 0 24 24"
								>
									<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
								</svg>
								<div>
									<p class="font-medium text-red-800">{item.code}</p>
									<p class="text-xs text-red-600">{item.courseName}</p>
								</div>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if added.length > 0}
				<section class="mb-6">
					<h3 class="mb-3 text-sm font-semibold tracking-wide text-emerald-700 uppercase">
						Added Sections
					</h3>
					<ul class="space-y-2">
						{#each added as item}
							<li
								class="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm"
							>
								<svg
									class="h-4 w-4 shrink-0 text-emerald-500"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									viewBox="0 0 24 24"
								>
									<path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m-7-7h14" />
								</svg>
								<div>
									<p class="font-medium text-emerald-800">{item.code}</p>
									<p class="text-xs text-emerald-600">{item.courseName}</p>
								</div>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if changed.length > 0}
				<section class="mb-6">
					<h3 class="mb-3 text-sm font-semibold tracking-wide text-amber-700 uppercase">
						Changed Sections
					</h3>
					<ul class="space-y-2">
						{#each changed as item}
							<li class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
								<div class="flex items-center gap-2">
									<svg
										class="h-4 w-4 shrink-0 text-amber-500"
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
									<div>
										<p class="font-medium text-amber-800">{item.code}</p>
										<p class="text-xs text-amber-600">{item.courseName}</p>
									</div>
								</div>
								<div class="mt-1.5 flex items-center gap-2 text-xs">
									<span class="rounded bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
										Slots: {item.oldSlotsLeft}/{item.oldCapacity} → {item.slotsLeft}/{item.capacity}
									</span>
								</div>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if removed.length === 0 && added.length === 0 && changed.length === 0}
				<p class="py-6 text-center text-sm text-slate-500">No changes detected.</p>
			{/if}
		</div>

		<div class="border-t border-slate-200 px-6 py-4">
			<button
				onclick={onclose}
				class="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
			>
				Done
			</button>
		</div>
	</div>
</div>
