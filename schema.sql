CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  filename TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE TABLE chunks (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,       -- position of this chunk within the document
  content TEXT NOT NULL,              -- the actual chunk text
  embedding VECTOR(384) NOT NULL,     -- 384 dims for all-MiniLM-L6-v2
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
