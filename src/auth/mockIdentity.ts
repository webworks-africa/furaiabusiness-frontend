import { config } from "../api/config";
export const mockIdentityKey = "furaia.development.mock-member";
export function rememberMockIdentity(role: string) {
  if (config.mock) {
    try {
      sessionStorage.setItem(mockIdentityKey, role);
    } catch {
      /* Mock session remains memory-only. */
    }
  }
}
export function clearMockIdentity() {
  if (config.mock) {
    try {
      sessionStorage.removeItem(mockIdentityKey);
    } catch {
      /* No credential is stored. */
    }
  }
}
