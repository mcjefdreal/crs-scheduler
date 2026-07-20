export interface Meeting {
	days: number[]; // 0=Mon..6=Sun, but only 0-5 used
	startMin: number; // minutes from midnight
	endMin: number; // minutes from midnight
	type: string; // "lec", "lab", "disc", etc.
	room: string;
}

export interface Section {
	crn: number;
	code: string; // e.g. "Eng 13 WFU-3"
	units: number;
	meetings: Meeting[];
	instructor: string;
	slotsLeft: number;
	capacity: number;
	demand: number;
	restrictions: string; // e.g. "Arch: For: Arch", "For: Freshman, DECL(20 slots)"
	excluded: boolean; // auto-set by parser if section has access restrictions
}

export interface Course {
	id: string; // unique, e.g. "eng-13"
	name: string; // e.g. "Eng 13"
	sections: Section[];
	sourceUrl: string; // URL where this was scraped from
	scrapedAt: number; // timestamp
	priority: number; // 0-5, higher = preferred (0 = no priority)
}

export interface Schedule {
	sections: Section[]; // one per course
	score: number; // higher = better chance
}

export interface ScheduleResult {
	schedules: Schedule[];
	lockedConflict?: boolean; // true when locked CRNs overlap with each other
}
