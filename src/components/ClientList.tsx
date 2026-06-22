import React, { useState } from "react";
import { Client, Advisor } from "../types";
import { Plus, Search, Filter, Compass, Phone, Calendar, ArrowRight, TrendingUp, AlertTriangle } from "lucide-react";
import { motion } from "motion/react";
import { formatNumberARS } from "../lib/format";

// Dynamic thousands dot formatting for user input
const formatAmountInput = (val: string): string => {
  const digits = val.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(parseInt(digits, 10));
};

const parseAmountInput = (val: string): string => {
  return val.replace(/\D/g, "");
};

interface ClientListProps {
  clients: Client[];
  advisors: Advisor[];
  onSelectClient: (client: Client) => void;
  onAddClient: (newClient: Omit<Client, "id" | "currentBalance">) => void;
  currentAdvisor?: Advisor | null;
}

export const getAdvisorColor = (name: string) => {
  const normName = name.toLowerCase().trim();
  if (normName.includes("facu")) {
    return {
      border: "border-l-4 border-l-[#d97706] hover:border-amber-500",
      badge: "bg-amber-50 text-amber-700 border-amber-250",
      progress: "bg-[#d97706]",
      textHover: "group-hover:text-amber-600",
      accentBg: "bg-amber-50/50"
    };
  }
  if (normName.includes("mati")) {
    return {
      border: "border-l-4 border-l-[#059669] hover:border-emerald-500",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-250",
      progress: "bg-[#059669]",
      textHover: "group-hover:text-emerald-600",
      accentBg: "bg-emerald-50/50"
    };
  }
  if (normName.includes("lalo")) {
    return {
      border: "border-l-4 border-l-[#2563eb] hover:border-blue-500",
      badge: "bg-blue-50 text-blue-700 border-blue-250",
      progress: "bg-[#2563eb]",
      textHover: "group-hover:text-blue-600",
      accentBg: "bg-blue-50/50"
    };
  }
  return {
    border: "border-l-4 border-l-[#cccc00] hover:border-yellow-500",
    badge: "bg-yellow-50 text-yellow-800 border-yellow-250",
    progress: "bg-[#cccc00]",
    textHover: "group-hover:text-[#cccc00]",
    accentBg: "bg-yellow-50/50"
  };
};

export default function ClientList({ clients, advisors, onSelectClient, onAddClient, currentAdvisor }: ClientListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAdvisorFilter, setSelectedAdvisorFilter] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);

  const isAdmin = currentAdvisor?.role === "Administrador General";

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [initialCapital, setInitialCapital] = useState("");
  const [initialFee, setInitialFee] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [advisorId, setAdvisorId] = useState(() => {
    const facu = advisors.find(a => a.name.toLowerCase().includes("facu"));
    return facu ? facu.id : (advisors[0]?.id || "adv3");
  });
  const [financialGoal, setFinancialGoal] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !initialCapital || !startDate) {
      alert("Por favor complete los campos requeridos (Nombre, Capital inicial y fecha).");
      return;
    }

    onAddClient({
      name,
      email,
      phone,
      initialCapital: parseFloat(initialCapital) || 0,
      initialFee: parseFloat(initialFee) || 0,
      startDate,
      active: true,
      notes,
      advisorId,
      financialGoal: parseFloat(financialGoal) || (parseFloat(initialCapital) * 1.5),
      goalDescription: goalDescription || "Crecimiento patrimonial con asignación moderada"
    });

    // Reset Form
    setName("");
    setEmail("");
    setPhone("");
    setInitialCapital("");
    setInitialFee("");
    setStartDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setFinancialGoal("");
    setGoalDescription("");
    setShowAddForm(false);
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          client.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAdvisor = selectedAdvisorFilter === "all" || client.advisorId === selectedAdvisorFilter;
    return matchesSearch && matchesAdvisor;
  });

  return (
    <div className="space-y-6">
      {/* HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <h2 id="clients-section-title" className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2 self-start">
          <Compass className="w-5 h-5 text-brand animate-spin-slow" />
          Carteras de Inversores Administrados
        </h2>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* SEARCH */}
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por cliente o mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border border-slate-200 text-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs w-full sm:w-56 outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 transition"
            />
          </div>
          {/* ADVISOR FILTER - ONLY SHOWN TO ADMINS */}
          {isAdmin && (
            <div className="relative">
              <select
                value={selectedAdvisorFilter}
                onChange={(e) => setSelectedAdvisorFilter(e.target.value)}
                className="appearance-none bg-white border border-slate-200 text-slate-800 rounded-lg pl-3 pr-8 py-2 text-xs outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 transition"
              >
                <option value="all">Ver Todos los Asesores</option>
                {advisors.map(adv => (
                  <option key={adv.id} value={adv.id}>{adv.name}</option>
                ))}
              </select>
              <Filter className="w-3 h-3 text-slate-455 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {/* ADD BUTTON - ONLY SHOWN TO ADMINS */}
          {isAdmin && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white font-medium rounded-lg text-xs transition shadow-sm hover:border-brand border border-transparent"
            >
              <Plus className="w-4 h-4" />
              {showAddForm ? "Cerrar Panel" : "Registrar Cliente"}
            </button>
          )}
        </div>
      </div>

      {/* NEW CLIENT PANEL */}
      {showAddForm && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 p-6 rounded-xl space-y-4 shadow-md"
        >
          <div className="border-b border-slate-100 pb-3">
            <h4 className="font-bold text-slate-800 text-sm">Registrar Nuevo Cliente e Inicializar Cartera</h4>
            <p className="text-xs text-slate-500 mt-1">Cargue los parámetros de inicio. Los honorarios de estructuración se deducirán automáticamente de la cuenta inicial.</p>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* NAME */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Nombre Completo *</label>
              <input
                type="text"
                required
                placeholder="Ej. Juan Pérez"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 text-xs focus:border-brand outline-none transition"
              />
            </div>

            {/* EMAIL */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Email de Contacto</label>
              <input
                type="email"
                placeholder="juan@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 text-xs focus:border-brand outline-none transition"
              />
            </div>

            {/* PHONE */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Celular / Teléfono</label>
              <input
                type="text"
                placeholder="+54 9..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 text-xs focus:border-brand outline-none transition"
              />
            </div>

            {/* CAPITAL INICIAL */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Capital a Invertir (ARS) *</label>
              <input
                type="text"
                required
                placeholder="Ej. 1.500.000"
                value={formatAmountInput(initialCapital)}
                onChange={(e) => setInitialCapital(parseAmountInput(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 text-xs focus:border-brand outline-none transition font-sans cursor-text"
              />
            </div>

            {/* DESIGN AND ADVISORY PORTFOLIO FEE */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Honorarios Diseño de Cartera (ARS)
              </label>
              <input
                type="text"
                placeholder="Ej. 50.000 (Opcional)"
                value={formatAmountInput(initialFee)}
                onChange={(e) => setInitialFee(parseAmountInput(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 text-xs focus:border-brand outline-none transition font-sans cursor-text"
              />
              <span className="text-[10px] text-slate-400">Cobro único de estructuración inicial</span>
            </div>

            {/* FECHA INCIO */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Fecha de Inicio *</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 text-xs focus:border-brand outline-none transition"
              />
            </div>

            {/* ASESOR ASIGNADO */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Asesor Responsable</label>
              <select
                value={advisorId}
                onChange={(e) => setAdvisorId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 text-xs focus:border-brand outline-none transition"
              >
                {advisors.map(adv => (
                  <option key={adv.id} value={adv.id}>{adv.name}</option>
                ))}
              </select>
            </div>

            {/* OBJETIVO DE CORTO/MEDIANO PLAZO */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Monto Objetivo Financiero (ARS)</label>
              <input
                type="text"
                placeholder="Ej. 25.000.000"
                value={formatAmountInput(financialGoal)}
                onChange={(e) => setFinancialGoal(parseAmountInput(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 text-xs focus:border-brand outline-none transition font-sans cursor-text"
              />
            </div>

            {/* DESCRIPCION DEL OBJETIVO */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Descripción del Objetivo</label>
              <input
                type="text"
                placeholder="Ej. Cambio de vehículo, retiro anticipado"
                value={goalDescription}
                onChange={(e) => setGoalDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 text-xs focus:border-brand outline-none transition"
              />
            </div>

            {/* OBSERVACIONES PERFIL */}
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Observaciones / Notas de Riesgo</label>
              <textarea
                rows={2}
                placeholder="Notas sobre el cliente, nivel de aversión al riesgo, preferencias de holding, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 text-xs focus:border-brand outline-none transition"
              />
            </div>

            {/* ACTION FOOTER */}
            <div className="md:col-span-3 flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-650 rounded-lg text-xs transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-slate-900 border border-slate-950 hover:bg-brand hover:text-black hover:border-brand text-white font-medium rounded-lg text-xs transition shadow-sm"
              >
                Crear Portafolio
              </button>
            </div>

          </form>
        </motion.div>
      )}

      {/* CLIENTS GRID/LIST */}
      {filteredClients.length === 0 ? (
        <div className="bg-white border border-slate-250 p-12 text-center rounded-2xl">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <h4 className="font-semibold text-slate-800">No se encontraron inversores</h4>
          <p className="text-xs text-slate-500 mt-1">Intente cambiando los términos de búsqueda o filtros de asesores.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredClients.map(client => {
            const advisorName = advisors.find(a => a.id === client.advisorId)?.name || "Asesor General";
            const colorTheme = getAdvisorColor(advisorName);
            const profitValue = client.currentBalance - client.initialCapital;
            const profitPct = (profitValue / client.initialCapital) * 100;
            const progressPct = Math.min((client.currentBalance / client.financialGoal) * 100, 100);
 
            // Calculate length of stay (checks 1-year mark)
            const startDateObj = new Date(client.startDate);
            const today = new Date();
            const daysStayed = Math.floor((today.getTime() - startDateObj.getTime()) / (1000 * 3600 * 24));
            const yearsStayed = (daysStayed / 365).toFixed(1);
 
            return (
              <div
                key={client.id}
                onClick={() => onSelectClient(client)}
                className={`bg-white border border-slate-200 ${colorTheme.border} rounded-xl p-5 cursor-pointer shadow-sm hover:shadow-md transition-all duration-305 flex flex-col justify-between hover:bg-slate-50/50 group`}
              >
                {/* TOP PORTION */}
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className={`text-[10px] font-sans px-2.5 py-0.5 rounded-full border ${colorTheme.badge}`}>
                        Asesor: {advisorName}
                      </span>
                      <h3 className={`font-bold text-slate-800 text-base mt-2 ${colorTheme.textHover} transition duration-200`}>{client.name}</h3>
                    </div>
                    
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      parseFloat(yearsStayed) >= 1.0 
                        ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {yearsStayed} Años
                    </span>
                  </div>
 
                  {/* CONTACT STATS */}
                  <div className="flex flex-wrap items-center gap-3 text-slate-500 text-xs mt-1 border-b border-slate-100 pb-3 mb-3">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {client.phone || "Sin teléfono"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Ingreso: {client.startDate}
                    </span>
                  </div>
 
                  {/* BALANCE & ROI TRACK */}
                  <div className="grid grid-cols-2 gap-4 mt-2 mb-4">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-450 tracking-wide">Capital Inicial</span>
                      <span className="text-sm font-semibold font-sans text-slate-700">${formatNumberARS(client.initialCapital)}</span>
                    </div>
 
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-455 tracking-wide">Valuación Actual</span>
                      <span className="text-sm font-semibold font-sans text-slate-800 flex items-center gap-1.5">
                        ${formatNumberARS(client.currentBalance)}
                        <span className={`text-[10px] font-bold ${profitValue >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          ({profitValue >= 0 ? '+' : ''}{profitPct.toFixed(1)}%)
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
 
                {/* VISUAL LEVEL GOAL PROGRESS */}
                <div className="pt-2 border-t border-slate-100 mt-auto">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span className="text-[10px] truncate max-w-[70%]">Objetivo: {client.goalDescription}</span>
                    <span className="font-sans text-[10px] font-bold text-slate-800">{progressPct.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-150">
                    <div 
                      className={`${colorTheme.progress} h-full rounded-full`} 
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
 
                  {/* ANNUAL RENTABILITY NOTICE IF MET */}
                  {parseFloat(yearsStayed) >= 1.0 && (
                    <div className="mt-3 flex items-center justify-between text-[11px] bg-brand/10 p-2 rounded-lg border border-brand/20 text-slate-800">
                      <span>🎉 Permanencia Anual Cumplida</span>
                      <span className="font-semibold text-xs flex items-center gap-1 hover:text-black">
                        Ver ganancias anuales <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  )}
                </div>
 
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
