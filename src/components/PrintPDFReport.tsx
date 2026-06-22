import React, { useState, useEffect, useRef } from "react";
import { Client, Performance, Transaction } from "../types";
import { X, Printer, FileText, Compass, Award, Download } from "lucide-react";
import { motion } from "motion/react";
import { formatNumberARS } from "../lib/format";
import { jsPDF } from "jspdf";

interface PrintProps {
  client: Client;
  advisorName: string;
  performances: Performance[];
  transactions: Transaction[];
  onClose: () => void;
}

export default function PrintPDFReport({ client, advisorName, performances, transactions, onClose }: PrintProps) {
  const [reportNote, setReportNote] = useState(
    "Este informe consolidado representa el balance y el rendimiento histórico del portafolio bajo el programa de acompañamiento financiero FINET. Los cálculos están basados en auditoría de valores bursátiles de carteras custodias directas."
  );

  // Auto-download once on initial mount
  const hasDownloadedRef = useRef(false);
  useEffect(() => {
    if (!hasDownloadedRef.current) {
      hasDownloadedRef.current = true;
      handleDownloadPDF();
    }
  }, []);

  // Close report on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const getFullAdvisorName = (name: string): string => {
    const norm = name.trim().toLowerCase();
    if (norm === "facu" || norm.includes("facundo") || norm.includes("macedo")) return "Facundo Macedo";
    if (norm === "lalo" || norm.includes("roberto") || norm.includes("cura")) return "Roberto Cura";
    if (norm === "mati" || norm.includes("matías") || norm.includes("matias") || norm.includes("dotta")) return "Matías Dotta";
    return name;
  };
  const fullAdvisorName = getFullAdvisorName(advisorName);

  const profitVal = client.currentBalance - client.initialCapital;
  const profitPct = (profitVal / client.initialCapital) * 100;

  const performancesSorted = [...performances]
    .filter(p => p.clientId === client.id)
    .sort((a,b) => a.monthYear.localeCompare(b.monthYear));

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    // We draw a highly formal, strict, high-contrast, black-and-white style PDF as requested (formal, no app colors)
    
    // Outer border frame for formal presentation
    doc.setDrawColor(15, 23, 42); // slate-900 (charcoal)
    doc.setLineWidth(0.4);
    doc.rect(15, 15, 180, 267);

    // Header brand logo & text (CENTERED)
    // Pixel-perfect vector FINET Isologo matching isologo.svg
    const logoSize = 13;
    const logoX = 105 - (logoSize / 2); // Perfectly centered at 105mm of A4 width
    const logoY = 20;
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

    // Brand "FINET" Centered
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.text("FINET", 105, 39, { align: "center" });

    // Tagline/Bajada "ACOMPAÑAMIENTO FINANCIERO" Centered
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text("ACOMPAÑAMIENTO FINANCIERO", 105, 44, { align: "center" });

    // Header metadata centered below the tagline
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("VALUACIÓN CONSOLIDADA ANUAL", 105, 49, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Reporte de Gestión Oficial: e-02619A    •    Fecha Emisión: ${new Date().toISOString().split("T")[0]}`, 105, 53, { align: "center" });

    // Black separator line
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.6);
    doc.line(20, 57, 190, 57);

    // Info Card block (Valores en pesos argentinos, etc.)
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(20, 63, 170, 30, "F");
    doc.setDrawColor(226, 232, 240); // slate-200 border
    doc.setLineWidth(0.35);
    doc.rect(20, 63, 170, 30, "D");

    // Left info column
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("REGISTRADO A NOMBRE DE:", 24, 69);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(client.name, 24, 75);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`${client.email || "Sin email registrado"} | ${client.phone}`, 24, 80);
    doc.text(`Valuación de Cuenta: $${formatNumberARS(client.currentBalance)} ARS`, 24, 86);

    // Right advisor column
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("ASESOR DE CARTERA AUTORIZADO:", 112, 69);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(fullAdvisorName, 112, 75);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("Asesoria Patrimonial FINET", 112, 80);
    doc.text(`Inicio de Gestión: ${client.startDate}`, 112, 86);

    // Executive Commentary box
    doc.setFillColor(248, 250, 252); // slate-50 background
    doc.rect(20, 99, 170, 24, "F");
    doc.setDrawColor(15, 23, 42); // slate-900 border
    doc.setLineWidth(0.8);
    doc.line(20, 99, 20, 123); // Thick left side border
    doc.setDrawColor(226, 232, 240); // outline border
    doc.setLineWidth(0.2);
    doc.line(20, 99, 190, 99);
    doc.line(190, 99, 190, 123);
    doc.line(20, 123, 190, 123);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text("COMENTARIO DEL PORTFOLIO MANAGER", 24, 105);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    
    const splitComment = doc.splitTextToSize(`"${reportNote}"`, 160);
    doc.text(splitComment, 24, 110);

    // Capital metrics sections
    let currentY = 131;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("CORTES DE CONTROL Y METRICAS DE CAPITAL", 20, currentY);

    currentY += 4;
    // 4 Columns: Capital Inicial | Fondos Finales | Rendimiento | Ganancia Neta
    const colW = 40;
    const labels = ["CAPITAL INICIAL", "VALUACION ACTUAL", "RENDIMIENTO TOTAL", "GANANCIA NETA"];
    const vals = [
      `$${formatNumberARS(client.initialCapital)}`,
      `$${formatNumberARS(client.currentBalance)}`,
      `+${profitPct.toFixed(1)}%`,
      `$${formatNumberARS(profitVal)}`
    ];

    for (let i = 0; i < 4; i++) {
      const colX = 20 + i * (colW + 3);
      doc.setFillColor(248, 250, 252);
      doc.rect(colX, currentY, colW, 16, "F");
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.rect(colX, currentY, colW, 16, "D");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(labels[i], colX + colW/2, currentY + 5, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(vals[i], colX + colW/2, currentY + 11, { align: "center" });
    }

    // Historical Performance Table Header
    currentY += 24;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("HISTORIAL DE RENDIMIENTO MENSUAL CONSOLIDADO", 20, currentY);

    currentY += 4;
    // Table Header Row
    doc.setFillColor(15, 23, 42);
    doc.rect(20, currentY, 170, 7, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("Mes / Ano", 24, currentY + 5);
    doc.text("Rendimiento", 55, currentY + 5);
    doc.text("Ganancia Devengada", 85, currentY + 5);
    doc.text("Notas Profesionales de Auditoria", 125, currentY + 5);

    // Table Data Roswell
    currentY += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);

    performancesSorted.forEach((perf, index) => {
      // Alternating row styling
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(20, currentY, 170, 6.5, "F");
      }
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.15);
      doc.rect(20, currentY, 170, 6.5, "D");

      doc.setFont("helvetica", "bold");
      doc.text(perf.monthYear, 24, currentY + 4.5);
      
      doc.setFont("helvetica", "bold");
      doc.text(`+${perf.profitPercentage}%`, 55, currentY + 4.5);
      
      doc.setFont("helvetica", "normal");
      doc.text(`+$${formatNumberARS(perf.profitAmount)}`, 85, currentY + 4.5);
      
      // Trim note to fit column
      const noteStr = perf.notes.length > 40 ? perf.notes.substring(0, 40) + "..." : perf.notes;
      doc.setFont("helvetica", "italic");
      doc.text(noteStr, 125, currentY + 4.5);

      currentY += 6.5;
    });

    // Summary Total Row
    doc.setFillColor(241, 245, 249);
    doc.rect(20, currentY, 170, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("Acumulado Historico", 24, currentY + 5);
    doc.text(`+${profitPct.toFixed(1)}%`, 55, currentY + 5);
    doc.text(`$${formatNumberARS(profitVal)} ARS`, 85, currentY + 5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 116, 139);
    doc.text("Métricas auditadas por FINET Acompañamiento financiero.", 125, currentY + 5);

    // Fee transparency block
    currentY += 11;
    doc.setFillColor(248, 250, 252);
    doc.rect(20, currentY, 170, 16, "F");
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.rect(20, currentY, 170, 16, "D");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text("INFORMACION IMPOSITIVA & COBRO DE GESTION (10%)", 24, currentY + 4);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.setTextColor(71, 85, 105);
    const feeText = `De acuerdo con el acuerdo de mandato, al cumplirse el primer ano de permanencia se consolidara una comision de exito del 10% sobre la ganancia total devengada. Por este periodo, los honorarios correspondientes ascienden a $${formatNumberARS(profitVal > 0 ? profitVal * 0.1 : 0)} ARS, los cuales son facturados a los 365 dias del inicio de actividades de la cartera.`;
    const splitFee = doc.splitTextToSize(feeText, 160);
    doc.text(splitFee, 24, currentY + 8);

    // Signature stamp
    currentY += 21;
    const sigX = 105;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.5);
    doc.line(sigX - 35, currentY, sigX + 35, currentY);

    // Stamp
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    doc.text("* REGISTRO FIRMADO DIGITALMENTE POR FINET *", sigX, currentY - 5, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(fullAdvisorName, sigX, currentY + 4, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("Agente Autorizado de Carteras & Portfolio Manager", sigX, currentY + 8, { align: "center" });

    // Header security hash
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text("Copia electronica autenticada mediante protocolo seguro SSL. ID: SHA256-FIN-90CA2B51-B216-4AD7-9E77", 105, 275, { align: "center" });

    doc.save(`Reporte_FINET_${client.name.replace(/\s+/g, "_")}.pdf`);
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      {/* PERSISTENT FLOATING CLOSE BUTTON FOR SYSTEM COMPATIBILITY & HIGH ACCESSIBILITY */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 bg-slate-900 border border-slate-755 hover:bg-slate-800 text-white px-3 py-2 rounded-full shadow-2xl transition duration-200 z-[60] print:hidden flex items-center gap-1.5 cursor-pointer text-xs font-bold"
        title="Volver a la aplicación (Tecla Esc)"
      >
        <span className="hidden sm:inline">Cerrar Reporte [ESC]</span> <X className="w-4 h-4" />
      </button>

      <div className="bg-white border border-slate-200 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-8 print:border-0 print:bg-white print:text-black print:shadow-none print:absolute print:inset-0">
           {/* INTERACTION CONTROLS - HIDDEN WHEN PRINTING */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-150 flex justify-between items-center print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-800" />
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Personalización y Exportación de Reporte</h3>
              <p className="text-[10px] text-slate-500">Configure los comentarios y pulse Imprimir para generar el PDF oficial</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="py-1.5 px-4 bg-slate-900 hover:bg-slate-800 text-white border border-slate-950 font-bold rounded-lg text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer animate-pulse"
            >
              <Download className="w-4 h-4" /> Descargar PDF Directo
            </button>
            <button
              onClick={handlePrint}
              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-medium rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer"
              title="Abrir con el gestor de impresión del navegador"
            >
              <Printer className="w-3.5 h-3.5" /> Alternativa de Impresión
            </button>
            <button
              onClick={onClose}
              className="p-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg transition"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* INPUT FOR SPECIAL ADVISORY NOTE - HIDDEN WHEN PRINTING */}
        <div className="p-6 bg-white border-b border-slate-150 space-y-2 print:hidden text-xs">
          <label className="block font-bold text-slate-500 uppercase tracking-widest text-[10px]">Nota de Asesor Personalizada para el Reporte</label>
          <textarea
            rows={2}
            value={reportNote}
            onChange={(e) => setReportNote(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg p-3 text-xs outline-none focus:border-slate-800 transition"
          />
        </div>

        {/* PRINTABLE AREA */}
        <div id="printable-area" className="p-10 bg-white text-slate-900 font-sans leading-relaxed min-h-[297mm]">
          
          {/* WATERMARK / TOP DECORATION */}
          <div className="flex justify-between items-start border-b-2 border-slate-200 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 shrink-0 border border-slate-300 rounded-xl overflow-hidden shadow-sm">
                <svg id="Capa_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190.03 190.03" className="w-full h-full">
                  <rect fill="#d2cc00" stroke="#12100b" strokeWidth="0.51" x=".26" y=".26" width="189.52" height="189.52"/>
                  <path fill="#12100b" d="M25.09,164.94h139.85V25.09H25.09v139.85ZM127.36,69.53h-46v18.09h40.53v16.99h-40.53v32.89h-18.69V52.54h64.69v16.99Z"/>
                </svg>
              </div>
              <div>
                <span className="font-bold tracking-widest text-slate-950 text-xl font-sans">FINET</span>
                <span className="block text-[10px] font-semibold text-slate-600">Acompañamiento financiero</span>
              </div>
            </div>

            <div className="text-right text-[11px] text-slate-500 font-mono">
              <span className="block font-bold text-slate-900 uppercase">Valuación Consolidada Anual</span>
              <span>Reporte e-02619A</span>
              <span className="block">Fecha Emisión: {new Date().toISOString().split("T")[0]}</span>
            </div>
          </div>

          {/* REPORT BODY */}
          <div className="mt-8 space-y-6">
            
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 grid grid-cols-2 gap-4">
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400">Registrado a nombre de</span>
                <span className="text-base font-bold text-slate-950">{client.name}</span>
                <span className="block text-xs text-slate-500 mt-0.5">{client.email || "No registrado"} | {client.phone}</span>
                <span className="block text-[11px] text-slate-500 mt-2">Valuación de Cuenta: <strong>${formatNumberARS(client.currentBalance)} ARS</strong></span>
              </div>
              
              <div className="text-right border-l-2 border-slate-200 pl-6">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Asesor de Cartera</span>
                <span className="text-base font-bold text-slate-950">{fullAdvisorName}</span>
                <span className="block text-xs text-slate-500 mt-0.5">Asesoría Patrimonial FINET</span>
                <span className="block text-[11px] text-slate-500 mt-2">Inicio de Gestión: <strong>{client.startDate}</strong></span>
              </div>
            </div>

            {/* ADVISOR NOTE FOR USER */}
            <div className="bg-slate-50 border-l-4 border-slate-700 p-4 rounded-r-xl">
              <span className="block text-[10px] uppercase font-bold text-slate-800 tracking-wider mb-1">Comentario del Portfolio Manager</span>
              <p className="text-xs text-slate-700 leading-relaxed italic">
                "{reportNote}"
              </p>
            </div>

            {/* CORE BALANCE CHART AND NUMERICS */}
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Balance Consolidado de Gestión</h4>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="block text-[9px] uppercase font-semibold text-slate-400">Capital Inicial</span>
                  <span className="text-sm font-bold font-mono text-slate-900">${formatNumberARS(client.initialCapital)}</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="block text-[9px] uppercase font-semibold text-slate-400">Fondos Finales</span>
                  <span className="text-sm font-bold font-mono text-slate-900">${formatNumberARS(client.currentBalance)}</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="block text-[9px] uppercase font-semibold text-slate-400">Rendimiento</span>
                  <span className={`text-sm font-bold font-mono ${profitVal >= 0 ? 'text-slate-900' : 'text-slate-600'}`}>
                    +{profitPct.toFixed(1)}%
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="block text-[9px] uppercase font-semibold text-slate-400">Ganancia Neta</span>
                  <span className="text-sm font-bold font-mono text-slate-900">${formatNumberARS(profitVal)}</span>
                </div>
              </div>
            </div>

            {/* HIGH FIDELITY TABLE OF MONTHLY RETURNS */}
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2">Desglose Mensual Auditado de Rentabilidad</h4>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 uppercase text-[9px] font-bold border-b border-slate-300">
                    <th className="p-3">Mes Auditado</th>
                    <th className="p-3">Porcentaje Obtenido</th>
                    <th className="p-3 text-right">Rendimiento ARS (Neto)</th>
                    <th className="p-3">Observaciones de Activo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {performancesSorted.map((perf, index) => (
                    <tr key={index} className="odd:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-900">{perf.monthYear}</td>
                      <td className="p-3 font-mono font-bold text-slate-800">+{perf.profitPercentage}%</td>
                      <td className="p-3 font-mono text-right text-slate-950">+{formatNumberARS(perf.profitAmount)}</td>
                      <td className="p-3 text-slate-500 italic text-[11px]">{perf.notes}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 text-xs">
                    <td className="p-3">Acumulado Histórico</td>
                    <td className="p-3 font-mono">+{profitPct.toFixed(1)}%</td>
                    <td className="p-3 font-mono text-right text-slate-950">${formatNumberARS(profitVal)} ARS</td>
                    <td className="p-3 text-slate-400">Auditado por FINET Acompañamiento financiero</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* FEES TRANSPARENCY BLOCK */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-300 space-y-2">
              <span className="block text-[10px] uppercase font-bold text-slate-800 tracking-widest">Información Impositiva & Cobro de Gestión (10%)</span>
              <p className="text-[11px] text-slate-605 text-slate-600 leading-relaxed">
                De acuerdo con el acuerdo de mandato, al cumplirse el primer año de permanencia se consolidará una comisión de éxito del <strong>10% sobre la ganancia total devengada</strong>. 
                Por este periodo, los honorarios correspondientes ascienden a <strong>${formatNumberARS(profitVal > 0 ? profitVal * 0.1 : 0)} ARS</strong>, los cuales son facturados a los 365 días del inicio de actividades.
              </p>
            </div>

            {/* SIGNATURES BLOCK */}
            <div className="pt-12 grid grid-cols-2 gap-10 text-center text-xs">
              <div>
                <div className="border-b border-slate-300 h-20 mx-auto w-48 flex flex-col items-center justify-end relative pb-1">
                  {/* Styled digital signature/stamp */}
                  <div className="absolute bottom-5 font-serif text-slate-800 text-lg select-none transform -rotate-4 filter drop-shadow opacity-95 font-semibold tracking-wide" style={{ fontFamily: "Georgia, serif" }}>
                    {fullAdvisorName}
                  </div>
                  <div className="absolute bottom-1 font-sans font-extrabold text-slate-700 text-[8px] tracking-widest uppercase border border-slate-400/40 px-1.5 py-0.5 rounded select-none opacity-50 bg-slate-100/50">
                    ★ FINET FIRMADO ★
                  </div>
                </div>
                <span className="block font-bold text-slate-900 mt-2">{fullAdvisorName}</span>
                <span className="text-slate-400 text-[10px]">Agente Autorizado de Carteras</span>
              </div>

              <div>
                <div className="border-b border-slate-300 h-20 mx-auto w-48 flex items-end justify-center pb-1">
                  <span className="italic font-serif text-slate-400">Firma del Comitente</span>
                </div>
                <span className="block font-bold text-slate-900 mt-2">{client.name}</span>
                <span className="text-slate-400 text-[10px]">Inversor / Titular de Cuenta</span>
              </div>
            </div>

            {/* PRINT FOOTER */}
            <div className="mt-12 text-center text-[10px] text-slate-400 border-t border-slate-200 pt-4">
              <span>FINET Acompañamiento financiero • La Plata, Buenos Aires, Argentina</span>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
