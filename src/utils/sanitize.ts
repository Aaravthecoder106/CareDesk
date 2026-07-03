export function sanitizeForPrompt(text: string): string {
  return text
    .replace(/[<>]/g, "")
    .replace(/```/g, "")
    .replace(/\$\{/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .substring(0, 50000);
}
