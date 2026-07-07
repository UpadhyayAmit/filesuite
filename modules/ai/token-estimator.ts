export function estimateTokens(input: string): string {
  const chars = input.length;
  const words = input.trim() ? input.trim().split(/\s+/).length : 0;
  const roughByChars = Math.ceil(chars / 4);
  const roughByWords = Math.ceil(words * 1.33);
  const estimate = Math.max(roughByChars, roughByWords);

  return JSON.stringify(
    {
      estimatedTokens: estimate,
      characters: chars,
      words,
      notes: [
        'This is a local approximation, not a model tokenizer.',
        'Use a WASM tokenizer later for model-specific counts.',
        'No pricing is included because model prices change and should be configured separately.',
      ],
    },
    null,
    2,
  );
}
