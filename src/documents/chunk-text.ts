export function chunkText(
  text: string,
  chunkSize: number,
  overlap: number,
): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const t = text.slice(i, i + chunkSize);
    i = i + (chunkSize - overlap);
    chunks.push(t);
  }

  return chunks;
}
