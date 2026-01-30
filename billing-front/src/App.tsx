import { useState } from 'react';
import { FileText, Receipt, Layers } from 'lucide-react';
import { 
  LoginForm, 
  PendingListScreen, 
  BatchCreationScreen, 
  BatchResultScreen 
} from './components';
import { authService } from './services/api';
import { BatchCreationResult } from './types';

type Screen = 'list' | 'batch' | 'result';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [currentScreen, setCurrentScreen] = useState<Screen>('list');
  const [selectedPendingIds, setSelectedPendingIds] = useState<number[]>([]);
  const [batchResult, setBatchResult] = useState<BatchCreationResult | null>(null);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setCurrentScreen('list');
    setSelectedPendingIds([]);
    setBatchResult(null);
  };

  const handleSelectPendings = (ids: number[]) => {
    setSelectedPendingIds(ids);
    setCurrentScreen('batch');
  };

  const handleBatchSuccess = (result: BatchCreationResult) => {
    setBatchResult(result);
    setCurrentScreen('result');
    setSelectedPendingIds([]);
  };

  const handleNewBatch = () => {
    setBatchResult(null);
    setSelectedPendingIds([]);
    setCurrentScreen('list');
  };

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="brand">
          <Layers size={24} />
          <span>FACTURACIÓN</span>
        </div>
        <nav className="nav-tabs">
          <button
            className={currentScreen === 'list' ? 'active' : ''}
            onClick={() => setCurrentScreen('list')}
          >
            <FileText size={18} />
            Pendientes
          </button>
          <button
            className={currentScreen === 'batch' ? 'active' : ''}
            onClick={() => selectedPendingIds.length > 0 && setCurrentScreen('batch')}
            disabled={selectedPendingIds.length === 0}
          >
            <Receipt size={18} />
            Lote
          </button>
        </nav>
        <button onClick={handleLogout} className="logout-btn">
          Salir
        </button>
      </header>

      <main className="app-main">
        {currentScreen === 'list' && (
          <PendingListScreen
            onSelectPendings={handleSelectPendings}
            selectedIds={selectedPendingIds}
            setSelectedIds={setSelectedPendingIds}
          />
        )}
        {currentScreen === 'batch' && (
          <BatchCreationScreen
            selectedPendingIds={selectedPendingIds}
            onBack={() => setCurrentScreen('list')}
            onSuccess={handleBatchSuccess}
          />
        )}
        {currentScreen === 'result' && batchResult && (
          <BatchResultScreen
            result={batchResult}
            onNewBatch={handleNewBatch}
          />
        )}
      </main>
    </div>
  );
}

export default App;
