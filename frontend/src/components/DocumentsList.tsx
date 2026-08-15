import { useCallback, useEffect, useState } from 'react';
import { deleteDocument, fetchDocuments, type DocumentSummary } from '../api';
import { formatDate } from '../format';
import { DocumentDetail } from './DocumentDetail';

interface Props {
  refreshSignal: number;
}

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; documents: DocumentSummary[] };

export function DocumentsList({ refreshSignal }: Props) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const documents = await fetchDocuments();
      setState({ status: 'success', documents });
    } catch (err) {
      setState({ status: 'error', message: (err as Error).message });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshSignal]);

  async function handleDelete(id: number, title: string) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;

    setDeleteError(null);
    try {
      await deleteDocument(id);
      await load();
    } catch (err) {
      setDeleteError(`Failed to delete "${title}": ${(err as Error).message}`);
    }
  }

  return (
    <div className="card">
      <h2>Documents</h2>

      {deleteError && <div className="status visible error">{deleteError}</div>}

      {state.status === 'loading' && (
        <div className="status visible loading">
          <span className="spinner" />
          Loading documents...
        </div>
      )}

      {state.status === 'error' && (
        <div className="status visible error">Failed to load documents: {state.message}</div>
      )}

      {state.status === 'success' && state.documents.length === 0 && (
        <p className="empty-state">No documents yet — upload one to get started.</p>
      )}

      {state.status === 'success' && state.documents.length > 0 && (
        <ul className="document-list">
          {state.documents.map((doc) => (
            <li key={doc.id} className="document-item">
              <div className="document-info">
                <button
                  type="button"
                  className="document-title"
                  onClick={() => setSelectedId(doc.id)}
                >
                  {doc.title}
                </button>
                <span className="document-date">{formatDate(doc.uploaded_at)}</span>
              </div>
              <button
                type="button"
                className="delete-button"
                onClick={() => handleDelete(doc.id, doc.title)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedId !== null && (
        <DocumentDetail id={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
