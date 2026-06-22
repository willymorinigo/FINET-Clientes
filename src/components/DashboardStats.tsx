import { Client, Performance, Transaction } from "../types";
import { DollarSign, Percent, TrendingUp, Users, ShieldAlert, Award } from "lucide-react";
import { formatNumberARS } from "../lib/format";

interface StatsProps {
  clients: Client[];
  performances: Performance[];
  transactions: Transaction[];
}

export default function DashboardStats({ clients, performances, transactions }: StatsProps) {
  // 1. Assets Under Management (AUM)
  const totalAUM = clients.reduce((acc, cli) => acc + (cli.active ? cli.currentBalance : 0), 0);

  // 2. Initial Setup Fees collected
  const totalSetupFees = clients.reduce((acc, cli) => acc + (cli.initialFee || 0), 0);

  // 3. Performance Fees collected
  const performanceFeesCharged = transactions
    .filter(tx => tx.type === "annual_performance_fee")
    .reduce((acc, tx) => acc + Math.abs(tx.amount), 0);

  // 4. Client Count
  const activeClients = clients.filter(c => c.active).length;

  // 5. Average Cumulative Return
  // Calculate average profit percentage across clients with initial capital > 0
  const clientsWithYields = clients.map(cli => {
    const profit = cli.currentBalance - cli.initialCapital;
    const profitPercent = (profit / cli.initialCapital) * 100;
    return profitPercent;
  });
  const avgReturn = clientsWithYields.length > 0 
    ? (clientsWithYields.reduce((acc, p) => acc + p, 0) / clientsWithYields.length)
    : 0;

  // 6. Milestone & Anniversaries Pending Review
  // Users with >= 365 days active and no annual_performance_fee transaction yet
  const eligibilityCount = clients.filter(cli => {
    const start = new Date(cli.startDate);
    const today = new Date();
    const diffMs = today.getTime() - start.getTime();
    const activeDays = diffMs / (1000 * 60 * 60 * 24);
    
    if (activeDays >= 365) {
      const hasFeeCharged = transactions.some(
        tx => tx.clientId === cli.id && tx.type === "annual_performance_fee"
      );
      return !hasFeeCharged;
    }
    return false;
  }).length;

  // 7. Upcoming and overdue clients for annual billing: only show ones due to expire in the next calendar month (for monthly billing anticipation)
  const upcomingClients = clients
    .map(cli => {
      const start = new Date(cli.startDate);
      const today = new Date();
      const diffMs = today.getTime() - start.getTime();
      const activeDays = diffMs / (1000 * 60 * 60 * 24);
      const hasFeeCharged = transactions.some(
        tx => tx.clientId === cli.id && tx.type === "annual_performance_fee"
      );
      const daysLeft = Math.round(365 - activeDays);
      
      const startMonth = start.getMonth();
      const nextMonthIndex = (today.getMonth() + 1) % 12;
      const isDueNextMonth = startMonth === nextMonthIndex;

      return {
        client: cli,
        daysLeft,
        hasFeeCharged,
        isDueNextMonth,
        isOverdue: daysLeft <= 0
      };
    })
    .filter(item => item.isDueNextMonth && !item.hasFeeCharged)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* AUM CARD */}
      <div id="stat-aum" className="bg-white border border-slate-200 text-slate-900 rounded-xl p-5 hover:border-brand transition-all duration-300 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
          <TrendingUp className="w-24 h-24 text-brand" />
        </div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-150">
            <DollarSign className="w-5 h-5 text-slate-800" />
          </div>
          <span className="text-sm font-medium text-slate-500">Fondos Administrados (AUM)</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold font-sans tracking-tight text-slate-800">
            ${formatNumberARS(totalAUM)}
          </span>
          <span className="text-xs text-slate-500 font-medium">ARS</span>
        </div>
        <p className="text-xs text-slate-400 mt-2">Suma de carteras activas de FINET</p>
      </div>

      {/* AVG RETURN CARD */}
      <div id="stat-avg-yield" className="bg-white border border-slate-200 text-slate-900 rounded-xl p-5 hover:border-emerald-300 transition-all duration-300 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
          <Percent className="w-24 h-24 text-emerald-500" />
        </div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center border border-emerald-100">
            <Percent className="w-5 h-5 text-emerald-600" />
          </div>
          <span className="text-sm font-medium text-slate-500">Rendimiento Promedio</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold font-sans tracking-tight text-emerald-600">
            +{avgReturn.toFixed(1)}%
          </span>
          <span className="text-xs text-slate-400">acumulado</span>
        </div>
        <p className="text-xs text-slate-400 mt-2">Retornos promedio ponderados de inversores</p>
      </div>

      {/* FEES COLLECTED */}
      <div id="stat-fees" className="bg-white border border-slate-200 text-slate-900 rounded-xl p-5 hover:border-brand transition-all duration-300 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
          <Award className="w-24 h-24 text-brand" />
        </div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-150">
            <Award className="w-5 h-5 text-slate-800" />
          </div>
          <span className="text-sm font-medium text-slate-500">Honorarios Totales</span>
        </div>
        <div>
          <span className="text-2xl font-bold font-sans tracking-tight text-slate-800">
            ${formatNumberARS(totalSetupFees + performanceFeesCharged)}
          </span>
          <div className="flex justify-between items-center text-xs text-slate-500 mt-2">
            <span>Portfolio: ${formatNumberARS(totalSetupFees)}</span>
            <span className="text-slate-800 font-semibold">Rend: ${formatNumberARS(performanceFeesCharged)}</span>
          </div>
        </div>
      </div>

      {/* ACTION LABELS / ANNIVERSARIES LIST */}
      <div id="stat-actions" className={`bg-white border rounded-xl p-5 transition-all duration-300 shadow-sm relative overflow-hidden group ${
        eligibilityCount > 0 ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200'
      }`}>
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
          <ShieldAlert className="w-24 h-24 text-amber-500" />
        </div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center border border-amber-100">
            <Users className="w-5 h-5 text-amber-600" />
          </div>
          <span className="text-sm font-medium text-slate-500">Monitoreo de Cobros</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold font-sans tracking-tight text-slate-800">
            {eligibilityCount}
          </span>
          <span className="text-xs text-slate-500 font-medium">pendientes</span>
        </div>
        <p className={`text-xs mt-2 ${eligibilityCount > 0 ? 'text-amber-700 font-semibold animate-pulse' : 'text-slate-400'}`}>
          {eligibilityCount > 0 
            ? "⚠️ Con hito de 1 año cumplido pendientes cobro 10%" 
            : "No hay aniversarios pendientes de cobro 10%"
          }
        </p>

        {upcomingClients.length > 0 ? (
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col gap-1 text-[11px] text-slate-700 relative z-10">
            <span className="block text-[9px] uppercase font-bold text-slate-450 tracking-wider mb-0.5">A vencer el mes próximo (anticipo):</span>
            {upcomingClients.map(item => {
              const estimatedFee = Math.round((item.client.currentBalance - item.client.initialCapital) * 0.1);
              return (
                <div key={item.client.id} className="flex justify-between items-center bg-slate-50/50 p-1 rounded hover:bg-slate-100/50 transition duration-150">
                  <span className="font-semibold text-slate-800 truncate max-w-[125px]">
                    {item.client.name}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-sans font-medium ${
                    item.isOverdue 
                      ? "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse font-bold" 
                      : "bg-slate-100 text-slate-650"
                  }`}>
                    {item.isOverdue 
                      ? `Vencido ($${formatNumberARS(estimatedFee > 0 ? estimatedFee : 0)})` 
                      : `Faltan ${item.daysLeft} d`
                    }
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[10px] text-slate-400 mt-2">Sin vencimientos para el mes próximo</p>
        )}
      </div>
    </div>
  );
}
