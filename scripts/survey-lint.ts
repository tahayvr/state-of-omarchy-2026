// pnpm survey:lint - referential integrity for every surveys edition yml.
// Run after ANY yml edit. Exits non-zero on error (warnings are advisory).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { lintSurvey, parseSurvey, SurveyParseError } from '../src/lib/surveys/definition';

const root = join(import.meta.dirname, '..', 'src', 'lib', 'surveys');
let errors = 0;
let warnings = 0;

for (const entry of readdirSync(root)) {
	const ymlPath = join(root, entry, 'survey.yml');
	try {
		if (!statSync(ymlPath).isFile()) continue;
	} catch {
		continue;
	}
	console.log(`\n--- ${entry}/survey.yml ---`);
	let def;
	try {
		def = parseSurvey(parse(readFileSync(ymlPath, 'utf8')));
	} catch (e) {
		errors++;
		console.error(
			`  ERROR: unparseable file (${e instanceof SurveyParseError ? e.message : String(e)})`
		);
		continue;
	}
	const issues = lintSurvey(def);
	if (issues.length === 0) console.log('  OK');
	for (const issue of issues) {
		if (issue.level === 'error') {
			errors++;
			console.error(`  ERROR: ${issue.message}`);
		} else {
			warnings++;
			console.warn(`  warning: ${issue.message}`);
		}
	}
}

console.log(`\n${errors} error(s), ${warnings} warning(s)`);
process.exit(errors > 0 ? 1 : 0);
