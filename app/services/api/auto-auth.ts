import { tokenStorage } from "./token.storage";

export async function ensureAuth(): Promise<void> {
  if (!(await tokenStorage.get())) throw new Error('Please sign in to continue.');
}
