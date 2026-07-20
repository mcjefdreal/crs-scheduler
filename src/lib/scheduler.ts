import type { Course, Meeting, Schedule, ScheduleResult, Section } from './types';

export interface ScheduleOptions {
	/** Minutes from midnight — meetings starting before this are penalized. */
	earliestStartMin?: number;
	/** Minimum minutes between meetings on the same day. 0 = back-to-back OK. */
	minGapMinutes?: number;
	/** Days to avoid (0=Mon..5=Sat). Soft penalty per occupied off-day. */
	daysOff?: number[];
	/** CRNs that MUST be in every schedule (bypass excluded/slotsLeft=0). */
	lockedCrns?: number[];
	/** Instructor names to exclude. Case-insensitive match. */
	excludedInstructors?: string[];
}

/**
 * Check if two meetings overlap in time.
 * Overlap = share any day AND time ranges intersect.
 */
export function doMeetingsOverlap(a: Meeting, b: Meeting): boolean {
	const shareDay = a.days.some((day) => b.days.includes(day));
	if (!shareDay) return false;
	return a.startMin < b.endMin && b.startMin < a.endMin;
}

/** Score a section: how likely student gets in. Higher = better, capped at 1.0. */
export function sectionScore(section: Section): number {
	return Math.min(section.slotsLeft, section.demand) / Math.max(section.demand, 1);
}

const TIME_PENALTY = 0.5;

function scoreSection(section: Section, opts?: ScheduleOptions, priority = 0): number {
	let score = Math.min(section.slotsLeft, section.demand) / Math.max(section.demand, 1);
	const earliest = opts?.earliestStartMin;
	if (earliest !== undefined) {
		const hasEarly = section.meetings.some((m) => m.startMin < earliest);
		if (hasEarly) score *= TIME_PENALTY;
	}
	if (priority > 0) {
		score *= 1 + priority * 0.5;
	}
	return score;
}

function sectionsOverlap(a: Section, b: Section): boolean {
	for (const ma of a.meetings) {
		for (const mb of b.meetings) {
			if (doMeetingsOverlap(ma, mb)) return true;
		}
	}
	return false;
}

/**
 * Check two meetings have sufficient gap on a shared day.
 * If they don't share a day, always OK.
 * If meetings overlap, gap check fails (no gap).
 */
export function meetingsGapOK(a: Meeting, b: Meeting, minGapMinutes: number): boolean {
	const shareDay = a.days.some((day) => b.days.includes(day));
	if (!shareDay) return true;
	// Overlapping meetings have no gap
	if (a.startMin < b.endMin && b.startMin < a.endMin) return false;
	const gap = Math.min(Math.abs(a.endMin - b.startMin), Math.abs(b.endMin - a.startMin));
	return gap >= minGapMinutes;
}

/**
 * Returns true if any meeting pair between sections has insufficient gap
 * (gap < minGap on a shared day).
 */
function sectionsHaveGap(a: Section, b: Section, minGap: number): boolean {
	if (minGap <= 0) return false;
	for (const ma of a.meetings) {
		for (const mb of b.meetings) {
			if (!meetingsGapOK(ma, mb, minGap)) return true;
		}
	}
	return false;
}

const MAX_SCHEDULES = 50;

/**
 * Generate non-overlapping schedule combinations from a list of courses.
 * Uses backtracking with MRV ordering and overlap pruning.
 * Returns top 50 schedules sorted by score descending wrapped in a ScheduleResult.
 */
export function generateSchedules(courses: Course[], opts?: ScheduleOptions): ScheduleResult {
	// ---- Locked CRNs ----
	const lockedSections: Section[] = [];
	const lockedCourseIds = new Set<string>();

	if (opts?.lockedCrns?.length) {
		for (const crn of opts.lockedCrns) {
			for (const course of courses) {
				const section = course.sections.find((s) => s.crn === crn);
				if (section) {
					lockedSections.push(section);
					lockedCourseIds.add(course.id);
					break;
				}
			}
		}

		// Check locked sections don't overlap with each other
		for (let i = 0; i < lockedSections.length; i++) {
			for (let j = i + 1; j < lockedSections.length; j++) {
				if (sectionsOverlap(lockedSections[i], lockedSections[j])) {
					return { schedules: [], lockedConflict: true };
				}
				if (opts?.minGapMinutes && opts.minGapMinutes > 0) {
					if (sectionsHaveGap(lockedSections[i], lockedSections[j], opts.minGapMinutes)) {
						return { schedules: [], lockedConflict: true };
					}
				}
			}
		}
	}

	// ---- Pre-processing: filter exclusions + instructor exclusion ----
	const filtered = courses.map((c) => ({
		...c,
		sections: c.sections.filter(
			(s) =>
				!s.excluded &&
				s.slotsLeft > 0 &&
				!opts?.excludedInstructors?.some(
					(excl) => s.instructor.toLowerCase() === excl.toLowerCase()
				)
		)
	}));
	let valid = filtered.filter((c) => c.sections.length > 0 && !lockedCourseIds.has(c.id));

	if (valid.length === 0 && lockedSections.length === 0) {
		return { schedules: [] };
	}

	// Build crn → course priority map
	const crnToPriority = new Map<number, number>();
	for (const course of courses) {
		for (const section of course.sections) {
			// Invert: P1 (value 1) = highest → effective weight 5
			crnToPriority.set(section.crn, course.priority ? 6 - course.priority : 0);
		}
	}

	// MRV: sort courses by section count ascending
	const sorted = [...valid].sort((a, b) => a.sections.length - b.sections.length);

	const results: Schedule[] = [];
	const initialSelected = [...lockedSections];

	function backtrack(selected: Section[], courseIdx: number) {
		if (results.length >= MAX_SCHEDULES) return;

		if (courseIdx === sorted.length) {
			let score = selected.reduce(
				(sum, s) => sum + scoreSection(s, opts, crnToPriority.get(s.crn) ?? 0),
				0
			);

			// ---- Day-off penalty ----
			if (opts?.daysOff && opts.daysOff.length > 0) {
				const occupiedDays = new Set(selected.flatMap((s) => s.meetings.flatMap((m) => m.days)));
				const violations = opts.daysOff.filter((d) => occupiedDays.has(d)).length;
				score *= Math.pow(0.7, violations);
			}

			results.push({ sections: [...selected], score });
			return;
		}

		const course = sorted[courseIdx];
		for (const section of course.sections) {
			const hasOverlap = selected.some((sel) => sectionsOverlap(sel, section));
			if (hasOverlap) continue;

			const gapViolation =
				opts?.minGapMinutes &&
				opts.minGapMinutes > 0 &&
				selected.some((sel) => sectionsHaveGap(sel, section, opts.minGapMinutes!));
			if (gapViolation) continue;

			selected.push(section);
			backtrack(selected, courseIdx + 1);
			selected.pop();
		}
	}

	backtrack(initialSelected, 0);

	results.sort((a, b) => b.score - a.score);
	return { schedules: results.slice(0, MAX_SCHEDULES) };
}
