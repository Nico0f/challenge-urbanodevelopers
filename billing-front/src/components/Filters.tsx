import { Filter, X, Search, Loader2 } from 'lucide-react';
import { Filters as FiltersType } from '../types';

interface FiltersProps {
  filters: FiltersType;
  onChange: (filters: FiltersType) => void;
  onApply: () => void;
  onClear: () => void;
  loading: boolean;
}

export const Filters = ({ filters, onChange, onApply, onClear, loading }: FiltersProps) => {
  return (
    <div className="filters-container">
      <div className="filters-header">
        <Filter size={18} />
        <span>Filtros</span>
      </div>
      <div className="filters-grid">
        <div className="filter-item">
          <label>Cliente ID</label>
          <input
            type="number"
            placeholder="Ej: 1, 2, 3..."
            value={filters.customerId || ''}
            onChange={(e) => onChange({ ...filters, customerId: e.target.value })}
          />
        </div>
        <div className="filter-item">
          <label>Fecha Desde</label>
          <input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
          />
        </div>
        <div className="filter-item">
          <label>Fecha Hasta</label>
          <input
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
          />
        </div>
      </div>
      <div className="filters-actions">
        <button onClick={onClear} className="btn-secondary" disabled={loading}>
          <X size={16} />
          Limpiar
        </button>
        <button onClick={onApply} className="btn-primary" disabled={loading}>
          {loading ? <Loader2 className="spin" size={16} /> : <Search size={16} />}
          Buscar
        </button>
      </div>
    </div>
  );
};
