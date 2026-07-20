import type { Course, Meeting, Schedule, Section } from './types';

/**
 * Check if two meetings overlap in time.
 * Overlap = share any day AND time ranges intersect.
 */
export function doMeetingsOverlap(a: Meeting, b: Meeting): boolean {
	const shareDay = a.days.some((day) => b.days.includes(day));
	if (!shareDay) return false;
	return a.startMin < b.endMin && b.startMin < a.endMin;
}

/** Score a section: how likely student gets in. Higher = better. */
export function sectionScore(section: Section): number {
	return section.slotsLeft / Math.max(section.demand, 1);
}

function sectionsOverlap(a: Section, b: Section): boolean {
	for (const ma of a.meetings) {
		for (const mb of b.meetings) {
			if (doMeetingsOverlap(ma, mb)) return true;
		}
	}
	return false;
}

const MAX_SCHEDULES = 50;

/**
 * Generate non-overlapping schedule combinations from a list of courses.
 * Uses backtracking with MRV ordering and overlap pruning.
 * Returns top 50 schedules sorted by score descending.
 */
export function generateSchedules(courses: Course[]): Schedule[] {
	// Filter to only non-excluded sections with remaining slots
	const filtered = courses.map((c) => ({
		...c,
		sections: c.sections.filter((s) => !s.excluded && s.slotsLeft > 0)
	}));
	const valid = filtered.filter((c) => c.sections.length > 0);
	if (valid.length === 0) return [];

	// MRV: sort courses by section count ascending
	const sorted = [...valid].sort((a, b) => a.sections.length - b.sections.length);

	const results: Schedule[] = [];

	function backtrack(selected: Section[], courseIdx: number) {
		if (results.length >= MAX_SCHEDULES) return;

		if (courseIdx === sorted.length) {
			const score = selected.reduce((sum, s) => sum + sectionScore(s), 0);
			results.push({ sections: [...selected], score });
			return;
		}

		const course = sorted[courseIdx];
		for (const section of course.sections) {
			const hasOverlap = selected.some((sel) => sectionsOverlap(sel, section));
			if (!hasOverlap) {
				selected.push(section);
				backtrack(selected, courseIdx + 1);
				selected.pop();
			}
		}
	}

	backtrack([], 0);

	results.sort((a, b) => b.score - a.score);
	return results.slice(0, MAX_SCHEDULES);
}
