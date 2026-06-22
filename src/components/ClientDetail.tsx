import React, { useState } from "react";
import { Client, Performance, Transaction, ClientDocument, Alert, Advisor } from "../types";
import { jsPDF } from "jspdf";
import { 
  ArrowLeft, FileText, Plus, Database, DollarSign, Award, Shield, 
  Calendar, Check, Download, AlertCircle, TrendingUp, Sparkles, Trash2, SlidersHorizontal, Edit2
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
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

interface ClientDetailProps {
  client: Client;
  performances: Performance[];
  transactions: Transaction[];
  documents: ClientDocument[];
  onBack: () => void;
  onAddPerformance: (perf: Omit<Performance, "id" | "createdAt">) => void;
  onAddTransaction: (tx: Omit<Transaction, "id">) => void;
  onAddDocument: (doc: Omit<ClientDocument, "id">) => void;
  onDeductPerformanceFee: (clientId: string, feeAmount: number, description: string) => void;
  onExportPDF: (client: Client, performances: Performance[], transactions: Transaction[]) => void;
  currentAdvisor?: Advisor | null;
  advisors: Advisor[];
  onEditClient: (clientId: string, updatedFields: Partial<Client>) => Promise<void>;
  onDeleteClient: (clientId: string) => Promise<void>;
}

export default function ClientDetail({
  client,
  performances,
  transactions,
  documents,
  onBack,
  onAddPerformance,
  onAddTransaction,
  onAddDocument,
  onDeductPerformanceFee,
  onExportPDF,
  currentAdvisor,
  advisors,
  onEditClient,
  onDeleteClient,
}: ClientDetailProps) {
  
  // Tab control
  const [activeTab, setActiveTab] = useState<"yields" | "transactions" | "documents">("yields");

  // Edit Client Modal/Form State
  const [showEditForm, setShowEditForm] = useState(false);
  const [editName, setEditName] = useState(client.name);
  const [editEmail, setEditEmail] = useState(client.email || "");
  const [editPhone, setEditPhone] = useState(client.phone || "");
  const [editGoal, setEditGoal] = useState(client.financialGoal.toString());
  const [editGoalDesc, setEditGoalDesc] = useState(client.goalDescription || "");
  const [editNotes, setEditNotes] = useState(client.notes || "");
  const [editAdvisorId, setEditAdvisorId] = useState(client.advisorId);
  const [editActive, setEditActive] = useState(client.active);
  const [editStartDate, setEditStartDate] = useState(client.startDate);
  const [isSaving, setIsSaving] = useState(false);

  // Delete Client Confirmation State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  React.useEffect(() => {
    setEditName(client.name);
    setEditEmail(client.email || "");
    setEditPhone(client.phone || "");
    setEditGoal(client.financialGoal.toString());
    setEditGoalDesc(client.goalDescription || "");
    setEditNotes(client.notes || "");
    setEditAdvisorId(client.advisorId);
    setEditActive(client.active);
    setEditStartDate(client.startDate);
  }, [client]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onEditClient(client.id, {
        name: editName,
        email: editEmail || "",
        phone: editPhone || "",
        financialGoal: parseFloat(editGoal) || 0,
        goalDescription: editGoalDesc || "",
        notes: editNotes || "",
        advisorId: editAdvisorId,
        active: editActive,
        startDate: editStartDate
      });
      setShowEditForm(false);
    } catch (err) {
      console.error("Error editing client:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onDeleteClient(client.id);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error("Error deleting client:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const isFacu = currentAdvisor?.name.toLowerCase().includes("facu") || currentAdvisor?.role === "Administrador General";

  // Performance Form State
  const [showPerfForm, setShowPerfForm] = useState(false);
  const [perfMonth, setPerfMonth] = useState("2026-06");
  const [perfPercent, setPerfPercent] = useState("");
  const [perfNotes, setPerfNotes] = useState("");

  // Transaction Form State
  const [showTxForm, setShowTxForm] = useState(false);
  const [txType, setTxType] = useState<Transaction["type"]>("deposit");
  const [txAmount, setTxAmount] = useState("");
  const [txAsset, setTxAsset] = useState<Transaction["assetCategory"]>("Renta Variable");
  const [txDesc, setTxDesc] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [txFilterAsset, setTxFilterAsset] = useState<string>("all");

  // Document Form State
  const [showDocForm, setShowDocForm] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docCategory, setDocCategory] = useState<ClientDocument["category"]>("Contrato");
  const [docStatus, setDocStatus] = useState<ClientDocument["status"]>("Pendiente");

  // Calculate Length of Stay / Permanence
  const startLocal = new Date(client.startDate);
  const today = new Date();
  const diffDays = Math.floor((today.getTime() - startLocal.getTime()) / (1000 * 3600 * 24));
  const yearsStayed = diffDays / 365;

  // Compute stats
  const totalInflows = transactions
    .filter(tx => tx.type === "deposit")
    .reduce((acc, tx) => acc + tx.amount, 0);

  const totalOutflows = transactions
    .filter(tx => tx.type === "withdrawal")
    .reduce((acc, tx) => acc + Math.abs(tx.amount), 0);

  const initialDesignFee = client.initialFee || 0;
  
  // Filter transactions
  const filteredTxs = transactions.filter(tx => {
    if (txFilterAsset !== "all" && tx.assetCategory !== txFilterAsset) return false;
    return true;
  });

  // Calculate annual returns & 10% fee eligibility
  // Since Alejandro & Mariana started in May/June 2025, let's look at the gains made in the year (first 12 months)
  // Let's filter yields of the first 12 months
  // If we don't have exactly 12 months, we calculate cumulative profit of all logged performance values
  const relativePerformances = performances.sort((a,b) => a.monthYear.localeCompare(b.monthYear));
  const totalProfitFromYields = relativePerformances.reduce((acc, p) => acc + p.profitAmount, 0);
  
  // Calculate performance fee status
  const hasFeeCharged = transactions.some(tx => tx.type === "annual_performance_fee");
  const estimatedPerformanceFee = totalProfitFromYields > 0 ? totalProfitFromYields * 0.10 : 0;

  // Chart data formatting
  // Prepare starting capital + accumulator representing historical growth
  let compoundingCapital = client.initialCapital;

  const formatMonthYearLabel = (yyyyMm: string): string => {
    if (!yyyyMm || !yyyyMm.includes("-")) return yyyyMm;
    const parts = yyyyMm.split("-");
    if (parts.length === 2) {
      return `${parts[1]}/${parts[0]}`; // MM/YYYY
    }
    return yyyyMm;
  };

  const chartData = relativePerformances.map((perf, idx) => {
    compoundingCapital = compoundingCapital + perf.profitAmount;
    return {
      name: formatMonthYearLabel(perf.monthYear),
      Rendimiento: perf.profitPercentage,
      Capital: compoundingCapital,
      MontoGanancia: perf.profitAmount
    };
  });

  const handleAddPerfSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!perfMonth || !perfPercent) return;

    const percentage = parseFloat(perfPercent);
    // Calculated profit based on current valuation before adding
    const profitAmount = (client.currentBalance * (percentage / 100));

    onAddPerformance({
      clientId: client.id,
      monthYear: perfMonth,
      profitPercentage: percentage,
      profitAmount: Math.round(profitAmount),
      notes: perfNotes || `Rendimiento mensual ingresado para ${perfMonth}`
    });

    setPerfPercent("");
    setPerfNotes("");
    setShowPerfForm(false);
  };

  const handleAddTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAmount) return;

    onAddTransaction({
      clientId: client.id,
      date: txDate,
      type: txType,
      amount: parseFloat(txAmount),
      assetCategory: txAsset,
      description: txDesc || `${txType === 'deposit' ? 'Inyección' : 'Retiro'} de capital - ${txAsset}`
    });

    setTxAmount("");
    setTxDesc("");
    setTxDate(new Date().toISOString().split("T")[0]);
    setShowTxForm(false);
  };

  const handleAddDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle) return;

    onAddDocument({
      clientId: client.id,
      title: docTitle.endsWith(".pdf") ? docTitle : `${docTitle}.pdf`,
      category: docCategory,
      uploadDate: new Date().toISOString().split("T")[0],
      fileSize: `${(Math.random() * 2 + 0.5).toFixed(1)} MB`,
      status: docStatus,
      url: "#"
    });

    setDocTitle("");
    setShowDocForm(false);
  };

  const handleDownloadDocument = (docItem: ClientDocument) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    // Outer frame for highly formal look
    doc.setDrawColor(15, 23, 42); // slate-900 (charcoal)
    doc.setLineWidth(0.4);
    doc.rect(15, 15, 180, 267);

    // Decorative thin double border on top
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.6);
    doc.line(20, 20, 190, 20);
    doc.line(20, 22, 190, 22);

    // Header Title Logo
    // Pixel-perfect vector FINET Isologo matching isologo.svg
    const logoX = 22;
    const logoY = 25;
    const logoSize = 11;
    const logoScale = logoSize / 190.03;

    // 1. Gold background square
    doc.setFillColor(210, 204, 0); // #d2cc00
    doc.rect(logoX, logoY, logoSize, logoSize, "F");

    // 2. Inner dark charcoal block
    doc.setFillColor(18, 16, 11); // #12100b
    doc.rect(logoX + 25.09 * logoScale, logoY + 25.09 * logoScale, 139.85 * logoScale, 139.85 * logoScale, "F");

    // 3. Inner gold letter "F"
    doc.setFillColor(210, 204, 0); // #d2cc00
    doc.rect(logoX + 62.67 * logoScale, logoY + 52.54 * logoScale, 18.69 * logoScale, 84.96 * logoScale, "F");
    doc.rect(logoX + 81.36 * logoScale, logoY + 52.54 * logoScale, 46.0 * logoScale, 16.99 * logoScale, "F");
    doc.rect(logoX + 81.36 * logoScale, logoY + 87.62 * logoScale, 40.53 * logoScale, 16.99 * logoScale, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.text("FINET", 36, 34);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("ACOMPAÑAMIENTO FINANCIERO * BÓVEDA DIGITAL DE CUSTODIA", 36, 39);

    // Document Details Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text("CERTIFICADO DE ARCHIVO DIGITAL SECURE-SHELF", 22, 54);

    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.4);
    doc.line(22, 58, 188, 58);

    // Meta Grid Table
    let currentY = 66;
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(22, currentY, 166, 50, "F");
    doc.setDrawColor(203, 213, 225);
    doc.rect(22, currentY, 166, 50, "D");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text("PROPIEDADES DEL DOCUMENTO:", 26, currentY + 6);

    const labels = [
      ["Inversor / Cliente:", client.name.toUpperCase()],
      ["Nombre de Archivo:", docItem.title],
      ["Categoria / Clase:", docItem.category],
      ["Estado de Registro:", docItem.status],
      ["Tamano de Archivo:", docItem.fileSize],
      ["Fecha de Carga:", docItem.uploadDate],
      ["ID Unico de Boveda:", `FIN-SHA256-${docItem.id.toUpperCase()}`]
    ];

    doc.setFontSize(8.5);
    labels.forEach((label, idx) => {
      const rowY = currentY + 12 + idx * 5;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(label[0], 28, rowY);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(label[1], 65, rowY);
    });

    currentY += 61;
    // Information Verification Box
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("DECLARACION DE CUSTODIA PATRIMONIAL", 22, currentY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    currentY += 4;

    const certText = `FINET certifica que el documento titulado "${docItem.title}" se encuentra almacenado y debidamente indexado de acuerdo con los protocolos de seguridad de la Comisión Nacional de Valores (CNV) y las mejores prácticas internacionales de custodia institucional. \n\nEste archivo pertenece de forma exclusiva al portfolio de ${client.name} bajo el programa de asesoramiento y acompañamiento financiero premium de nuestros portfolio managers autorizados.\n\nToda alteración, reproducción parcial o distribución desautorizada de este instrumento constituirá una violación a los términos del acuerdo de confidencialidad vigente entre las partes. Para cualquier aclaración o consulta fiscal o legal, contacte directamente a su asesor patrimonial oficial en las oficinas de FINET.`;

    const splitText = doc.splitTextToSize(certText, 164);
    doc.text(splitText, 22, currentY + 4);

    // Dynamic clean stamp
    currentY += 66;

    const sigX = 105;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.5);
    doc.line(sigX - 35, currentY, sigX + 35, currentY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("* SELLO DIGITAL DE SEGURIDAD FINET *", sigX, currentY - 5, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("FINET COMPLIANCE OFFICER", sigX, currentY + 5, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Boveda Segura de Custodia Digital Inc.", sigX, currentY + 9, { align: "center" });

    // Save the PDF
    doc.save(docItem.title);
  };

  const handleTriggerDeductFee = () => {
    if (estimatedPerformanceFee <= 0) return;
    const desc = `Cobro del 10% sobre rendimiento anual consolidado ($${formatNumberARS(totalProfitFromYields)} ARS) - Fin de Ciclo Anual`;
    onDeductPerformanceFee(client.id, -estimatedPerformanceFee, desc);
  };
  return (
    <div className="space-y-6">
      
      {/* HEADER NAVIGATION */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 border border-slate-250 text-slate-650 hover:text-slate-800 rounded-lg hover:bg-slate-50 bg-white transition text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Clientes
        </button>

        <div className="flex gap-2">
          {/* FACU EDIT AND DELETE ACTIONS */}
          {isFacu && (
            <>
              <button
                onClick={() => setShowEditForm(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-250 text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-medium rounded-lg text-xs transition shadow-sm"
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-550" />
                Editar Cliente
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-250 text-rose-650 hover:text-rose-750 hover:bg-rose-50 font-medium rounded-lg text-xs transition shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                Eliminar Cliente
              </button>
            </>
          )}

          {/* EXPORT BUTTON */}
          <button
            onClick={() => onExportPDF(client, performances, transactions)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 border border-slate-900 hover:bg-black text-white font-medium rounded-lg text-xs transition shadow-sm"
          >
            <FileText className="w-4 h-4 text-brand" />
            Exportar Informe PDF
          </button>
        </div>
      </div>

      {/* CLIENT MAIN SUMMARY CARD */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand/5 blur-3xl rounded-full pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-850 tracking-tight">{client.name}</h2>
              <span className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full ${
                client.active ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-100 text-slate-600"
              }`}>
                ACTIVO
              </span>
            </div>
            
            <div className="text-slate-500 text-xs mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
              <span>✉️ {client.email || "Sin email"}</span>
              <span>📞 {client.phone || "Sin celular"}</span>
              <span>📅 Ingreso: {client.startDate} ({yearsStayed.toFixed(1)} años de permanencia)</span>
            </div>

            <p className="text-slate-600 text-xs mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100 italic max-w-2xl">
              💡 <span className="font-semibold text-slate-700">Nota del Asesor:</span> {client.notes || "No hay observaciones particulares del portafolio."}
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 text-right min-w-[200px] flex flex-col justify-center">
            <span className="block text-[10px] text-slate-450 uppercase font-bold tracking-wider mb-1">Valuación de Cuenta</span>
            <span className="text-3xl font-bold font-sans text-slate-800 tracking-tight">
              ${formatNumberARS(client.currentBalance)}
            </span>
            <div className="flex items-center justify-end gap-1.5 mt-1">
              <span className="text-slate-500 text-xs">Retorno:</span>
              <span className={`text-xs font-bold font-sans ${
                (client.currentBalance - client.initialCapital) >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}>
                {((client.currentBalance - client.initialCapital) >= 0) ? "+" : ""}
                {(((client.currentBalance - client.initialCapital) / client.initialCapital) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div>
            <span className="block text-[10px] text-slate-450 uppercase font-semibold">Capital Inicial Depositado</span>
            <span className="text-base font-bold font-sans text-slate-700">${formatNumberARS(client.initialCapital)}</span>
          </div>

          <div>
            <span className="block text-[10px] text-slate-455 uppercase font-semibold">Honorarios de Diseño Inicial</span>
            <span className="text-base font-bold font-sans text-slate-750 flex items-center gap-1">
              ${formatNumberARS(initialDesignFee)}
              <span className="text-[10px] text-emerald-600 font-normal">(Cobrado)</span>
            </span>
          </div>

          <div>
            <span className="block text-[10px] text-slate-450 uppercase font-semibold">Ganancia Neta Generada</span>
            <span className={`text-base font-bold font-sans ${(client.currentBalance - client.initialCapital) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              ${formatNumberARS(client.currentBalance - client.initialCapital)}
            </span>
          </div>

          <div>
            <span className="block text-[10px] text-slate-450 uppercase font-semibold">Meta Financiera Seteada</span>
            <span className="text-base font-bold font-sans text-slate-800">
              ${formatNumberARS(client.financialGoal)}
            </span>
          </div>
        </div>
      </div>

      {/* ANNIVERSARY 10% FEE PANEL */}
      {yearsStayed >= 1.0 && (
        <div id="anniversary-fee-panel" className="bg-amber-50/50 border border-amber-200 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              <h4 className="font-bold text-amber-800 text-sm">Hito de Gestión: 1 Año de Permanencia Cumplido 🎂</h4>
            </div>
            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
              Al cumplirse un año de acompañamiento, aplica la comisión de FINET equivalente al **10% sobre la ganancia acumulada**. 
              Ganancia histórica de rentabilidad: <span className="font-sans text-slate-800 font-semibold">${formatNumberARS(totalProfitFromYields)} ARS</span>.
            </p>
          </div>

          <div className="text-right flex flex-col items-end shrink-0">
            <div className="mb-2">
              <span className="block text-[10px] text-slate-450 uppercase font-bold">Comisión 10% Calculada</span>
              <span className="text-xl font-bold font-sans text-amber-700">
                ${formatNumberARS(estimatedPerformanceFee, true)} ARS
              </span>
            </div>

            {hasFeeCharged ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                <Check className="w-4 h-4" /> Honorarios Cobrados
              </span>
            ) : (
              <button
                onClick={handleTriggerDeductFee}
                disabled={estimatedPerformanceFee <= 0}
                className="px-4 py-2 bg-slate-900 border border-slate-950 hover:bg-brand hover:text-black hover:border-brand disabled:bg-slate-100 disabled:text-slate-400 text-white font-medium rounded-lg text-xs transition shadow-sm flex items-center gap-1.5"
              >
                <DollarSign className="w-4 h-4" /> Cobrar Honorarios de Gestión
              </button>
            )}
          </div>
        </div>
      )}

      {/* TAB SELECTOR */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("yields")}
          className={`px-5 py-3 text-xs font-semibold border-b-2 transition ${
            activeTab === "yields" ? "border-brand text-slate-800" : "border-transparent text-slate-550 hover:text-brand"
          }`}
        >
          Rendimiento Mensual
        </button>
        <button
          onClick={() => setActiveTab("transactions")}
          className={`px-5 py-3 text-xs font-semibold border-b-2 transition ${
            activeTab === "transactions" ? "border-brand text-slate-800" : "border-transparent text-slate-550 hover:text-brand"
          }`}
        >
          Historial de Movimientos
        </button>
        <button
          onClick={() => setActiveTab("documents")}
          className={`px-5 py-3 text-xs font-semibold border-b-2 transition ${
            activeTab === "documents" ? "border-brand text-slate-800" : "border-transparent text-slate-550 hover:text-brand"
          }`}
        >
          Bóveda de {client.name} ({documents.length})
        </button>
      </div>

      {/* TAB CONTENT: RENDIMIENTOS */}
      {activeTab === "yields" && (
        <div className="space-y-6">
          
          {/* RENDIMIENTO CHART */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <dt className="text-sm font-bold text-slate-800">Evolución Histórica de la Cartera</dt>
                <dd className="text-xs text-slate-500">Curva de crecimiento consolidando los retornos mensuales registrados</dd>
              </div>

              <button
                onClick={() => setShowPerfForm(!showPerfForm)}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-brand/10 hover:text-black text-slate-700 rounded-lg text-xs transition border border-slate-200 hover:border-brand/20"
              >
                <Plus className="w-3.5 h-3.5 text-slate-900" />
                Cargar Rendimiento Mensual
              </button>
            </div>

            {/* PERFORMANCE INPUT FORM */}
            {showPerfForm && (
              <motion.form 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                onSubmit={handleAddPerfSubmit}
                className="bg-slate-50 border border-slate-200 p-4 rounded-xl mb-4 grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Año - Mes *</label>
                  <input
                    type="month"
                    required
                    value={perfMonth}
                    onChange={(e) => setPerfMonth(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg p-2 text-xs focus:ring-0 outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Porcentaje de Ganancia (%) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ej. +2.4"
                    value={perfPercent}
                    onChange={(e) => setPerfPercent(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg p-2 text-xs focus:ring-0 outline-none focus:border-brand font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Observaciones</label>
                  <input
                    type="text"
                    placeholder="Ej. Alza del ETF Nasdaq o dividendos de ONs"
                    value={perfNotes}
                    onChange={(e) => setPerfNotes(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg p-2 text-xs focus:ring-0 outline-none focus:border-brand"
                  />
                </div>

                <div className="md:col-span-3 flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowPerfForm(false)}
                    className="py-1.5 px-3 border border-slate-200 text-slate-600 rounded hover:bg-slate-50 bg-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="py-1.5 px-4 bg-slate-900 border border-slate-950 hover:bg-brand hover:text-black hover:border-brand text-white font-medium rounded"
                  >
                    Guardar Rendimiento
                  </button>
                </div>
              </motion.form>
            )}

            {/* CHART VIEWOR FALLBACK */}
            {chartData.length === 0 ? (
              <div className="py-12 text-center text-slate-450 text-xs">
                No hay rendimientos mensuales ingresados para trazar el gráfico. Cargue un rendimiento mensual para comenzar.
              </div>
            ) : (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCapital" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#cccc00" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#cccc00" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={10} 
                      tickLine={false} 
                      domain={['dataMin - 1000', 'dataMax + 1500']} 
                      tickFormatter={(val) => `$${formatNumberARS(val)}`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelClassName="text-slate-500 font-bold"
                      formatter={(val: any, name: any) => {
                        if (typeof val === "number") {
                          if (name && (name.includes("%") || name.toLowerCase().includes("rendimiento"))) return [`${val}%`, name];
                          return [`$${formatNumberARS(val)}`, name];
                        }
                        return [val, name];
                      }}
                    />
                    <Area type="monotone" dataKey="Capital" stroke="#cccc00" strokeWidth={2} fillOpacity={1} fill="url(#colorCapital)" name="Valuación ($)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* HISTORICAL MONTHS LOGS */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">Historial de Rentabilidades Mensuales</span>
              <span className="text-[10px] font-sans text-slate-500 font-bold">Total periodos: {relativePerformances.length}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-150">
                    <th className="p-4">Periodo</th>
                    <th className="p-4 text-center">Porcentaje de Rendimiento</th>
                    <th className="p-4 text-right">Monto Ganado (ARS)</th>
                    <th className="p-4">Comentarios del Asesor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-650">
                  {relativePerformances.map((perf, index) => (
                    <tr key={perf.id || index} className="hover:bg-slate-50/55 transition">
                      <td className="p-4 font-semibold text-slate-800">{perf.monthYear}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-sans text-xs font-bold ${
                          perf.profitPercentage >= 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700"
                        }`}>
                          {perf.profitPercentage >= 0 ? "+" : ""}{perf.profitPercentage}%
                        </span>
                      </td>
                      <td className={`p-4 text-right font-sans font-semibold ${perf.profitAmount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        ${formatNumberARS(perf.profitAmount)}
                      </td>
                      <td className="p-4 text-slate-500 max-w-sm truncate">{perf.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: TRANSACCIONES */}
      {activeTab === "transactions" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div>
                <dt className="text-sm font-bold text-slate-800">Libro Diario de Transacciones</dt>
                <dd className="text-xs text-slate-500">Aportes, retiros, diseño de cartera y de rendimiento</dd>
              </div>

              {/* FILTERS & LOG TRIGGER */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto text-xs">
                
                {/* FILTER BY ASSET CATEGORY */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-500">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <select
                    value={txFilterAsset}
                    onChange={(e) => setTxFilterAsset(e.target.value)}
                    className="bg-transparent border-0 text-slate-700 outline-none font-sans text-xs"
                  >
                    <option value="all">Filtro Activos (Todos)</option>
                    <option value="Renta Fija">Renta Fija</option>
                    <option value="Renta Variable font">Renta Variable</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Cripto">Cripto</option>
                    <option value="Efectivo">Efectivo</option>
                  </select>
                </div>

                <button
                  onClick={() => setShowTxForm(!showTxForm)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-brand/10 hover:text-black text-slate-700 rounded-lg text-xs transition border border-slate-200 hover:border-brand/20 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-950" />
                  Registrar Movimiento
                </button>
              </div>
            </div>

            {/* TRANSACTION REGISTRATION FORM */}
            {showTxForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                onSubmit={handleAddTxSubmit}
                className="bg-slate-50 border border-slate-200 p-4 rounded-xl mt-4 grid grid-cols-1 md:grid-cols-5 gap-4"
              >
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipo de Operación *</label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg p-2 text-xs focus:ring-0 outline-none focus:border-brand"
                  >
                    <option value="deposit">Aporte de Capital (Depósito)</option>
                    <option value="withdrawal">Retiro de Capital (Extracción)</option>
                    <option value="yield">Abono directo de Rendimiento / Dividendos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Monto en ARS *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 10.000"
                    value={formatAmountInput(txAmount)}
                    onChange={(e) => setTxAmount(parseAmountInput(e.target.value))}
                    className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg p-2 text-xs focus:ring-0 outline-none focus:border-brand font-sans cursor-text"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Categoría de Activo *</label>
                  <select
                    value={txAsset}
                    onChange={(e) => setTxAsset(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg p-2 text-xs focus:ring-0 outline-none focus:border-brand"
                  >
                    <option value="Renta Fija">Renta Fija (Bonos, ONs, Plazo Fijo)</option>
                    <option value="Renta Variable font">Renta Variable (Acciones, Cedears, ETFs)</option>
                    <option value="Real Estate">Real Estate (Fideicomisos inmobiliarios)</option>
                    <option value="Cripto">Criptomonedas (BTC, ETH, Stablecoins)</option>
                    <option value="Efectivo">Efectivo / Caja Líquida</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fecha de la Operación *</label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg p-2 text-xs focus:ring-0 outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Descripción</label>
                  <input
                    type="text"
                    placeholder="Ej. Inyección de capital por herencia o bonificación"
                    value={txDesc}
                    onChange={(e) => setTxDesc(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg p-2 text-xs focus:ring-0 outline-none focus:border-brand"
                  />
                </div>

                <div className="md:col-span-5 flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowTxForm(false)}
                    className="py-1.5 px-3 border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 rounded"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="py-1.5 px-4 bg-slate-900 border border-slate-950 hover:bg-brand hover:text-black hover:border-brand text-white font-medium rounded shadow-sm"
                  >
                    Grabar Operación
                  </button>
                </div>
              </motion.form>
            )}
          </div>

          {/* TRANSACTIONS JOURNAL GRID */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-800 uppercase tracking-wider">
              Movimientos Registrados en Cartera
            </div>

            {filteredTxs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No hay movimientos registrados para el filtro asignado.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                    <th className="p-4">Fecha</th>
                    <th className="p-4">Operación</th>
                    <th className="p-4">Activo Primario</th>
                    <th className="p-4">Descripción</th>
                    <th className="p-4 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-650">
                  {filteredTxs.map((tx, index) => {
                    
                    // Style by type
                    let badgeClass = "bg-slate-100 text-slate-655 border border-slate-200";
                    let sign = "";
                    let valClass = "text-slate-800";

                    if (tx.type === "deposit") {
                      badgeClass = "bg-emerald-50 text-emerald-700 border border-emerald-100";
                      sign = "+";
                      valClass = "text-emerald-600";
                    } else if (tx.type === "withdrawal") {
                      badgeClass = "bg-rose-50 text-rose-700 border border-rose-100";
                      sign = "-";
                      valClass = "text-rose-600";
                    } else if (tx.type === "initial_advisory_fee") {
                      badgeClass = "bg-teal-50 text-teal-700 border border-teal-100";
                      sign = "-";
                      valClass = "text-teal-600";
                    } else if (tx.type === "annual_performance_fee") {
                      badgeClass = "bg-amber-50 text-amber-700 border border-amber-200";
                      sign = "-";
                      valClass = "text-amber-700";
                    }

                    return (
                      <tr key={tx.id || index} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 font-sans text-slate-500">{tx.date}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}`}>
                            {tx.type === "deposit" && "APORTE"}
                            {tx.type === "withdrawal" && "RETIRO"}
                            {tx.type === "initial_advisory_fee" && "HONORARIOS INICIALES"}
                            {tx.type === "annual_performance_fee" && "FONDO ANUAL 10%"}
                            {tx.type === "yield" && "DEVENGADO RENDIMIENTO"}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-slate-700">{tx.assetCategory}</td>
                        <td className="p-4 text-slate-500 max-w-xs truncate">{tx.description}</td>
                        <td className={`p-4 text-right font-sans font-bold ${valClass}`}>
                          {sign}${formatNumberARS(Math.abs(tx.amount))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: BOVEDA DOCUMENTAL */}
      {activeTab === "documents" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex justify-between items-center">
            <div>
              <dt className="text-sm font-bold text-slate-800">Custodia Documental de {client.name}</dt>
              <dd className="text-xs text-slate-500">Gestione contratos, propuestas de portafolio y balances firmados en la bóveda digital blindada del cliente.</dd>
            </div>

            <button
              onClick={() => setShowDocForm(!showDocForm)}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-brand/10 hover:text-black text-slate-700 rounded-lg text-xs transition border border-slate-200 hover:border-brand/20 font-semibold"
            >
              <Plus className="w-3.5 h-3.5 text-slate-950" />
              Subir Documento
            </button>
          </div>

          {/* DOCUMENT UPLOAD FORM */}
          {showDocForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              onSubmit={handleAddDocSubmit}
              className="bg-slate-50 border border-slate-200 p-4 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4 text-xs shadow-inner"
            >
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nombre / Título del Documento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Contrato de Mandato de Inversión"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg p-2 focus:ring-0 outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Categoría *</label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg p-2 focus:ring-0 outline-none focus:border-brand"
                >
                  <option value="Contrato">Contrato Legal</option>
                  <option value="Portafolio">Estructura de Portafolio</option>
                  <option value="Reporte">Reporte de Rentabilidad</option>
                  <option value="Identificación">KYC / Identidad</option>
                  <option value="Otro">Otro Documento</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Estado Firmas</label>
                <select
                  value={docStatus}
                  onChange={(e) => setDocStatus(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg p-2 focus:ring-0 outline-none focus:border-brand"
                >
                  <option value="Firmado">Firmado por ambas partes</option>
                  <option value="Pendiente">Pendiente de firma cliente</option>
                  <option value="Borrador">Borrador de consulta</option>
                </select>
              </div>

              <div className="md:col-span-3 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDocForm(false)}
                  className="py-1.5 px-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-1.5 px-4 bg-slate-900 border border-slate-950 hover:bg-brand hover:text-black hover:border-brand text-white font-medium rounded shadow-sm"
                >
                  Confirmar Carga
                </button>
              </div>
            </motion.form>
          )}

          {/* DOCUMENTS GRID */}
          {documents.length === 0 ? (
            <div className="bg-white border border-slate-200 p-8 text-center rounded-xl text-xs text-slate-500 shadow-sm">
              No hay documentos almacenados en la bóveda de {client.name}.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map(docItem => (
                <div key={docItem.id} className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-start hover:border-slate-300 transition shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-slate-800" />
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-slate-800 max-w-[240px] truncate" title={docItem.title}>{docItem.title}</h5>
                      <div className="flex gap-2 items-center mt-1 text-[11px] text-slate-500">
                        <span>{docItem.category}</span>
                        <span>•</span>
                        <span>{docItem.fileSize}</span>
                        <span>•</span>
                        <span>Subido: {docItem.uploadDate}</span>
                      </div>
                      <div className="mt-1.5 text-[10px] text-slate-400 font-medium">
                        Cliente: <span className="text-slate-600 font-semibold">{client.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-2 shrink-0">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      docItem.status === "Firmado" 
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                        : docItem.status === "Pendiente" 
                        ? "bg-amber-50 text-amber-700 border border-amber-100" 
                        : "bg-slate-100 text-slate-650 border border-slate-200"
                    }`}>
                      {docItem.status}
                    </span>

                    {/* DUMMY DOWNLOAD LINK */}
                    <button
                      onClick={() => handleDownloadDocument(docItem)}
                      className="text-[10px] text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-2 py-1 border border-slate-200 rounded flex items-center gap-1 transition cursor-pointer"
                    >
                      <Download className="w-3 h-3" /> Descargar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-850">Editar Datos de {client.name}</h3>
              <button 
                onClick={() => setShowEditForm(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-450 transition text-sm"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="space-y-4 py-4 overflow-y-auto pr-1 flex-1 text-left">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-202 text-slate-800 rounded-lg p-2 text-xs focus:border-[#cccc00] outline-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-202 text-slate-800 rounded-lg p-2 text-xs focus:border-[#cccc00] outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-202 text-slate-800 rounded-lg p-2 text-xs focus:border-[#cccc00] outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fecha de Inicio de Cartera *</label>
                <input
                  type="date"
                  required
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-202 text-slate-800 rounded-lg p-2 text-xs focus:border-[#cccc00] outline-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Monto Objetivo (ARS) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 25.000.000"
                    value={formatAmountInput(editGoal)}
                    onChange={(e) => setEditGoal(parseAmountInput(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-202 text-slate-800 rounded-lg p-2 text-xs focus:border-[#cccc00] outline-none transition font-sans cursor-text"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Asesor Responsable</label>
                  <select
                    value={editAdvisorId}
                    onChange={(e) => setEditAdvisorId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-202 text-slate-800 rounded-lg p-2 text-xs focus:border-[#cccc00] outline-none transition"
                  >
                    {advisors.map(adv => (
                      <option key={adv.id} value={adv.id}>{adv.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Descripción del Objetivo</label>
                <input
                  type="text"
                  value={editGoalDesc}
                  onChange={(e) => setEditGoalDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-202 text-slate-800 rounded-lg p-2 text-xs focus:border-[#cccc00] outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Notas de Riesgo / Observaciones</label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-202 text-slate-800 rounded-lg p-2 text-xs focus:border-[#cccc00] outline-none transition"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editActive"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                  className="rounded text-[#cccc00] focus:ring-[#cccc00] bg-slate-50 border-slate-202"
                />
                <label htmlFor="editActive" className="text-xs font-semibold text-slate-700 select-none">Cliente Activo</label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-650 rounded-lg text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-950 text-white font-medium rounded-lg text-xs transition shadow-sm disabled:opacity-50"
                >
                  {isSaving ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl max-w-sm w-full text-left"
          >
            <h3 className="text-base font-bold text-rose-750 flex items-center gap-2">
              ⚠️ ¿Eliminar Cliente?
            </h3>
            <p className="text-xs text-slate-650 mt-2 leading-relaxed">
              ¿Está realmente seguro de que desea eliminar a <strong>{client.name}</strong>?<br/>
              Esta acción es permanente y eliminará también todo el historial de rendimientos, transacciones, alertas y documentos de este cliente de forma definitiva de la base de datos de FINET.
            </p>
            <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={isDeleting}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg text-xs transition shadow-sm disabled:opacity-50"
              >
                {isDeleting ? "Eliminando..." : "Sí, Eliminar de FINET"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
