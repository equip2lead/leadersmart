// One definition of what counts as an acceptable password.
//
// Shared rather than inlined because the rule is enforced in two places — the
// reset form and (eventually) the settings form — and a rule that disagrees
// with itself between screens teaches people that the error is arbitrary.
//
// Deliberately modest: a length floor and one digit. Supabase enforces its
// own minimum server-side, so this is about telling someone what is wrong
// before the round trip, not about being the only gate.

export const PASSWORD_MIN_LENGTH = 8;

/** Why a password was rejected, as an i18n key suffix. */
export type PasswordProblem = 'too_short' | 'no_number' | 'mismatch';

/**
 * Returns the first problem with a new-password pair, or null when it passes.
 *
 * Order matters: a too-short password that also fails to match should report
 * the length, because that is the thing the person has to fix either way.
 */
export function validateNewPassword(
  password: string,
  confirmation: string,
): PasswordProblem | null {
  if (password.length < PASSWORD_MIN_LENGTH) return 'too_short';
  if (!/[0-9]/.test(password)) return 'no_number';
  if (password !== confirmation) return 'mismatch';
  return null;
}

/** The i18n key for a problem, so callers do not hand-build the string. */
export function passwordProblemKey(problem: PasswordProblem): string {
  return `auth.reset.password_${problem}_error`;
}
