import { useState } from 'react';
import { compareSearch, type CompareChunk, type CompareResponse } from '../api';

type Status = { type: 'loading' | 'error'; message: string } | null;

const COLUMNS: { key: keyof CompareResponse; label: string; emptyMessage: string }[] = [
  { key: 'vectorOnly', label: 'Vector Search (semantic)', emptyMessage: 'No results.' },
  {
    key: 'keywordOnly',
    label: 'Keyword Search (exact terms)',
    emptyMessage: 'No results — no literal keyword matches found.',
  },
  { key: 'hybrid', label: 'Hybrid Search (combined)', emptyMessage: 'No results.' },
];

function previewText(content: string): string {
  const trimmed = content.trim();
  return trimmed.length > 120 ? `${trimmed.slice(0, 120)}…` : trimmed;
}

function countOverlap(result: CompareResponse): Map<number, number> {
  const counts = new Map<number, number>();
  for (const column of [result.vectorOnly, result.keywordOnly, result.hybrid]) {
    const seen = new Set<number>();
    for (const chunk of column) {
      if (seen.has(chunk.id)) continue;
      seen.add(chunk.id);
      counts.set(chunk.id, (counts.get(chunk.id) ?? 0) + 1);
    }
  }
  return counts;
}

function matchClass(count: number | undefined): string {
  if (count === 3) return 'match-all';
  if (count === 2) return 'match-two';
  return '';
}

export function CompareSearch() {
  const [question, setQuestion] = useState('');
  const [status, setStatus] = useState<Status>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);

  const submitting = status?.type === 'loading';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!question.trim()) {
      setStatus({ type: 'error', message: 'Please enter a question.' });
      return;
    }

    setResult(null);
    setStatus({ type: 'loading', message: 'Comparing search methods...' });

    try {
      const data = await compareSearch(question.trim());
      setStatus(null);
      setResult(data);
    } catch (err) {
      setStatus({ type: 'error', message: `Comparison failed: ${(err as Error).message}` });
    }
  }

  const overlapCounts = result ? countOverlap(result) : null;

  return (
    <div className="card">
      <h2>Compare Search Methods</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="compare-question-input">Question</label>
          <br />
          <input
            id="compare-question-input"
            type="text"
            placeholder="e.g. cloud file storage for 3D models"
            required
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </div>
        <button type="submit" disabled={submitting}>
          Compare
        </button>
      </form>
      {status && (
        <div className={`status visible ${status.type}`}>
          {status.type === 'loading' && <span className="spinner" />}
          {status.message}
        </div>
      )}
      {result && overlapCounts && (
        <div className="compare-results">
          <p className="compare-explainer">
            This compares three retrieval strategies on the same question — notice how they can
            disagree.
          </p>
          <div className="compare-legend">
            <span className="legend-item">
              <span className="legend-swatch match-all" /> in all 3 methods
            </span>
            <span className="legend-item">
              <span className="legend-swatch match-two" /> in 2 methods
            </span>
          </div>
          <div className="compare-columns">
            {COLUMNS.map((col) => {
              const chunks: CompareChunk[] = result[col.key];
              return (
                <div key={col.key} className="compare-column">
                  <h3>{col.label}</h3>
                  {chunks.length === 0 ? (
                    <p className="empty-state">{col.emptyMessage}</p>
                  ) : (
                    <ul className="compare-chunk-list">
                      {chunks.map((chunk) => (
                        <li
                          key={chunk.id}
                          className={`compare-chunk-item ${matchClass(overlapCounts.get(chunk.id))}`}
                        >
                          <div className="compare-chunk-preview">{previewText(chunk.content)}</div>
                          <div className="compare-chunk-id">chunk #{chunk.id}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
