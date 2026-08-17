import { useState } from 'react';
import { UploadForm } from './components/UploadForm';
import { DocumentsList } from './components/DocumentsList';
import { QueryForm } from './components/QueryForm';
import { CompareSearch } from './components/CompareSearch';
import './App.css';

type View = 'home' | 'compare';

function App() {
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [view, setView] = useState<View>('home');

  return (
    <div className={`container ${view === 'compare' ? 'container-wide' : ''}`}>
      <h1>Docent</h1>
      <p className="subtitle">Upload documents and ask questions about them.</p>
      <nav className="nav-tabs">
        <button
          type="button"
          className={`nav-tab ${view === 'home' ? 'active' : ''}`}
          onClick={() => setView('home')}
        >
          Home
        </button>
        <button
          type="button"
          className={`nav-tab ${view === 'compare' ? 'active' : ''}`}
          onClick={() => setView('compare')}
        >
          Compare Search Methods
        </button>
      </nav>
      {view === 'home' ? (
        <>
          <UploadForm onUploadSuccess={() => setRefreshSignal((n) => n + 1)} />
          <DocumentsList refreshSignal={refreshSignal} />
          <QueryForm />
        </>
      ) : (
        <CompareSearch />
      )}
    </div>
  );
}

export default App;
