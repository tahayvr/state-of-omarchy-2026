/**
 * Country options built from the Intl API — zero dependencies, locale-aware.
 * Client-safe (no imports).
 */

export interface CountryOption {
	value: string; // ISO 3166-1 alpha-2, lowercase
	label: string;
}

const FALLBACK: CountryOption[] = [
	{ value: 'us', label: 'United States' },
	{ value: 'gb', label: 'United Kingdom' },
	{ value: 'de', label: 'Germany' },
	{ value: 'fr', label: 'France' },
	{ value: 'nl', label: 'Netherlands' },
	{ value: 'ca', label: 'Canada' },
	{ value: 'au', label: 'Australia' },
	{ value: 'in', label: 'India' },
	{ value: 'br', label: 'Brazil' },
	{ value: 'jp', label: 'Japan' }
];

export function getCountryOptions(locale = 'en'): CountryOption[] {
	try {
		if (typeof Intl.supportedValuesOf !== 'function') return FALLBACK;
		const supportedValuesOf = Intl.supportedValuesOf as (key: string) => string[];
		const regions = supportedValuesOf('region').filter((c) => /^[A-Z]{2}$/.test(c));
		const names = new Intl.DisplayNames([locale, 'en'], { type: 'region' });
		const options = regions
			.map((code) => ({ value: code.toLowerCase(), label: names.of(code) ?? code }))
			.filter((o) => o.label !== o.value.toUpperCase());
		if (options.length > 100) {
			return options.sort((a, b) => a.label.localeCompare(b.label, locale));
		}
		return FALLBACK;
	} catch {
		return FALLBACK;
	}
}
