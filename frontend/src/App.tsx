import { useState } from 'react';
import { UploadForm } from './components/UploadForm';
import { DocumentsList } from './components/DocumentsList';
import { QueryForm } from './components/QueryForm';
import './App.css';

function App() {
  const [refreshSignal, setRefreshSignal] = useState(0);

  return (
    <div className="container">
      <h1>Docent</h1>
      <p className="subtitle">Upload documents and ask questions about them.</p>
      <UploadForm onUploadSuccess={() => setRefreshSignal((n) => n + 1)} />
      <DocumentsList refreshSignal={refreshSignal} />
      <QueryForm />
    </div>
  );
}

export default App;
