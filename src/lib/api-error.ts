/**
 * Canonical API error — thrown anywhere inside a route handler; `handleRoute`
 * converts it to a JSON response via `errorResponse`.
 *
 * Lives in its own module so low-level libs (session, otp) can throw typed
 * errors WITHOUT importing auth-helpers, which itself imports session —
 * keeping the import graph acyclic.
 */
export class ApiErr extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiErr";
  }
}
