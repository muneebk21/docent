import { useState } from 'react';
import { askQuestion, type QueryResponse } from '../api';

type Status = { type: 'loading' | 'error'; message: string } | null;

export function QueryForm() {
  const [question, setQuestion] = useState('');
  const [status, setStatus] = useState<Status>(null);
  const [result, setResult] = useState<QueryResponse | null>(null);

  const submitting = status?.type === 'loading';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!question.trim()) {
      setStatus({ type: 'error', message: 'Please enter a question.' });
      return;
    }

    setResult(null);
    setStatus({ type: 'loading', message: 'Asking...' });

    try {
      const data = await askQuestion(question.trim());
      setStatus(null);
      setResult(data);
    } catch (err) {
      setStatus({ type: 'error', message: `Query failed: ${(err as Error).message}` });
    }
  }

  return (
    <div className="card">
      <h2>Ask a Question</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="question-input">Question</label>
          <br />
          <input
            id="question-input"
            type="text"
            placeholder="What does the document say about..."
            required
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </div>
        <button type="submit" disabled={submitting}>
          Ask
        </button>
      </form>
      {status && (
        <div className={`status visible ${status.type}`}>
          {status.type === 'loading' && <span className="spinner" />}
          {status.message}
        </div>
      )}
      {result && (
        <div className="results">
          <div className="answer">{result.answer || '(no answer returned)'}</div>
          {result.sources.length > 0 && (
            <div>
              <div className="sources-heading">Sources</div>
              <ul className="source-list">
                {result.sources.map((source, i) => (
                  <li key={source.id ?? i} className="source-item">
                    {source.content}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
