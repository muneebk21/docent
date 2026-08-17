const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000';

export interface UploadResponse {
  id: number;
}

export interface DocumentSummary {
  id: number;
  title: string;
  uploaded_at: string;
}

export interface DocumentDetail extends DocumentSummary {
  chunkCount: number;
}

export interface QuerySource {
  id: number;
  content: string;
  document_id: number;
}

export interface QueryResponse {
  answer: string;
  sources: QuerySource[];
}

export interface CompareChunk {
  id: number;
  content: string;
  document_id: number;
  score?: number;
}

export interface CompareResponse {
  vectorOnly: CompareChunk[];
  keywordOnly: CompareChunk[];
  hybrid: CompareChunk[];
}

async function parseJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return null;
  }
}

function toErrorMessage(res: Response, data: unknown, text?: string): string {
  if (data && typeof data === 'object' && ('message' in data || 'error' in data)) {
    const d = data as { message?: string; error?: string };
    return d.message ?? d.error ?? `${res.status} ${res.statusText}`;
  }
  return text || `${res.status} ${res.statusText}`;
}

export async function uploadDocument(file: File, title: string): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData,
    });
  } catch (err) {
    throw new Error(
      `${(err as Error).message} — is the backend running at ${API_BASE} and is CORS enabled?`,
    );
  }

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(toErrorMessage(res, data, text));
  }

  return data as UploadResponse;
}

export async function askQuestion(question: string): Promise<QueryResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
  } catch (err) {
    throw new Error(
      `${(err as Error).message} — is the backend running at ${API_BASE} and is CORS enabled?`,
    );
  }

  const data = await parseJson(res);

  if (!res.ok) {
    throw new Error(toErrorMessage(res, data));
  }

  return data as QueryResponse;
}

export async function compareSearch(question: string): Promise<CompareResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/query/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
  } catch (err) {
    throw new Error(
      `${(err as Error).message} — is the backend running at ${API_BASE} and is CORS enabled?`,
    );
  }

  const data = await parseJson(res);

  if (!res.ok) {
    throw new Error(toErrorMessage(res, data));
  }

  return data as CompareResponse;
}

export async function fetchDocuments(): Promise<DocumentSummary[]> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/documents`);
  } catch (err) {
    throw new Error(
      `${(err as Error).message} — is the backend running at ${API_BASE} and is CORS enabled?`,
    );
  }

  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(toErrorMessage(res, data));
  }

  return data as DocumentSummary[];
}

export async function fetchDocument(id: number): Promise<DocumentDetail> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/documents/${id}`);
  } catch (err) {
    throw new Error(
      `${(err as Error).message} — is the backend running at ${API_BASE} and is CORS enabled?`,
    );
  }

  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(toErrorMessage(res, data));
  }

  return data as DocumentDetail;
}

export async function deleteDocument(id: number): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/documents/${id}`, { method: 'DELETE' });
  } catch (err) {
    throw new Error(
      `${(err as Error).message} — is the backend running at ${API_BASE} and is CORS enabled?`,
    );
  }

  if (!res.ok) {
    const data = await parseJson(res);
    throw new Error(toErrorMessage(res, data));
  }
}
