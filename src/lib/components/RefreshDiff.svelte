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

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
	onclick={onclose}
	tabindex="-1"
	onkeydown={(e) => {
		if (e.key === 'Escape') onclose();
	}}
	role="dialog"
	aria-modal="true"
	aria-labelledby="diff-title"
>
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-md border border-border bg-surface shadow-sm"
		onclick={(e) => e.stopPropagation()}
	>
		<div class="flex items-center justify-between border-b border-border px-6 py-4">
			<h2 id="diff-title" class="text-lg font-semibold text-ink">Refresh Results</h2>
			<button
				onclick={onclose}
				class="rounded-md p-2 text-ink-muted hover:bg-maroon-subtle hover:text-maroon focus:ring-2 focus:ring-maroon focus:outline-none"
				aria-label="Close diff view"
			>
				<svg
					class="h-5 w-5"
					aria-hidden="true"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<div class="overflow-y-auto p-6">
			{#if removed.length > 0}
				<section class="mb-6">
					<h3 class="mb-3 text-xs font-semibold tracking-wide text-danger uppercase">
						Removed Sections
					</h3>
					<ul class="space-y-2">
						{#each removed as item (item.crn)}
							<li
								class="flex items-center gap-3 rounded-sm border border-danger-border bg-danger-bg px-3 py-2 text-sm"
							>
								<svg
									class="h-4 w-4 shrink-0 text-danger"
									aria-hidden="true"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									viewBox="0 0 24 24"
								>
									<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
								</svg>
								<div>
									<p class="font-mono font-medium text-danger">{item.code}</p>
									<p class="text-xs text-ink-muted">{item.courseName}</p>
								</div>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if added.length > 0}
				<section class="mb-6">
					<h3 class="mb-3 text-xs font-semibold tracking-wide text-success uppercase">
						Added Sections
					</h3>
					<ul class="space-y-2">
						{#each added as item (item.crn)}
							<li
								class="flex items-center gap-3 rounded-sm border border-success-border bg-success-bg px-3 py-2 text-sm"
							>
								<svg
									class="h-4 w-4 shrink-0 text-success"
									aria-hidden="true"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									viewBox="0 0 24 24"
								>
									<path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m-7-7h14" />
								</svg>
								<div>
									<p class="font-mono font-medium text-success">{item.code}</p>
									<p class="text-xs text-ink-muted">{item.courseName}</p>
								</div>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if changed.length > 0}
				<section class="mb-6">
					<h3 class="mb-3 text-xs font-semibold tracking-wide text-excluded uppercase">
						Changed Sections
					</h3>
					<ul class="space-y-2">
						{#each changed as item (item.crn)}
							<li class="rounded-sm border border-excluded-border bg-excluded-bg px-3 py-2 text-sm">
								<div class="flex items-center gap-2">
									<svg
										class="h-4 w-4 shrink-0 text-excluded"
										aria-hidden="true"
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
										<p class="font-mono font-medium text-excluded">{item.code}</p>
										<p class="text-xs text-ink-muted">{item.courseName}</p>
									</div>
								</div>
								<div class="mt-1.5 flex items-center gap-2 text-xs">
									<span
										class="rounded-sm bg-surface px-2 py-0.5 font-mono text-[11px] font-medium text-ink"
									>
										Slots: {item.oldSlotsLeft}/{item.oldCapacity} → {item.slotsLeft}/{item.capacity}
									</span>
								</div>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if removed.length === 0 && added.length === 0 && changed.length === 0}
				<p class="py-6 text-center text-sm text-ink-muted">No changes detected.</p>
			{/if}
		</div>

		<div class="border-t border-border px-6 py-4">
			<button
				onclick={onclose}
				class="w-full rounded-md bg-maroon px-4 py-2.5 text-sm font-semibold text-surface shadow-sm transition hover:bg-maroon-hover focus:ring-2 focus:ring-maroon focus:ring-offset-2 focus:outline-none"
			>
				Done
			</button>
		</div>
	</div>
</div>
