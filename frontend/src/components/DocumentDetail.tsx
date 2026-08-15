import { useEffect, useState } from 'react';
import { fetchDocument, type DocumentDetail as DocumentDetailData } from '../api';
import { formatDate } from '../format';

interface Props {
  id: number;
  onClose: () => void;
}

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; detail: DocumentDetailData };

export function DocumentDetail({ id, onClose }: Props) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    fetchDocument(id)
      .then((detail) => {
        if (!cancelled) setState({ status: 'success', detail });
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', message: (err as Error).message });
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Document details</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {state.status === 'loading' && (
          <div className="status visible loading">
            <span className="spinner" />
            Loading document...
          </div>
        )}

        {state.status === 'error' && (
          <div className="status visible error">Failed to load document: {state.message}</div>
        )}

        {state.status === 'success' && (
          <dl className="detail-list">
            <dt>Title</dt>
            <dd>{state.detail.title}</dd>
            <dt>Uploaded</dt>
            <dd>{formatDate(state.detail.uploaded_at)}</dd>
            <dt>Chunk count</dt>
            <dd>{state.detail.chunkCount}</dd>
          </dl>
        )}
      </div>
    </div>
  );
}
