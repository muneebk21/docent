export async function getEmbedding(text: string): Promise<number[]> {
  const { pipeline } = await import('@xenova/transformers');
  const extractor = await pipeline(
    'feature-extraction',
    'Xenova/all-MiniLM-L6-v2',
  );
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data) as number[];
}
