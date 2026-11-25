export const mockIdentity = { signedIn: false, expiresAt: 0 };
export function beginMockSession() {
  mockIdentity.signedIn = true;
  mockIdentity.expiresAt = Date.now() + 30 * 60_000;
}
export function endMockSession() {
  mockIdentity.signedIn = false;
  mockIdentity.expiresAt = 0;
}
export function hasMockSession() {
  return mockIdentity.signedIn && Date.now() < mockIdentity.expiresAt;
}
