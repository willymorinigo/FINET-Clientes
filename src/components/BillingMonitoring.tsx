import React, { useState, useMemo } from "react";
import { Client, Performance, Transaction, Advisor } from "../types";
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  ShieldAlert, 
  Calendar, 
  DollarSign, 
  User, 
  ArrowUpRight, 
  CheckCircle,
  Clock,
  ExternalLink,
  Percent
} from "lucide-react";
import { formatNumberARS } from "../lib/format";

interface BillingMonitoringProps {
  clients: Client[];
  performances: Performance[];
  transactions: Transaction[];
  advisors: Advisor[];
  onSelectClient: (client: Client) => void;
  onBack: () => void;
}

type BillingFilter = "all" | "pending" | "upcoming";

export default function BillingMonitoring({
  clients,
  performances,
  transactions,
  advisors,
  onSelectClient,
  onBack
}: BillingMonitoringProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<BillingFilter>("all");

  const today = useMemo(() => new Date(), []);

  // Compute billing status for all active clients
  const billingItems = useMemo(() => {
    return clients
      .filter(cli => cli.active)
      .map(cli => {
        const start = new Date(cli.startDate);
        const diffMs = today.getTime() - start.getTime();
        const activeDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        // Fee charged status (annual performance fee recorded)
        const hasFeeCharged = transactions.some(
          tx => tx.clientId === cli.id && tx.type === "annual_performance_fee"
        );

        // Calculate days left to next anniversary
        let nextAnniversary = new Date(start);
        nextAnniversary.setFullYear(today.getFullYear());
        if (nextAnniversary.getTime() < today.getTime()) {
          nextAnniversary.setFullYear(today.getFullYear() + 1);
        }
        const diffAnniversaryMs = nextAnniversary.getTime() - today.getTime();
        const daysLeft = Math.ceil(diffAnniversaryMs / (1000 * 60 * 60 * 24));

        // Start month check (for standard next month anticipation)
        const startMonth = start.getMonth();
        const nextMonthIndex = (today.getMonth() + 1) % 12;
        const isDueNextMonth = startMonth === nextMonthIndex;

        // Accumulated parameters
        const accumulatedProfit = cli.currentBalance - cli.initialCapital;
        const accumulatedProfitPercent = cli.initialCapital > 0 
          ? (accumulatedProfit / cli.initialCapital) * 100 
          : 0;

        // 10% performance fee estimated
        const estimatedFee = Math.max(0, accumulatedProfit * 0.10);

        // Category determination
        const isMilestoneReached = activeDays >= 365;
        const isPending = isMilestoneReached && !hasFeeCharged;
        const isUpcoming = !hasFeeCharged && (daysLeft <= 45 || isDueNextMonth);

        const advisor = advisors.find(a => a.id === cli.advisorId);

        return {
          client: cli,
          advisor,
          activeDays,
          hasFeeCharged,
          daysLeft,
          isDueNextMonth,
          isMilestoneReached,
          isPending, // Completed year but unpaid
          isUpcoming, // Anniversary approaching within 45 days or next calendar month
          accumulatedProfit,
          accumulatedProfitPercent,
          estimatedFee,
          nextAnniversaryFormatted: nextAnniversary.toISOString().split("T")[0]
        };
      });
  }, [clients, transactions, advisors, today]);

  // Apply filters and searches
  const filteredItems = useMemo(() => {
    return billingItems
      .filter(item => {
        // Text search
        const matchesSearch = 
          item.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.client.email && item.client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (item.advisor && item.advisor.name.toLowerCase().includes(searchTerm.toLowerCase()));

        if (!matchesSearch) return false;

        // Tab selection filters
        if (filterMode === "pending") {
          return item.isPending;
        }
        if (filterMode === "upcoming") {
          return item.isUpcoming && !item.isPending;
        }

        return true; // "all"
      })
      .sort((a, b) => {
        // Sort priority: Pending first, then by upcoming days leftmost
        if (a.isPending && !b.isPending) return -1;
        if (!a.isPending && b.isPending) return 1;
        return a.daysLeft - b.daysLeft;
      });
  }, [billingItems, searchTerm, filterMode]);

  // Stat summaries for general boxes
  const stats = useMemo(() => {
    return {
      totalPendingCount: billingItems.filter(i => i.isPending).length,
      totalUpcomingCount: billingItems.filter(i => i.isUpcoming && !i.isPending).length,
      totalEstimatedPendingFees: billingItems
        .filter(i => i.isPending)
        .reduce((sum, i) => sum + i.estimatedFee, 0),
      totalEstimatedUpcomingFees: billingItems
        .filter(i => i.isUpcoming && !i.isPending)
        .reduce((sum, i) => sum + i.estimatedFee, 0),
    };
  }, [billingItems]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm font-sans animate-[fadeIn_0.2s_ease-out]">
      
      {/* Header section with back option */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl transition shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[10px] bg-brand/15 text-slate-900 font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-brand/20">
              Módulo de Cobranzas
            </span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1">Monitoreo de Cobros y Vencimientos</h2>
            <p className="text-xs text-slate-500 font-medium">
              Controle los vencimientos anuales, aniversarios del 10% y anticipos de carteras activas.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <div className="px-3 py-2 bg-rose-50 border border-rose-100 rounded-xl">
            <span className="block text-[8px] uppercase font-bold text-rose-500">Pendientes (1 Año Cumplido)</span>
            <span className="text-sm font-bold text-rose-700 font-mono">
              {stats.totalPendingCount} cl. (${formatNumberARS(Math.round(stats.totalEstimatedPendingFees))})
            </span>
          </div>
          <div className="px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl">
            <span className="block text-[8px] uppercase font-bold text-amber-600">A vencer (Próximos 45 d)</span>
            <span className="text-sm font-bold text-amber-700 font-mono">
              {stats.totalUpcomingCount} cl. (${formatNumberARS(Math.round(stats.totalEstimatedUpcomingFees))})
            </span>
          </div>
        </div>
      </div>

      {/* FILTER BUTTONS AND SEARCH BAR */}
      <div className="py-4 flex flex-col md:flex-row justify-between gap-3 items-center">
        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl self-start w-full md:w-auto">
          <button
            onClick={() => setFilterMode("all")}
            className={`flex-1 md:flex-initial px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterMode === "all" 
                ? "bg-white text-slate-900 shadow-sm" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Todos los Activos ({billingItems.length})
          </button>
          <button
            onClick={() => setFilterMode("pending")}
            className={`flex-1 md:flex-initial px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
              filterMode === "pending" 
                ? "bg-rose-600 text-white shadow-sm" 
                : "text-rose-600 hover:bg-rose-50"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Pendientes ({stats.totalPendingCount})
          </button>
          <button
            onClick={() => setFilterMode("upcoming")}
            className={`flex-1 md:flex-initial px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
              filterMode === "upcoming" 
                ? "bg-amber-500 text-slate-950 shadow-sm font-bold" 
                : "text-amber-700 hover:bg-amber-50"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Próximos vtos. ({stats.totalUpcomingCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente o asesor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 text-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-0 focus:border-brand outline-none transition"
          />
        </div>
      </div>

      {/* RENDER TABLE */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl mt-1">
          <Clock className="w-8 h-8 text-slate-350 mx-auto mb-2 animate-pulse" />
          <h3 className="text-xs font-bold text-slate-700">No se encontraron clientes</h3>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1">
            No hay inversores que cumplan con la categoría de filtrado seleccionada ({filterMode}) con los criterios de búsqueda actuales.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-150 rounded-xl mt-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] tracking-wider uppercase">
                <th className="p-3 pl-4">Cliente / Contacto</th>
                <th className="p-3">AsesorAsignado</th>
                <th className="p-3">Fecha Ingreso / Antigüedad</th>
                <th className="p-3 text-right">Rendimiento Acumulada</th>
                <th className="p-3 text-right text-rose-700 bg-rose-50/30">Honorarios Est. (10%)</th>
                <th className="p-3 text-center">Estado</th>
                <th className="p-3 pr-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map(item => {
                const isProfitPositive = item.accumulatedProfit > 0;
                return (
                  <tr 
                    key={item.client.id} 
                    className="hover:bg-slate-50/70 transition duration-150 group"
                  >
                    {/* Cliente Info */}
                    <td className="p-3 pl-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200 uppercase">
                          {item.client.name.substring(0, 2)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 text-[12px] block group-hover:text-brand transition duration-150">
                            {item.client.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {item.client.phone} {item.client.email ? `• ${item.client.email}` : ""}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Asesor */}
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold">{item.advisor?.name || "Asesor General"}</span>
                      </div>
                    </td>

                    {/* Fecha de ingreso / Antigüedad */}
                    <td className="p-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-slate-755 font-mono text-[11px]">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{item.client.startDate}</span>
                        </div>
                        <span className="block text-[10px] text-slate-500 font-medium font-sans">
                          {item.activeDays} días de gestión
                        </span>
                      </div>
                    </td>

                    {/* Rendimiento acumulado */}
                    <td className="p-3 text-right">
                      <div className="space-y-0.5 font-mono">
                        <span className={`font-bold block ${isProfitPositive ? 'text-emerald-600' : 'text-slate-600'}`}>
                          {isProfitPositive ? "+" : ""}${formatNumberARS(Math.round(item.accumulatedProfit))}
                        </span>
                        <span className={`text-[10px] font-bold block ${isProfitPositive ? 'text-emerald-500' : 'text-slate-500'}`}>
                          {isProfitPositive ? "+" : ""}{item.accumulatedProfitPercent.toFixed(1)}%
                        </span>
                      </div>
                    </td>

                    {/* Honorarios Estimados */}
                    <td className="p-3 text-right font-mono bg-rose-50/10 font-bold">
                      <span className="text-red-700">
                        ${formatNumberARS(Math.round(item.estimatedFee))} ARS
                      </span>
                      <span className="block text-[8px] text-slate-400 uppercase tracking-widest font-sans font-medium mt-0.5">
                        Basado en cartera
                      </span>
                    </td>

                    {/* Estado de cobro */}
                    <td className="p-3 text-center">
                      {item.isPending ? (
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border border-red-200 animate-pulse">
                          <ShieldAlert className="w-3 h-3 text-red-600" />
                          Cobro Pendiente (1 Año)
                        </span>
                      ) : item.isUpcoming ? (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Vence en {item.daysLeft} d ({item.nextAnniversaryFormatted})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border border-emerald-100">
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                          Al Día
                        </span>
                      )}
                    </td>

                    {/* Acción */}
                    <td className="p-3 pr-4 text-right">
                      <button
                        onClick={() => onSelectClient(item.client)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg hover:border-brand hover:bg-slate-50 text-[11px] font-bold text-slate-700 hover:text-slate-900 shadow-sm transition-all duration-150"
                      >
                        Gestionar
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Helpful Info Alert */}
      <div className="mt-6 flex gap-3 p-4 bg-slate-50 border border-slate-250 rounded-xl text-xs text-slate-600">
        <div className="p-1 rounded-full bg-indigo-50 border border-indigo-100 self-start text-indigo-500 shrink-0">
          <Percent className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-slate-800">Criterio y Protocolo de Cobro</h4>
          <p className="leading-relaxed">
            FINET calcula un <strong>10% por rendimiento</strong> ("Performance Fee") sobre la rentabilidad líquida acumulada en el aniversario de 1 año del cliente. En esta tabla figuran tanto los que ya completaron el ciclo de gestión y están pendientes de facturar, como aquéllos clientes con vencimientos próximos a cumplirse en el mes venidero para anticipación.
          </p>
        </div>
      </div>

    </div>
  );
}
