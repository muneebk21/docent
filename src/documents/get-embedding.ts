import { pipeline } from '@xenova/transformers';

export async function getEmbedding(text: string): Promise<number[]> {
  const extractor = await pipeline(
    'feature-extraction',
    'Xenova/all-MiniLM-L6-v2',
  );
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data) as number[];
}
