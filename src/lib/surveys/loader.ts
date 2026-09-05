/**
 * Server-only survey loader. New edition = new `src/lib/surveys/<year>/survey.yml`
 * directory. Zero code changes, picked up automatically at build time
 * (raw text inlined via eager glob, so it also works in the production bundle
 * where `src/*.yml` files don't exist on disk).
 *
 * RULE: client components must import from `definition.ts`, never from here
 * (this module pulls in `yaml` + node file concepts via Vite `?raw`).
 */
import { parse } from 'yaml';
import { parseSurvey, type SurveyDef } from './definition';

const rawModules = import.meta.glob('./*/survey.yml', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

function editionFromPath(path: string): string {
	const match = path.match(/\.\/([^/]+)\/survey\.yml$/);
	return match ? match[1] : path;
}

const cache = new Map<string, SurveyDef>();

export function listEditions(): string[] {
	return Object.keys(rawModules).map(editionFromPath).sort();
}

export class UnknownEditionError extends Error {}

export function loadSurvey(edition: string): SurveyDef {
	const cached = cache.get(edition);
	if (cached) return cached;
	const entry = Object.entries(rawModules).find(([path]) => editionFromPath(path) === edition);
	if (!entry) {
		throw new UnknownEditionError(
			`Unknown survey edition "${edition}" (available: ${listEditions().join(', ') || 'none'})`
		);
	}
	const def = parseSurvey(parse(entry[1]));
	cache.set(edition, def);
	return def;
}

/** The edition currently served at `/survey`. Bump for 2027+. */
export const CURRENT_EDITION = '2026';
