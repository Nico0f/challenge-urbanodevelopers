import { useState, useEffect, useCallback } from 'react';
import { 
  FileText, Package, Users, Clock, DollarSign, CheckCircle2, 
  RefreshCw, AlertCircle, Loader2, ChevronRight 
} from 'lucide-react';
import { Filters } from './Filters';
import { StatusBadge } from './StatusBadge';
import { apiCall } from '../services/api';
import { 
  BillingPending, BillingPendingSummary, PaginatedResponse, 
  Filters as FiltersType, Pagination 
} from '../types';

interface PendingListScreenProps {
  onSelectPendings: (ids: number[]) => void;
  selectedIds: number[];
  setSelectedIds: (ids: number[]) => void;
}

export const PendingListScreen = ({ 
  onSelectPendings, 
  selectedIds, 
  setSelectedIds 
}: PendingListScreenProps) => {
  const [pendings, setPendings] = useState<BillingPending[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<BillingPendingSummary | null>(null);
  const [filters, setFilters] = useState<FiltersType>({});
  const [pagination, setPagination] = useState<Pagination>({ 
    page: 1, limit: 10, total: 0, totalPages: 0 
  });

  const loadPendings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        status: 'PENDING',
      };
      if (filters.customerId) params.customerId = filters.customerId;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;

      const data = await apiCall<PaginatedResponse<BillingPending>>(
        `/billing-pendings?${new URLSearchParams(params)}`
      );
      setPendings(data.data || []);
      setPagination(p => ({ ...p, total: data.total, totalPages: data.totalPages }));
      
      const summaryData = await apiCall<BillingPendingSummary>('/billing-pendings/summary');
      setSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    loadPendings();
  }, [loadPendings]);

  const toggleSelect = (id: number) => {
    setSelectedIds(
      selectedIds.includes(id) 
        ? selectedIds.filter(i => i !== id) 
        : [...selectedIds, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === pendings.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendings.map(p => p.id));
    }
  };

  const selectedAmount = pendings
    .filter(p => selectedIds.includes(p.id))
    .reduce((sum, p) => sum + Number(p.service?.amount || 0), 0);

  const formatCurrency = (value: number) => 
    value.toLocaleString('es-AR', { minimumFractionDigits: 2 });

  return (
    <div className="screen-container">
      <div className="screen-header">
        <div className="header-title">
          <FileText size={28} />
          <div>
            <h1>Pendientes de Facturación</h1>
            <p>Seleccione los items para facturar en lote</p>
          </div>
        </div>
        <button onClick={loadPendings} className="btn-icon" title="Actualizar">
          <RefreshCw size={20} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {summary && (
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-icon pending">
              <Clock size={24} />
            </div>
            <div className="summary-content">
              <span className="summary-value">{summary.totalPending}</span>
              <span className="summary-label">Pendientes</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon amount">
              <DollarSign size={24} />
            </div>
            <div className="summary-content">
              <span className="summary-value">${formatCurrency(summary.totalAmount)}</span>
              <span className="summary-label">Monto Total</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon customers">
              <Users size={24} />
            </div>
            <div className="summary-content">
              <span className="summary-value">{summary.byCustomer?.length || 0}</span>
              <span className="summary-label">Clientes</span>
            </div>
          </div>
          <div className="summary-card highlight">
            <div className="summary-icon selected">
              <CheckCircle2 size={24} />
            </div>
            <div className="summary-content">
              <span className="summary-value">{selectedIds.length}</span>
              <span className="summary-label">Seleccionados</span>
            </div>
            {selectedIds.length > 0 && (
              <span className="summary-sub">${formatCurrency(selectedAmount)}</span>
            )}
          </div>
        </div>
      )}

      <Filters
        filters={filters}
        onChange={setFilters}
        onApply={() => setPagination(p => ({ ...p, page: 1 }))}
        onClear={() => {
          setFilters({});
          setPagination(p => ({ ...p, page: 1 }));
        }}
        loading={loading}
      />

      {error && (
        <div className="error-banner">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th className="checkbox-cell">
                <input
                  type="checkbox"
                  checked={pendings.length > 0 && selectedIds.length === pendings.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th>ID</th>
              <th>Servicio</th>
              <th>Cliente</th>
              <th>Fecha Servicio</th>
              <th>Monto</th>
              <th>Estado</th>
              <th>Creado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="loading-cell">
                  <Loader2 className="spin" size={32} />
                  <span>Cargando pendientes...</span>
                </td>
              </tr>
            ) : pendings.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-cell">
                  <Package size={48} />
                  <span>No hay pendientes disponibles</span>
                </td>
              </tr>
            ) : (
              pendings.map((pending) => (
                <tr
                  key={pending.id}
                  className={selectedIds.includes(pending.id) ? 'selected' : ''}
                  onClick={() => toggleSelect(pending.id)}
                >
                  <td className="checkbox-cell" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(pending.id)}
                      onChange={() => toggleSelect(pending.id)}
                    />
                  </td>
                  <td><span className="mono">#{pending.id}</span></td>
                  <td><span className="mono">SVC-{pending.serviceId}</span></td>
                  <td>
                    <span className="customer-badge">
                      <Users size={14} />
                      {pending.service?.customerId || '-'}
                    </span>
                  </td>
                  <td>
                    {pending.service?.serviceDate 
                      ? new Date(pending.service.serviceDate).toLocaleDateString('es-AR') 
                      : '-'}
                  </td>
                  <td className="amount-cell">
                    ${formatCurrency(Number(pending.service?.amount || 0))}
                  </td>
                  <td><StatusBadge status={pending.status} /></td>
                  <td className="date-cell">
                    {new Date(pending.createdAt).toLocaleDateString('es-AR')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && pendings.length > 0 && (
        <div className="pagination">
          <span>Mostrando {pendings.length} de {pagination.total} registros</span>
          <div className="pagination-controls">
            <button
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
              disabled={pagination.page <= 1}
            >
              Anterior
            </button>
            <span className="page-info">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <button
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="floating-action">
          <div className="action-info">
            <CheckCircle2 size={20} />
            <span>{selectedIds.length} pendientes seleccionados</span>
            <span className="action-amount">${formatCurrency(selectedAmount)}</span>
          </div>
          <button onClick={() => onSelectPendings(selectedIds)} className="btn-action">
            Continuar a Facturación
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
};
