import { env } from '$env/dynamic/private';

/** Set SURVEY_LAUNCHED=true and redeploy to switch the site from the waitlist to the real survey. */
export const surveyLaunched = env.SURVEY_LAUNCHED === 'true';
