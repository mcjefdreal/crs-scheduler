import type { Meeting, Section } from './types';

// M=0, T=1, W=2, H=3, F=4, S=5
/** Programs the user qualifies for — sections restricted TO these should NOT be auto-excluded */
const ALLOWED_PROGRAMS = ['BS CS', 'Engg', 'COE'];

const DAY_MAP: Record<string, number> = {
	M: 0,
	T: 1,
	W: 2,
	H: 3,
	F: 4,
	S: 5
};

// Matches: DAYS START-END[AM|PM] type ROOM
// Groups:    1      2    3  4     5   6  7     8    9
const MEETING_RE =
	/([MTWHFS]+)\s+(\d{1,2})(?::(\d{2}))?(AM|PM)?\s*-\s*(\d{1,2})(?::(\d{2}))?(AM|PM)\s+(\w+)\s+(\S+)/i;

function parseMeetingLine(line: string): Meeting | null {
	const m = line.match(MEETING_RE);
	if (!m) return null;

	const days: number[] = [];
	for (const ch of m[1].toUpperCase()) {
		const d = DAY_MAP[ch];
		if (d !== undefined && !days.includes(d)) {
			days.push(d);
		}
	}

	const startAmpm = m[4] || m[7]; // inherit end AM/PM if start not specified
	const startMin = toMinutes(m[2], m[3], startAmpm);
	const endMin = toMinutes(m[5], m[6], m[7]);

	return {
		days,
		startMin,
		endMin,
		type: m[8].toLowerCase(),
		room: m[9]
	};
}

function toMinutes(h: string, minStr: string | undefined, ampm: string | undefined): number {
	let hour = parseInt(h, 10);
	const min = minStr ? parseInt(minStr, 10) : 0;
	if (ampm && ampm.toUpperCase() === 'PM' && hour !== 12) hour += 12;
	if (ampm && ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
	return hour * 60 + min;
}

const INSTRUCTOR_RE = /^[A-Z][A-Z\s.,'-]*,\s*[A-Z][A-Z\s.,'-]*$/;

function parseScheduleColumn(html: string): { meetings: Meeting[]; instructor: string } {
	const lines = html.split(/<br\s*\/?>/i);
	const meetings: Meeting[] = [];
	let instructor = '';

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) continue;

		// Lines inside <em> are BM3 remarks — skip entirely
		if (/^<em>/i.test(trimmed) || /<\/em>$/i.test(trimmed)) continue;

		const stripped = trimmed.replace(/<[^>]+>/g, '').trim();
		if (!stripped) continue;

		// Check instructor pattern: LASTNAME, FIRSTNAME (all caps, comma)
		if (!instructor && INSTRUCTOR_RE.test(stripped)) {
			instructor = stripped;
			continue;
		}

		// Try meeting pattern
		const meeting = parseMeetingLine(stripped);
		if (meeting) {
			meetings.push(meeting);
		}
	}

	return { meetings, instructor };
}

function parseCapacity(text: string): { slotsLeft: number; capacity: number } {
	const m = text.match(/(\d+)\s*\/\s*(\d+)/);
	if (m) {
		return { slotsLeft: parseInt(m[1], 10), capacity: parseInt(m[2], 10) };
	}
	return { slotsLeft: 0, capacity: 0 };
}

/**
 * Parse CRS portal HTML into Section[].
 * Accepts a full <table> or <tbody> with <tr> rows.
 * Runs client-side via DOMParser.
 */
export function parseCRSHtml(html: string): Section[] {
	const doc = new DOMParser().parseFromString(html, 'text/html');
	const rows = doc.querySelectorAll('tr');

	const sections: Section[] = [];

	// Rowspan carry-over for demand column
	let rowspanDemand = 0;
	let rowspanRemaining = 0;

	for (const row of rows) {
		const cells = row.querySelectorAll('td');
		if (cells.length < 8) continue;

		// Detect format: public schedule pages have 9+ columns.
		// Auth format: [0]=CRN [1]=code [2]=units [3]=schedule [4]=remarks [5]=restrictions [6]=capacity [7]=demand
		// Public format: [0]=CRN [1]=code [2]=units [3]=schedule [4]=remarks [5]=SKIP [6]=capacity [7]=demand [8]=restrictions
		const isPublicFormat = cells.length >= 9;
		const restrictionIdx = isPublicFormat ? 8 : 5;

		// td[0]: CRN
		const crnText = (cells[0].textContent ?? '').trim();
		const crn = parseInt(crnText.split('\n')[0].trim(), 10);
		if (isNaN(crn)) continue;

		// td[1]: Section code — public format may not have <strong>
		// Some electives have "<br>" + description (e.g. "CS 174 WFZ<br>Offensive Security…")
		// — keep only the part before any <br> tag
		const codeEl = cells[1].querySelector('strong');
		const sourceHtml = codeEl?.innerHTML ?? cells[1].innerHTML;
		const brIdx = sourceHtml.search(/<br\s*\/?>/i);
		const code = (brIdx === -1 ? sourceHtml : sourceHtml.slice(0, brIdx))
			.replace(/<[^>]+>/g, '')
			.replace(/\s+/g, ' ')
			.trim();
		if (!code) continue;

		// td[2]: Units
		const units = parseFloat(cells[2].textContent ?? '');
		if (isNaN(units)) continue;

		// td[3]: Schedule column
		const { meetings, instructor } = parseScheduleColumn(cells[3].innerHTML);

		// td[4]: Remarks — may contain restriction info
		const remarksText = (cells[4]?.textContent ?? '').trim();

		// td[restrictionIdx]: Restrictions — department/college codes
		let restrictionsText = (cells[restrictionIdx]?.textContent ?? '').trim();
		restrictionsText = restrictionsText.replace(/<!--[\s\S]*?-->/g, '').trim();

		// Merge both sources — but only include remarks if they contain restriction-like text
		const parts: string[] = [];
		if (restrictionsText) parts.push(restrictionsText);
		if (remarksText && /for\s+|reserved/i.test(remarksText)) parts.push(remarksText);
		const restrictions = parts.join(' | ').replace(/\s+/g, ' ').trim();

		// Check if the restriction's "For:" clause names a program the user is in.
		const allowedProgram = (text: string) => {
			const m = text.match(/for\s*:\s*(.+?)(?:\||$)/i);
			if (!m) return false;
			const programs = m[1].split(/[,\/]/).map((p) => p.replace(/\(\d+\s*slots?\)/i, '').trim());
			return programs.some((p) => ALLOWED_PROGRAMS.includes(p));
		};

		// Auto-exclude: restrictions column has restriction codes the user does NOT match
		const excluded =
			(restrictionsText.length > 0 &&
				/for\s*:|reserved|^D\b/i.test(restrictionsText) &&
				!allowedProgram(restrictionsText)) ||
			(/for\s+.*only|reserved/i.test(remarksText) && !allowedProgram(remarksText));

		// td[6]: Enrolled / Capacity
		const enrolledText = (cells[6]?.textContent ?? '').trim();
		const { slotsLeft, capacity } = parseCapacity(enrolledText);

		// td[7]: Demand (with rowspan carry-over)
		let demand = 0;
		if (rowspanRemaining > 0) {
			demand = rowspanDemand;
			rowspanRemaining--;
		} else {
			const demandText = (cells[7]?.textContent ?? '').trim();
			demand = parseInt(demandText, 10) || 0;
			const rowspan = parseInt(cells[7]?.getAttribute('rowspan') ?? '1', 10);
			if (rowspan > 1) {
				rowspanDemand = demand;
				rowspanRemaining = rowspan - 1;
			}
		}

		sections.push({
			crn,
			code,
			units,
			meetings,
			instructor,
			slotsLeft,
			capacity,
			demand,
			restrictions,
			excluded
		});
	}

	return sections;
}
