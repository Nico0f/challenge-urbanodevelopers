import { 
  CheckCircle2, Layers, DollarSign, Receipt, XCircle, 
  AlertCircle, ArrowRight 
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { BatchCreationResult } from '../types';

interface BatchResultScreenProps {
  result: BatchCreationResult;
  onNewBatch: () => void;
}

export const BatchResultScreen = ({ result, onNewBatch }: BatchResultScreenProps) => {
  const { batch, invoices, summary } = result;

  const formatCurrency = (value: number) => 
    value.toLocaleString('es-AR', { minimumFractionDigits: 2 });

  return (
    <div className="screen-container">
      <div className="screen-header success">
        <div className="header-title">
          <div className="success-icon">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <h1>¡Lote Procesado Exitosamente!</h1>
            <p>Se han generado las facturas correspondientes</p>
          </div>
        </div>
      </div>

      <div className="result-grid">
        <div className="result-card batch-info">
          <h3><Layers size={20} /> Información del Lote</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>ID del Lote</label>
              <span className="mono">#{batch.id}</span>
            </div>
            <div className="info-item">
              <label>Talonario</label>
              <span className="mono">{batch.receiptBook}</span>
            </div>
            <div className="info-item">
              <label>Fecha de Emisión</label>
              <span>{new Date(batch.issueDate).toLocaleDateString('es-AR')}</span>
            </div>
            <div className="info-item">
              <label>Estado</label>
              <StatusBadge status={batch.status} />
            </div>
            <div className="info-item">
              <label>Fecha de Proceso</label>
              <span>{new Date(batch.createdAt).toLocaleString('es-AR')}</span>
            </div>
          </div>
        </div>

        <div className="result-card summary-info">
          <h3><DollarSign size={20} /> Resumen</h3>
          <div className="summary-big">
            <div className="big-stat">
              <span className="big-value">{summary.totalInvoices}</span>
              <span className="big-label">Facturas Generadas</span>
            </div>
            <div className="big-stat highlight">
              <span className="big-value">${formatCurrency(summary.totalAmount)}</span>
              <span className="big-label">Monto Total</span>
            </div>
          </div>
          {summary.failedPendings?.length > 0 && (
            <div className="failed-warning">
              <AlertCircle size={16} />
              <span>{summary.failedPendings.length} pendientes no procesados</span>
            </div>
          )}
        </div>
      </div>

      <div className="invoices-section">
        <h3><Receipt size={20} /> Facturas Generadas</h3>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Número Factura</th>
                <th>CAE</th>
                <th>Fecha Emisión</th>
                <th>Monto</th>
                <th>Pending ID</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>
                    <span className="invoice-number">{invoice.invoiceNumber}</span>
                  </td>
                  <td><span className="mono cae">{invoice.cae}</span></td>
                  <td>{new Date(invoice.issueDate).toLocaleDateString('es-AR')}</td>
                  <td className="amount-cell">
                    ${formatCurrency(Number(invoice.amount))}
                  </td>
                  <td><span className="mono">#{invoice.pendingId}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {summary.failedPendings?.length > 0 && (
        <div className="failed-section">
          <h3><XCircle size={20} /> Pendientes No Procesados</h3>
          <div className="failed-list">
            {summary.failedPendings.map((failed) => (
              <div key={failed.id} className="failed-item">
                <span className="failed-id">#{failed.id}</span>
                <span className="failed-reason">{failed.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="result-actions">
        <button onClick={onNewBatch} className="btn-primary">
          <ArrowRight size={20} />
          Crear Nuevo Lote
        </button>
      </div>
    </div>
  );
};
