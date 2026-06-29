export interface Advisor {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Client {
  id: string;
  advisorId: string;
  name: string;
  email: string;
  phone: string;
  initialCapital: number;
  initialFee: number; // Cobro inicial por diseño de cartera
  startDate: string; // ISO String, e.g. "2025-05-15"
  active: boolean;
  currentBalance: number;
  notes: string;
  financialGoal: number; // El objetivo personalizado, e.g., $50000
  goalDescription: string;
  totalFunding?: number; // Total de fondeos adicionales cargados (no computables para ganancias)
}

export interface Performance {
  id: string;
  clientId: string;
  monthYear: string; // e.g., "2025-06"
  profitPercentage: number; // e.g., 2.5
  profitAmount: number; // e.g., 375
  notes: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  clientId: string;
  date: string; // ISO String, "2025-06-15"
  type: 'deposit' | 'withdrawal' | 'yield' | 'initial_advisory_fee' | 'annual_performance_fee';
  amount: number;
  assetCategory: 'Renta Fija' | 'Renta Variable' | 'Real Estate' | 'Cripto' | 'Efectivo';
  description: string;
}

export interface ClientDocument {
  id: string;
  clientId: string;
  title: string;
  category: 'Contrato' | 'Reporte' | 'Identificación' | 'Portafolio' | 'Otro';
  uploadDate: string;
  fileSize: string;
  status: 'Firmado' | 'Pendiente' | 'Borrador';
  url: string; // Mock or inline base64 / generated text
}

export interface Alert {
  id: string;
  clientId: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'milestone' | 'anniversary' | 'fee_charged' | 'portfolio_goal';
}
