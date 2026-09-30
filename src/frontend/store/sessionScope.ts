/** A browser identity epoch: private state and late replies share this boundary. */
let generation = 0;
const resets = new Set<() => void>();

export function sessionGeneration() {
  return generation;
}
export function registerAccountReset(reset: () => void) {
  resets.add(reset);
}
export function resetAccountScope() {
  generation += 1;
  for (const reset of resets) reset();
  try {
    localStorage.removeItem("selectedChatId");
  } catch {
    /* storage may be unavailable */
  }
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("chatlyzer:session-changed"));
  return generation;
}
export function assertCurrentSession(expected: number) {
  if (expected !== generation) {
    const error = new Error("This request belongs to a previous session.");
    error.name = "AbortError";
    throw error;
  }
}
