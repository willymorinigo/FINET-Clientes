import React, { useState } from "react";
import { Upload, X, Copy, Check, FileText, Sparkles, RefreshCw } from "lucide-react";
import { Client, Transaction } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { formatNumberARS } from "../lib/format";

interface CSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  onImportSuccess: (newTxs: Partial<Transaction>[]) => void;
  onSyncSimulation: (clientId: string) => void;
}

export default function CsvImportModal({ isOpen, onClose, clients, onImportSuccess, onSyncSimulation }: CSVModalProps) {
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || "");
  const [csvText, setCsvText] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [parseError, setParseError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [selectedAssetCategory, setSelectedAssetCategory] = useState<any>("Renta Variable");

  // Sample templates to let them copy-paste easily to demo!
  const templateCSV = `2026-06-01,deposit,15000,Renta Variable,Aporte masivo de dividendos re-invertidos
2026-06-10,withdrawal,3500,Renta Fija,Egreso para resguardo de fondos oportunista
2026-06-15,yield,4200,Real Estate,Rendimiento de cuotapartes fideicomisarias`;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCsvText(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const copyTemplate = () => {
    navigator.clipboard.writeText(templateCSV);
    setCopiedIndex(1);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleParseSubmit = () => {
    setParseError("");
    if (!selectedClientId) {
      setParseError("Por favor seleccione un cliente para asociar los datos.");
      return;
    }
    if (!csvText.trim()) {
      setParseError("Por favor ingrese el contenido CSV o arrastre un archivo.");
      return;
    }

    const lines = csvText.split("\n");
    const parsedTransactions: Partial<Transaction>[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = line.split(",");
      if (columns.length < 3) {
        setParseError(`Fila ${i + 1} inválida. Debe contener al menos: fecha, tipo, monto (ej. 2026-06-01,deposit,15000)`);
        return;
      }

      const [date, type, amountStr, asset, desc] = columns;
      const amount = parseFloat(amountStr);

      if (isNaN(amount)) {
        setParseError(`Fila ${i + 1} inválida: El monto "${amountStr}" no es un número válido.`);
        return;
      }

      parsedTransactions.push({
        clientId: selectedClientId,
        date: date.trim() || new Date().toISOString().split("T")[0],
        type: (type.trim() as any) || "deposit",
        amount: amount,
        assetCategory: (asset?.trim() as any) || "Efectivo",
        description: desc?.trim() || `Carga masiva importada CSV (${asset || 'General'})`
      });
    }

    onImportSuccess(parsedTransactions);
    setCsvText("");
    onClose();
  };

  const handleTriggerBankSync = () => {
    if (!selectedClientId) return;
    setSyncing(true);
    setTimeout(() => {
      onSyncSimulation(selectedClientId);
      setSyncing(false);
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          id="csv-import-modal-container"
          className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-xl"
        >
          {/* HEADER */}
          <div className="px-6 py-4 border-b border-slate-150 flex justify-between items-center bg-slate-50">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-slate-800" />
              <h3 className="font-bold text-slate-800 text-lg">Carga Inmediata de Datos (CSV & Bancaria)</h3>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-850 transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* INSTRUCTIONS */}
            <div className="text-slate-600 text-sm leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-150">
              <p>
                Para facilitar el acompañamiento financiero de FINET, puede importar rendimientos e históricos 
                fácilmente. Use nuestra **plantilla estructurada de CSV** o bien active la **sincronización 
                bancaria directa** automatizada para simular el ingreso de movimientos en vivo.
              </p>
            </div>

            {/* SELECCION DE CLIENTE */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Comitente / Cliente Asociado</label>
              <select 
                value={selectedClientId} 
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg p-2.5 font-sans outline-none focus:border-brand transition text-sm"
              >
                <option value="" disabled>Seleccione un cliente...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Capital Inicial: ${formatNumberARS(c.initialCapital)})
                  </option>
                ))}
              </select>
            </div>

            {/* TWIN ARCHITECTURE: CSV vs BANK SYNC */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* BANK SYNC PANEL */}
              <div className="bg-brand/10 border border-brand/20 p-5 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2 text-amber-700">
                    <Sparkles className="w-4 h-4" />
                    <h4 className="font-semibold text-sm">Sincronización Bancaria / Broker</h4>
                  </div>
                  <p className="text-xs text-slate-605 leading-relaxed mb-4">
                    Conéctese mediante protocolo API seguro con el broker de bolsa o cuenta bancaria del cliente para traer los rendimientos generados y transacciones liquidadas esta última semana de forma automatizada.
                  </p>
                </div>
                
                <button
                  type="button"
                  disabled={syncing || !selectedClientId}
                  onClick={handleTriggerBankSync}
                  className="w-full py-2.5 px-4 bg-slate-900 border border-slate-950 hover:bg-brand hover:text-black hover:border-brand disabled:bg-slate-100 disabled:text-slate-400 text-white font-medium rounded-lg text-xs transition flex items-center justify-center gap-2 shadow-sm"
                >
                  {syncing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Sincronizando cuentas...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Simular Sincronización Directa
                    </>
                  )}
                </button>
              </div>

              {/* CSV TEMPLATE PREVIEW */}
              <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-slate-650">Ejemplo de Plantilla CSV</span>
                  <button 
                    onClick={copyTemplate} 
                    className="text-slate-500 hover:text-amber-600 font-semibold text-xs flex items-center gap-1.5 transition"
                  >
                    {copiedIndex ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    Copiar
                  </button>
                </div>
                <pre className="text-[10px] font-mono text-slate-700 bg-white p-2.5 rounded-lg overflow-x-auto border border-slate-150">
                  {templateCSV}
                </pre>
                <p className="text-[9px] text-slate-500 mt-2">
                  Formato: <code>AAAA-MM-DD,tipo,monto,categoría,descripción</code>
                </p>
              </div>

            </div>

            {/* CSV DATA ENTRY */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Datos CSV (Directo o Pegado)</label>
                <span className="text-xs text-slate-500 font-mono">Pegue líneas sin encabezados</span>
              </div>

              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl transition-all duration-300 p-2 ${
                  dragActive ? "border-brand bg-brand/5" : "border-slate-200 bg-white"
                }`}
              >
                <textarea
                  rows={4}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="2026-06-15,deposit,25000,Renta Variable,Aporte directo a acciones..."
                  className="w-full bg-transparent border-0 text-slate-800 font-mono text-xs p-2 outline-none resize-none placeholder-slate-400 focus:ring-0"
                />

                {csvText.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 text-xs">
                    <FileText className="w-8 h-8 mb-1 text-slate-350" />
                    <span>Arrastre su archivo CSV o pegue contenidos aquí</span>
                  </div>
                )}
              </div>
            </div>

            {parseError && (
              <div className="text-xs text-rose-700 font-medium bg-rose-50 p-3 rounded-lg border border-rose-100 font-mono">
                🛑 Error: {parseError}
              </div>
            )}
          </div>

          {/* BLOCK FOOTER BUTTONS */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex items-center justify-end gap-3 text-sm">
            <button
              onClick={onClose}
              className="py-2 px-4 border border-slate-200 bg-white hover:bg-slate-55 text-slate-650 rounded-lg transition"
            >
              Cerrar
            </button>
            <button
              onClick={handleParseSubmit}
              className="py-2 px-5 bg-slate-900 border border-slate-950 hover:bg-brand hover:text-black hover:border-brand text-white font-medium rounded-lg transition shadow-sm"
            >
              Procesar & Cargar CSV
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
