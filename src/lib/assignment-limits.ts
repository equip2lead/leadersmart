// Length limits for assignment responses and mentor feedback.
//
// Their own module because a 'use server' file may export nothing but async
// functions, and both the client panel (to draw the character counter) and
// the server actions (to enforce the limit) need the same numbers. Two copies
// would drift, and the counter would start promising a limit the server no
// longer honours.

/** Soft limit surfaced in the counter; also the hard stop server-side, so a
    crafted request cannot store a megabyte of prose. */
export const MAX_RESPONSE_LENGTH = 5000;

export const MAX_REVIEWER_COMMENT = 2000;
