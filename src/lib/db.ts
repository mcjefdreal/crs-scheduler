import Dexie from 'dexie';
import type { Course } from './types';

class CRSDatabase extends Dexie {
	courses!: Dexie.Table<Course, string>;

	constructor() {
		super('CRSScheduler');
		this.version(1).stores({
			courses: 'id, name, scrapedAt'
		});
	}
}

export const db = new CRSDatabase();
