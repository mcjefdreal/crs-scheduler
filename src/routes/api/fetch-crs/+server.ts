import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const ALLOWED_HOST = 'crs.upd.edu.ph';

/**
 * Validates that the given string is a proper URL pointing to crs.upd.edu.ph.
 */
function validateCrsUrl(urlStr: string): { ok: true; url: URL } | { ok: false; reason: string } {
	let parsed: URL;
	try {
		parsed = new URL(urlStr);
	} catch {
		return { ok: false, reason: 'Invalid URL format' };
	}

	if (parsed.hostname !== ALLOWED_HOST) {
		return { ok: false, reason: 'URL must be from crs.upd.edu.ph domain' };
	}

	if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
		return { ok: false, reason: 'URL must use http or https protocol' };
	}

	return { ok: true, url: parsed };
}

export const POST: RequestHandler = async ({ request }) => {
	let body: { url?: string; cookies?: string };

	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const urlStr = body.url;

	if (!urlStr || typeof urlStr !== 'string') {
		throw error(400, 'Missing or invalid "url" field');
	}

	const validation = validateCrsUrl(urlStr);
	if (!validation.ok) {
		throw error(403, validation.reason);
	}

	try {
		const headers: Record<string, string> = {
			'User-Agent':
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
		};

		if (body.cookies) {
			headers['Cookie'] = body.cookies;
		}

		const response = await fetch(validation.url.href, {
			headers,
			redirect: 'manual'
		});

		if (response.status >= 300 && response.status < 400) {
			const location = response.headers.get('location') || '';
			// Auth redirects: Google OAuth, or back to CRS homepage (login gate)
			if (
				/accounts\.google\.com|login/i.test(location) ||
				location === 'https://crs.upd.edu.ph/' ||
				location === 'http://crs.upd.edu.ph/'
			) {
				throw error(
					401,
					'CRS authentication required. Provide session cookies or use a public schedule URL (/schedule/...).'
				);
			}
			throw error(502, `CRS redirected unexpectedly to: ${location}`);
		}

		if (!response.ok) {
			throw error(502, `CRS server responded with status ${response.status}`);
		}

		const html = await response.text();

		if (!html || html.length < 100) {
			throw error(502, 'CRS returned empty or too-short response');
		}

		return json({ html, url: validation.url.href, size: html.length });
	} catch (e) {
		// Re-throw SvelteKit HttpError instances as-is
		if (e && typeof e === 'object' && 'status' in e && 'body' in e) {
			throw e;
		}

		const msg = e instanceof Error ? e.message : String(e);
		throw error(502, `Failed to fetch from CRS: ${msg}`);
	}
};
