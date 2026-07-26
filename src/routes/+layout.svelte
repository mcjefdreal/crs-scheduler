<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>CRS Scheduler</title>
	<meta
		name="description"
		content="Schedule generator for UPD CRS — fetch, generate, and compare class schedules."
	/>
</svelte:head>

<div class="min-h-screen bg-paper text-ink antialiased">
	{@render children()}
</div>
