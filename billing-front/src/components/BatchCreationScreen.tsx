import { useState, useEffect, FormEvent } from 'react';
import { 
  Receipt, ChevronRight, Calendar, FileText, Package, 
  Hash, Users, Loader2, AlertCircle, Zap 
} from 'lucide-react';
import { apiCall } from '../services/api';
import { BillingPending, BatchCreationResult } from '../types';

interface BatchCreationScreenProps {
  selectedPendingIds: number[];
  onBack: () => void;
  onSuccess: (result: BatchCreationResult) => void;
}

export const BatchCreationScreen = ({ 
  selectedPendingIds, 
  onBack, 
  onSuccess 
}: BatchCreationScreenProps) => {
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptBook, setReceiptBook] = useState('');
  const [receiptBooks, setReceiptBooks] = useState<string[]>([]);
  const [nextNumber, setNextNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [error, setError] = useState('');
  const [pendingDetails, setPendingDetails] = useState<BillingPending[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const books = await apiCall<string[]>('/billing-batches/receipt-books');
        setReceiptBooks(books || []);
        
        const pendingsPromises = selectedPendingIds.map(id => 
          apiCall<BillingPending>(`/billing-pendings/${id}`).catch(() => null)
        );
        const results = await Promise.all(pendingsPromises);
        setPendingDetails(results.filter((r): r is BillingPending => r !== null));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar datos');
      } finally {
        setLoadingBooks(false);
      }
    };
    loadData();
  }, [selectedPendingIds]);

  useEffect(() => {
    const loadNextNumber = async () => {
      if (receiptBook) {
        try {
          const data = await apiCall<{ nextNumber: string }>(
            `/billing-batches/next-invoice-number/${encodeURIComponent(receiptBook)}`
          );
          setNextNumber(data.nextNumber);
        } catch {
          setNextNumber(null);
        }
      }
    };
    loadNextNumber();
  }, [receiptBook]);

  const totalAmount = pendingDetails.reduce(
    (sum, p) => sum + Number(p.service?.amount || 0), 0
  );

  const formatCurrency = (value: number) => 
    value.toLocaleString('es-AR', { minimumFractionDigits: 2 });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!receiptBook.trim()) {
      setError('Debe ingresar un talonario');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const result = await apiCall<BatchCreationResult>('/billing-batches', {
        method: 'POST',
        body: JSON.stringify({
          issueDate,
          receiptBook: receiptBook.trim(),
          pendingIds: selectedPendingIds,
        }),
      });
      onSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear lote');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen-container">
      <div className="screen-header">
        <button onClick={onBack} className="btn-back">
          <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
          Volver
        </button>
        <div className="header-title">
          <Receipt size={28} />
          <div>
            <h1>Crear Lote de Facturación</h1>
            <p>Configure los datos del lote para procesar</p>
          </div>
        </div>
      </div>

      <div className="batch-layout">
        <div className="batch-form-container">
          <form onSubmit={handleSubmit} className="batch-form">
            <div className="form-section">
              <h3><Calendar size={18} /> Datos del Lote</h3>
              
              <div className="form-group">
                <label>Fecha de Emisión</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Talonario</label>
                <div className="input-with-select">
                  <input
                    type="text"
                    placeholder="Ej: A-0001"
                    value={receiptBook}
                    onChange={(e) => setReceiptBook(e.target.value)}
                    required
                    list="receipt-books"
                  />
                  <datalist id="receipt-books">
                    {receiptBooks.map(book => (
                      <option key={book} value={book} />
                    ))}
                  </datalist>
                </div>
                {receiptBooks.length > 0 && (
                  <small className="hint">
                    Talonarios existentes: {receiptBooks.join(', ')}
                  </small>
                )}
              </div>

              {nextNumber && (
                <div className="next-number-info">
                  <Hash size={16} />
                  <span>Próximo número: <strong>{nextNumber}</strong></span>
                </div>
              )}
            </div>

            <div className="form-section">
              <h3><FileText size={18} /> Resumen del Lote</h3>
              <div className="batch-summary">
                <div className="summary-row">
                  <span>Pendientes a facturar:</span>
                  <strong>{selectedPendingIds.length}</strong>
                </div>
                <div className="summary-row">
                  <span>Monto total:</span>
                  <strong className="amount">${formatCurrency(totalAmount)}</strong>
                </div>
              </div>
            </div>

            {error && (
              <div className="error-banner">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="btn-submit" disabled={loading || !receiptBook}>
              {loading ? (
                <>
                  <Loader2 className="spin" size={20} />
                  Procesando...
                </>
              ) : (
                <>
                  <Zap size={20} />
                  Ejecutar Facturación
                </>
              )}
            </button>
          </form>
        </div>

        <div className="batch-preview">
          <h3>
            <Package size={18} />
            Pendientes Seleccionados ({pendingDetails.length})
          </h3>
          <div className="preview-list">
            {loadingBooks ? (
              <div className="loading-preview">
                <Loader2 className="spin" size={24} />
                <span>Cargando detalles...</span>
              </div>
            ) : (
              pendingDetails.map((pending) => (
                <div key={pending.id} className="preview-item">
                  <div className="preview-main">
                    <span className="preview-id">#{pending.id}</span>
                    <span className="preview-service">SVC-{pending.serviceId}</span>
                  </div>
                  <div className="preview-details">
                    <span className="preview-customer">
                      <Users size={12} />
                      Cliente {pending.service?.customerId}
                    </span>
                    <span className="preview-date">
                      {pending.service?.serviceDate 
                        ? new Date(pending.service.serviceDate).toLocaleDateString('es-AR') 
                        : '-'}
                    </span>
                  </div>
                  <div className="preview-amount">
                    ${formatCurrency(Number(pending.service?.amount || 0))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
