import { RESEND_API_KEY, RESEND_AUDIENCE_ID } from 'astro:env/server';

/** The newsletter needs an audience to add the address to as well. */
export const newsletterConfigured = Boolean(RESEND_API_KEY && RESEND_AUDIENCE_ID);
