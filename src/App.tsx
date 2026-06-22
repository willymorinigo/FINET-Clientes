import React, { useEffect, useState } from "react";
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc, 
  updateDoc 
} from "firebase/firestore";
import { db, seedDatabaseIfEmpty } from "./lib/firebase";
import { Advisor, Client, Performance, Transaction, ClientDocument, Alert } from "./types";
import { formatNumberARS } from "./lib/format";
import DashboardStats from "./components/DashboardStats";
import ClientList from "./components/ClientList";
import ClientDetail from "./components/ClientDetail";
import CsvImportModal from "./components/CsvImportModal";
import AlertCenter from "./components/AlertCenter";
import PrintPDFReport from "./components/PrintPDFReport";
import LoginScreen from "./components/LoginScreen";

import { 
  Compass, RefreshCw, BarChart2, Bell, FileText, CheckCircle2, 
  Award, Sparkles, Building, Briefcase, ChevronRight, UserCheck, CalendarDays,
  LogOut
} from "lucide-react";

export default function App() {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  // Login State
  const [currentAdvisor, setCurrentAdvisor] = useState<Advisor | null>(() => {
    const stored = localStorage.getItem("finet_logged_advisor");
    try {
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // App views state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [printingClient, setPrintingClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  // Auto-calculated Global variables helper
  const latestMonthYearValue = "2026-05";

  // Bootstrapping and fetching
  const fetchData = async () => {
    setLoading(true);
    try {
      // Seed first
      await seedDatabaseIfEmpty();

      // Fetch Advisors
      const advSnap = await getDocs(collection(db, "advisors"));
      const advData: Advisor[] = [];
      advSnap.forEach(doc => advData.push(doc.data() as Advisor));
      setAdvisors(advData);

      // Fetch Clients
      const cliSnap = await getDocs(collection(db, "clients"));
      const cliData: Client[] = [];
      cliSnap.forEach(doc => cliData.push(doc.data() as Client));
      setClients(cliData);

      // Fetch Performances
      const perfSnap = await getDocs(collection(db, "performances"));
      const perfData: Performance[] = [];
      perfSnap.forEach(doc => perfData.push(doc.data() as Performance));
      setPerformances(perfData);

      // Fetch Transactions
      const txSnap = await getDocs(collection(db, "transactions"));
      const txData: Transaction[] = [];
      txSnap.forEach(doc => txData.push(doc.data() as Transaction));
      setTransactions(txData);

      // Fetch Documents
      const docSnap = await getDocs(collection(db, "documents"));
      const docData: ClientDocument[] = [];
      docSnap.forEach(doc => docData.push(doc.data() as ClientDocument));
      setDocuments(docData);

      // Fetch Alerts
      const alertSnap = await getDocs(collection(db, "alerts"));
      const alertData: Alert[] = [];
      alertSnap.forEach(doc => alertData.push(doc.data() as Alert));
      // Sort alerts: unread first, then newest first
      alertData.sort((a,b) => {
        if (a.read === b.read) {
          return b.date.localeCompare(a.date);
        }
        return a.read ? 1 : -1;
      });
      setAlerts(alertData);

    } catch (err) {
      console.error("Error fetching Firestore collections:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update selected client details if clients list changes
  useEffect(() => {
    if (selectedClient) {
      const updated = clients.find(c => c.id === selectedClient.id);
      if (updated) {
        setSelectedClient(updated);
      }
    }
  }, [clients]);

  // Actions: Add Client
  const handleAddClient = async (newClientData: Omit<Client, "id" | "currentBalance">) => {
    const newId = `cli_${Date.now()}`;
    const initialBal = newClientData.initialCapital - newClientData.initialFee;

    const newClient: Client = {
      ...newClientData,
      id: newId,
      currentBalance: initialBal
    };

    try {
      // 1. Save client
      await setDoc(doc(db, "clients", newId), newClient);

      // 2. Create Deposit transaction
      const txDepId = `tx_${Date.now()}_dep`;
      const depositTx: Transaction = {
        id: txDepId,
        clientId: newId,
        date: newClientData.startDate,
        type: "deposit",
        amount: newClientData.initialCapital,
        assetCategory: "Efectivo",
        description: "Depósito Inicial de Capital Autorizado FINET"
      };
      await setDoc(doc(db, "transactions", txDepId), depositTx);

      // 3. Create Advisory Setup fee transaction if greater than 0
      if (newClientData.initialFee > 0) {
        const txFeeId = `tx_${Date.now()}_fee`;
        const feeTx: Transaction = {
          id: txFeeId,
          clientId: newId,
          date: newClientData.startDate,
          type: "initial_advisory_fee",
          amount: -newClientData.initialFee,
          assetCategory: "Efectivo",
          description: "Cobro por Diseño de Cartera e Inicialización de Cartera FINET"
        };
        await setDoc(doc(db, "transactions", txFeeId), feeTx);
      }

      // 4. Create welcome Alert
      const alertId = `al_${Date.now()}`;
      const welcomeAlert: Alert = {
        id: alertId,
        clientId: newId,
        title: `Alta de cartera: ${newClient.name}`,
        message: `Se ha constituido exitosamente el portafolio financiero con un capital inicial de $${formatNumberARS(newClient.initialCapital)}.`,
        date: new Date().toISOString().split("T")[0],
        read: false,
        type: "milestone"
      };
      await setDoc(doc(db, "alerts", alertId), welcomeAlert);

      // Refresh cache
      fetchData();
    } catch (e) {
      console.error("Error creating client profile:", e);
    }
  };

  // Actions: Add Performance Yield record
  const handleAddPerformance = async (newPerfData: Omit<Performance, "id" | "createdAt">) => {
    const newId = `perf_${Date.now()}`;
    const newPerf: Performance = {
      ...newPerfData,
      id: newId,
      createdAt: new Date().toISOString()
    };

    try {
      // 1. Save performance
      await setDoc(doc(db, "performances", newId), newPerf);

      // 2. Update Client Balance
      const currentClient = clients.find(c => c.id === newPerfData.clientId);
      if (currentClient) {
        const updatedBalance = currentClient.currentBalance + newPerfData.profitAmount;
        await updateDoc(doc(db, "clients", currentClient.id), {
          currentBalance: updatedBalance
        });

        // 3. Create transaction log represent yield
        const txId = `tx_${Date.now()}_yield`;
        const yieldTx: Transaction = {
          id: txId,
          clientId: currentClient.id,
          date: new Date().toISOString().split("T")[0],
          type: "yield",
          amount: newPerfData.profitAmount,
          assetCategory: "Efectivo",
          description: `Rendimiento mensual de cartera mes ${newPerfData.monthYear} (${newPerfData.profitPercentage > 0 ? '+' : ''}${newPerfData.profitPercentage}%)`
        };
        await setDoc(doc(db, "transactions", txId), yieldTx);

        // 4. Check if client reached financial goal target due to this yield
        if (updatedBalance >= currentClient.financialGoal) {
          const alertId = `al_${Date.now()}_goal`;
          const goalAlert: Alert = {
            id: alertId,
            clientId: currentClient.id,
            title: `🎯 ¡Meta de Ahorros Superada!`,
            message: `${currentClient.name} superó su objetivo seteado de $${formatNumberARS(currentClient.financialGoal)} alcanzando un saldo de $${formatNumberARS(updatedBalance)}.`,
            date: new Date().toISOString().split("T")[0],
            read: false,
            type: "portfolio_goal"
          };
          await setDoc(doc(db, "alerts", alertId), goalAlert);
        }
      }

      fetchData();
    } catch (e) {
      console.error("Error logging monthly returns:", e);
    }
  };

  // Actions: Add Transaction Log
  const handleAddTransaction = async (newTxData: Omit<Transaction, "id">) => {
    const newId = `tx_${Date.now()}`;
    const newTx: Transaction = {
      ...newTxData,
      id: newId
    };

    try {
      await setDoc(doc(db, "transactions", newId), newTx);

      // Dynamically modify client current balance based on positive deposit or negative withdrawal
      const currentClient = clients.find(c => c.id === newTxData.clientId);
      if (currentClient) {
        let isAddition = newTxData.type === "deposit" || newTxData.type === "yield";
        let isSubtraction = newTxData.type === "withdrawal" || newTxData.type === "initial_advisory_fee" || newTxData.type === "annual_performance_fee";
        
        let multiplier = 1;
        if (isSubtraction) {
          multiplier = -1;
        }

        const delta = Math.abs(newTxData.amount) * multiplier;
        const updatedBalance = currentClient.currentBalance + delta;

        await updateDoc(doc(db, "clients", currentClient.id), {
          currentBalance: updatedBalance
        });
      }

      fetchData();
    } catch (e) {
      console.error("Error creating transaction:", e);
    }
  };

  // Actions: Add custom Document secure log
  const handleAddDocument = async (newDocData: Omit<ClientDocument, "id">) => {
    const newId = `doc_${Date.now()}`;
    const newDoc: ClientDocument = {
      ...newDocData,
      id: newId
    };

    try {
      await setDoc(doc(db, "documents", newId), newDoc);
      fetchData();
    } catch (e) {
      console.error("Error uploading document reference:", e);
    }
  };

  // Actions: Deduct 10% Performance Anniversary Fee
  const handleDeductPerformanceFee = async (clientId: string, feeAmount: number, description: string) => {
    const txId = `tx_${Date.now()}_annfee`;
    const performanceFeeTx: Transaction = {
      id: txId,
      clientId: clientId,
      date: new Date().toISOString().split("T")[0],
      type: "annual_performance_fee",
      amount: Math.round(feeAmount),
      assetCategory: "Efectivo",
      description: description
    };

    try {
      // 1. Log transaction
      await setDoc(doc(db, "transactions", txId), performanceFeeTx);

      // 2. Reduce balance
      const currentClient = clients.find(c => c.id === clientId);
      if (currentClient) {
        const updatedBalance = Math.round(currentClient.currentBalance - Math.abs(feeAmount));
        await updateDoc(doc(db, "clients", clientId), {
          currentBalance: updatedBalance
        });

        // 3. Log notification alert
        const alertId = `al_${Date.now()}_fee`;
        const feeAlert: Alert = {
          id: alertId,
          clientId: clientId,
          title: `💼 Comisión Satisfecha (Aniversario)`,
          message: `Se ha debitado y facturado el 10% sobre la ganancia histórica de ${currentClient.name} por un valor de $${formatNumberARS(Math.round(Math.abs(feeAmount)))}.`,
          date: new Date().toISOString().split("T")[0],
          read: false,
          type: "fee_charged"
        };
        await setDoc(doc(db, "alerts", alertId), feeAlert);
      }

      fetchData();
    } catch (e) {
      console.error("Error processing performance fee deduction:", e);
    }
  };

  // Actions: Dismiss notification
  const handleDismissAlert = async (id: string) => {
    try {
      await deleteDoc(doc(db, "alerts", id));
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      console.error("Error dismissing alert:", e);
    }
  };

  // Actions: Clear all notifications
  const handleClearAllAlerts = async () => {
    try {
      for (const al of alerts) {
        await deleteDoc(doc(db, "alerts", al.id));
      }
      setAlerts([]);
    } catch (e) {
      console.error("Error clearing all alerts:", e);
    }
  };

  // Actions: Handle bulk transactions loaded via CSV
  const handleImportCSVTransactions = async (newTxs: Partial<Transaction>[]) => {
    try {
      for (const tx of newTxs) {
        const txId = `tx_${Date.now()}_csv_${Math.floor(Math.random() * 1000)}`;
        const completeTx: Transaction = {
          id: txId,
          clientId: tx.clientId!,
          date: tx.date!,
          type: tx.type as any,
          amount: tx.amount!,
          assetCategory: tx.assetCategory as any,
          description: tx.description || "Transacción importada mediante CSV"
        };

        // Save transaction doc
        await setDoc(doc(db, "transactions", txId), completeTx);

        // Update current client balance
        const currentClient = clients.find(c => c.id === tx.clientId);
        if (currentClient) {
          let multiplier = 1;
          const isSubtraction = tx.type === "withdrawal" || tx.type === "initial_advisory_fee" || tx.type === "annual_performance_fee";
          if (isSubtraction) {
            multiplier = -1;
          }
          const delta = Math.abs(tx.amount!) * multiplier;
          const updatedBalance = currentClient.currentBalance + delta;
          
          await updateDoc(doc(db, "clients", currentClient.id), {
            currentBalance: updatedBalance
          });
        }
      }

      // Log notification of CSV Ingest
      if (newTxs.length > 0) {
        const firstClient = clients.find(c => c.id === newTxs[0].clientId);
        if (firstClient) {
          const alertId = `al_${Date.now()}_csv_alert`;
          const csvAlert: Alert = {
            id: alertId,
            clientId: firstClient.id,
            title: `📂 Ingesta de Datos Masiva Exitosa`,
            message: `Se han importado exitosamente ${newTxs.length} transacciones históricas al portafolio de ${firstClient.name}.`,
            date: new Date().toISOString().split("T")[0],
            read: false,
            type: "milestone"
          };
          await setDoc(doc(db, "alerts", alertId), csvAlert);
        }
      }

      fetchData();
    } catch (e) {
      console.error("Error importing bulk transactions from CSV:", e);
    }
  };

  // Actions: Live Bank / Broker sync simulation
  const handleSyncClientBank = async (clientId: string) => {
    const currentClient = clients.find(c => c.id === clientId);
    if (!currentClient) return;

    // We simulate generating 2 typical dividend/performance sync transactions
    const simDividendTx: Transaction = {
      id: `tx_${Date.now()}_sync1`,
      clientId: clientId,
      date: new Date().toISOString().split("T")[0],
      type: "yield",
      amount: Math.round(currentClient.initialCapital * 0.015), // 1.5% profit sync
      assetCategory: "Renta Fija",
      description: "Sincronizador Bancario Directo: Cobro cupón ONs Pampa Energía 2026"
    };

    try {
      await setDoc(doc(db, "transactions", simDividendTx.id), simDividendTx);

      const targetBal = currentClient.currentBalance + simDividendTx.amount;
      await updateDoc(doc(db, "clients", clientId), {
        currentBalance: targetBal
      });

      // Post alert
      const alertId = `al_${Date.now()}_sync_alert`;
      const syncAlert: Alert = {
        id: alertId,
        clientId: clientId,
        title: `⚡ Sincronización Bancaria: ${currentClient.name}`,
        message: `Se sincronizaron de forma directa con el API del Bróker dividendos por un valor de $${formatNumberARS(simDividendTx.amount)} ARS.`,
        date: new Date().toISOString().split("T")[0],
        read: false,
        type: "milestone"
      };
      await setDoc(doc(db, "alerts", alertId), syncAlert);

      fetchData();
    } catch (e) {
      console.error("Error performing simulated bank sync:", e);
    }
  };

  // Export PDF preview display trigger
  const handleExportPDFClick = (client: Client, performances: Performance[], transactions: Transaction[]) => {
    setPrintingClient(client);
  };

  // Edit Client Details in Firestore
  const handleEditClient = async (clientId: string, updatedFields: Partial<Client>) => {
    try {
      await updateDoc(doc(db, "clients", clientId), updatedFields);
      await fetchData();
      if (selectedClient && selectedClient.id === clientId) {
        setSelectedClient(prev => prev ? { ...prev, ...updatedFields } : null);
      }
    } catch (e) {
      console.error("Error updating client details:", e);
    }
  };

  // Cascade Delete Client from Firestore
  const handleDeleteClient = async (clientId: string) => {
    try {
      await deleteDoc(doc(db, "clients", clientId));
      
      // Cascade delete all child items
      const clientTx = transactions.filter(t => t.clientId === clientId);
      for (const tx of clientTx) {
        await deleteDoc(doc(db, "transactions", tx.id));
      }
      const clientPerf = performances.filter(p => p.clientId === clientId);
      for (const p of clientPerf) {
        await deleteDoc(doc(db, "performances", p.id));
      }
      const clientDocs = documents.filter(d => d.clientId === clientId);
      for (const d of clientDocs) {
        await deleteDoc(doc(db, "documents", d.id));
      }
      const clientAlerts = alerts.filter(al => al.clientId === clientId);
      for (const al of clientAlerts) {
        await deleteDoc(doc(db, "alerts", al.id));
      }

      setSelectedClient(null);
      await fetchData();
    } catch (e) {
      console.error("Error cascade deleting client:", e);
    }
  };

  // Login Handlers
  const handleLogin = (advisor: Advisor) => {
    setCurrentAdvisor(advisor);
    localStorage.setItem("finet_logged_advisor", JSON.stringify(advisor));
    setSelectedClient(null);
  };

  const handleLogout = () => {
    setCurrentAdvisor(null);
    localStorage.removeItem("finet_logged_advisor");
    setSelectedClient(null);
  };

  // Role permissions filtering
  const isAdmin = currentAdvisor?.role === "Administrador General";

  const filteredClients = clients.filter(c => {
    if (isAdmin) return true;
    return c.advisorId === currentAdvisor?.id;
  });

  const filteredPerformances = performances.filter(p => {
    if (isAdmin) return true;
    return filteredClients.some(c => c.id === p.clientId);
  });

  const filteredTransactions = transactions.filter(t => {
    if (isAdmin) return true;
    return filteredClients.some(c => c.id === t.clientId);
  });

  const filteredAlerts = alerts.filter(al => {
    if (isAdmin) return true;
    return filteredClients.some(c => c.id === al.clientId);
  });

  // Automated Monthly General Control report computation:
  // Dynamically analyzes active accounts and logs and outputs a beautiful KPI summaries of May/June 2026.
  const activeClientsCount = filteredClients.filter(c => c.active).length;
  const averageAllReturnsPercentage = filteredPerformances.length > 0 
    ? (filteredPerformances.reduce((acc, p) => acc + p.profitPercentage, 0) / filteredPerformances.length)
    : 0;
  const latestMonthYieldsTotal = filteredPerformances
    .filter(p => p.monthYear === latestMonthYearValue)
    .reduce((acc, p) => acc + p.profitAmount, 0);

  if (loading && advisors.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <RefreshCw className="w-10 h-10 text-brand animate-spin" />
        <p className="text-xs text-slate-400 font-medium">Estableciendo túnel seguro con la base de datos de FINET...</p>
      </div>
    );
  }

  if (!currentAdvisor) {
    return (
      <LoginScreen 
        advisors={advisors} 
        onLogin={handleLogin} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-805 font-sans antialiased overflow-x-hidden print:bg-white print:text-black">
      
      {/* 1. TOP GLOBAL NAVIGATION HEADER - HIDDEN WHEN PRINT REPORT */}
      <header className="bg-white border-b border-slate-205 sticky top-0 backdrop-blur z-30 print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          
          {/* BRAND AND SLOGAN LOGO */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[5px] bg-[#cccc00] border-0 flex items-center justify-center shadow-sm">
              <Compass className="w-6 h-6 text-[#000000] logo-spin" />
            </div>
            <div>
              <span 
                className="font-extrabold tracking-widest text-slate-950"
                style={{
                  fontSize: '23px',
                  fontFamily: 'Arial',
                  borderWidth: '0px',
                  borderColor: '#000000',
                  paddingTop: '0px',
                  paddingBottom: '0px',
                  paddingRight: '0px',
                  marginTop: '0px',
                  marginLeft: '0px',
                  marginBottom: '0px',
                  lineHeight: '30px'
                }}
              >
                FINET
              </span>
              <span className="block text-[8px] text-[#646464] font-bold uppercase tracking-widest">Acompañamiento financiero</span>
            </div>
          </div>

          {/* DUAL STAT QUICK LOGS / ALERTCENTER / CONFIGS */}
          <div className="flex items-center gap-3">
            
            <button
              onClick={() => setShowCSVModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl hover:border-brand hover:bg-slate-50 text-xs font-semibold text-slate-655 hover:text-slate-900 transition shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-800 animate-spin-slow" />
              Ingesta Rápida
            </button>

            {/* AUTOMATED ALERTCENTER NOTIFICATIONS DROPDOWN */}
            <AlertCenter 
              alerts={filteredAlerts} 
              onDismiss={handleDismissAlert} 
              onClearAll={handleClearAllAlerts} 
            />

            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
              <div className="hidden md:flex flex-col items-end text-xs">
                <span className="font-semibold text-slate-700">{currentAdvisor.name}</span>
                <span className="text-[10px] text-slate-500 font-bold">{currentAdvisor.role}</span>
              </div>
              <button
                onClick={handleLogout}
                title="Cerrar Sesión"
                className="p-1.5 border border-slate-205 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl transition shadow-sm"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* 2. MAIN HUB CONTENT CONTAINER - HIDDEN WHEN PRINT REPORT */}
      {loading ? (
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 print:hidden">
          <RefreshCw className="w-10 h-10 text-brand animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Estableciendo túnel seguro con la base de datos de FINET...</p>
        </div>
      ) : (
        <main className="max-w-7xl mx-auto px-4 py-8 space-y-6 print:hidden">
          
          {/* ADVISOR WELCOME HERO */}
          {!selectedClient && (
            <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
              <div className="space-y-1">
                <span className="text-[10px] bg-brand/15 text-slate-900 font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-brand/20">
                  Panel de Desempeño Principal
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">Hola de nuevo, {currentAdvisor.name} 👋</h1>
                <p className="text-xs text-slate-500 font-medium">
                  {isAdmin 
                    ? "Asigne carteras, registre rendimientos mensuales y monitoree los convenios de cobro del 10% de forma ágil." 
                    : "Monitoree sus carteras asignadas, registre rendimientos mensuales y cargue documentación de forma ágil."}
                </p>
              </div>

              {/* AUTOMATED REPORTE MENSUAL CONTROL CARD */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-left font-sans shrink-0 border-l-4 border-l-brand">
                <span className="block text-[9px] uppercase font-bold text-slate-600 tracking-wider">Reporte Automatizado ({latestMonthYearValue})</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-lg font-bold font-mono text-slate-800">
                    +${formatNumberARS(latestMonthYieldsTotal)} ARS
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold">(Rendimiento Mensual)</span>
                </div>
                <span className="block text-[9px] text-slate-500 mt-1">Calculado sobre {activeClientsCount} carteras activas</span>
              </div>
            </div>
          )}

          {/* GLOBAL INSIGHT KPI CARDS */}
          {!selectedClient && (
            <DashboardStats 
              clients={filteredClients} 
              performances={filteredPerformances} 
              transactions={filteredTransactions} 
            />
          )}

          {/* PRIMARY WORKSPACE: VIEW TOGGLE ROUTING */}
          {selectedClient ? (
            <ClientDetail 
              client={selectedClient} 
              performances={filteredPerformances} 
              transactions={filteredTransactions} 
              documents={documents.filter(d => d.clientId === selectedClient.id)} 
              onBack={() => setSelectedClient(null)} 
              onAddPerformance={handleAddPerformance} 
              onAddTransaction={handleAddTransaction} 
              onAddDocument={handleAddDocument}
              onDeductPerformanceFee={handleDeductPerformanceFee}
              onExportPDF={handleExportPDFClick}
              currentAdvisor={currentAdvisor}
              advisors={advisors}
              onEditClient={handleEditClient}
              onDeleteClient={handleDeleteClient}
            />
          ) : (
            <ClientList 
              clients={filteredClients} 
              advisors={advisors} 
              onSelectClient={setSelectedClient} 
              onAddClient={handleAddClient} 
              currentAdvisor={currentAdvisor}
            />
          )}

        </main>
      )}

      {/* 3. CSV IMPORT AND PROTOCOL SYNC DUAL MODAL */}
      <CsvImportModal 
        isOpen={showCSVModal} 
        onClose={() => setShowCSVModal(false)} 
        clients={filteredClients} 
        onImportSuccess={handleImportCSVTransactions} 
        onSyncSimulation={handleSyncClientBank} 
      />

      {/* 4. HIGH FIDELITY PRINTABLE/PDF GENERATOR OVERLAY */}
      {printingClient && (
        <PrintPDFReport 
          client={printingClient} 
          advisorName={advisors.find(a => a.id === printingClient.advisorId)?.name || "Asesor General"} 
          performances={filteredPerformances} 
          transactions={filteredTransactions} 
          onClose={() => setPrintingClient(null)} 
        />
      )}

    </div>
  );
}
