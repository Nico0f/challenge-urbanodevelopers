const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3057';

export const apiCall = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error de conexión' }));
    throw new Error(error.message || 'Error en la solicitud');
  }
  
  return response.json();
};

export const authService = {
  login: async (username: string, password: string) => {
    const data = await apiCall<{ accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    localStorage.setItem('authToken', data.accessToken);
    return data;
  },
  
  logout: () => {
    localStorage.removeItem('authToken');
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
  },
};

export const pendingsService = {
  getAll: (params: Record<string, string>) => {
    const searchParams = new URLSearchParams(params);
    return apiCall(`/billing-pendings?${searchParams}`);
  },
  
  getById: (id: number) => {
    return apiCall(`/billing-pendings/${id}`);
  },
  
  getSummary: () => {
    return apiCall('/billing-pendings/summary');
  },
  
  getAvailable: () => {
    return apiCall('/billing-pendings/available');
  },
};

export const batchService = {
  create: (data: { issueDate: string; receiptBook: string; pendingIds: number[] }) => {
    return apiCall('/billing-batches', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  getAll: (params: Record<string, string>) => {
    const searchParams = new URLSearchParams(params);
    return apiCall(`/billing-batches?${searchParams}`);
  },
  
  getById: (id: number) => {
    return apiCall(`/billing-batches/${id}`);
  },
  
  getReceiptBooks: (): Promise<string[]> => {
    return apiCall('/billing-batches/receipt-books');
  },
  
  getNextInvoiceNumber: (receiptBook: string) => {
    return apiCall<{ receiptBook: string; nextNumber: string }>(
      `/billing-batches/next-invoice-number/${encodeURIComponent(receiptBook)}`
    );
  },
};
