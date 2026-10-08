// Placeholder — command bar / universal capture (1.8, 2.11) is implemented by its owner.
export function CommandBar() {
  return null;
}

/** Opens the command bar; wired by the shell to ⌘K / Ctrl+K and the capture button. */
export function openCommandBar(): void {
  window.dispatchEvent(new CustomEvent('pouxis:command-open'));
}
