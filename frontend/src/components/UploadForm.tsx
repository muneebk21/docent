import { useRef, useState } from 'react';
import { uploadDocument } from '../api';

type Status = { type: 'loading' | 'error' | 'success'; message: string } | null;

interface Props {
  onUploadSuccess?: () => void;
}

export function UploadForm({ onUploadSuccess }: Props) {
  const [status, setStatus] = useState<Status>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const submitting = status?.type === 'loading';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!file || !title.trim()) {
      setStatus({ type: 'error', message: 'Please choose a PDF file and enter a title.' });
      return;
    }

    setStatus({ type: 'loading', message: 'Uploading and ingesting document...' });

    try {
      const { id } = await uploadDocument(file, title.trim());
      setStatus({ type: 'success', message: `Uploaded successfully. Document id: ${id}` });
      onUploadSuccess?.();
      setTitle('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setStatus({ type: 'error', message: `Upload failed: ${(err as Error).message}` });
    }
  }

  return (
    <div className="card">
      <h2>Upload Document</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="file-input">PDF file</label>
          <br />
          <input
            id="file-input"
            type="file"
            accept=".pdf"
            required
            ref={fileInputRef}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div>
          <label htmlFor="title-input">Title</label>
          <br />
          <input
            id="title-input"
            type="text"
            placeholder="Document title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <button type="submit" disabled={submitting}>
          Upload
        </button>
      </form>
      {status && (
        <div className={`status visible ${status.type}`}>
          {status.type === 'loading' && <span className="spinner" />}
          {status.message}
        </div>
      )}
    </div>
  );
}
