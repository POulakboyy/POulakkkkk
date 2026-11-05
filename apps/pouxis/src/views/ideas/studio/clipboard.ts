/** Copies text to the clipboard; resolves `false` when the platform refuses. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await globalThis.navigator?.clipboard?.writeText(text);
    return globalThis.navigator?.clipboard !== undefined;
  } catch {
    return false;
  }
}
