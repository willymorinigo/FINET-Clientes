import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  where, 
  getDoc,
  getDocFromServer
} from "firebase/firestore";
import { Advisor, Client, Performance, Transaction, ClientDocument, Alert } from "../types";

// Firebase Config derived from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyD--mPke7NcKOTMjfCqDc3Y79oU_r-FqaQ",
  authDomain: "gen-lang-client-0367059775.firebaseapp.com",
  projectId: "gen-lang-client-0367059775",
  storageBucket: "gen-lang-client-0367059775.firebasestorage.app",
  messagingSenderId: "1073848432930",
  appId: "1:1073848432930:web:ca122fe72e0162ed320d7b"
};

const app = initializeApp(firebaseConfig);

// Connect to the specific Firestore Database ID assigned to this project
export const db = getFirestore(app, "ai-studio-90ca2b51-b216-4ad7-9e77-3e3dde9881e2");

// Validate firestore connection as mandated by SKILL.md
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration or network status.", error);
    }
  }
}
testConnection();

// Initial seed data to make FINET beautiful and functional out-of-the-box
export async function seedDatabaseIfEmpty() {
  try {
    // 1. Enforce Correct Advisors as requested by the user
    const advisorsList: Advisor[] = [
      { id: "adv1", name: "Mati", email: "mati@finet.com", role: "Asesor Financiero Senior" },
      { id: "adv2", name: "Lalo", email: "lalo@finet.com", role: "Portfolio Manager" },
      { id: "adv3", name: "Facu", email: "facu@finet.com", role: "Administrador General" }
    ];

    for (const adv of advisorsList) {
      await setDoc(doc(db, "advisors", adv.id), adv);
    }

    // Check persistent setup flag to prevent re-seeding if the database was intentionally cleared
    const setupDoc = await getDoc(doc(db, "settings", "setup"));
    if (setupDoc.exists()) {
      return; // Already initialized, even if currently empty
    }

    const clientsSnap = await getDocs(collection(db, "clients"));
    if (!clientsSnap.empty) {
      // Mark as seeded to avoid checking again
      await setDoc(doc(db, "settings", "setup"), { seeded: true });
      return; // Already populated
    }

    console.log("Seeding databases with high-quality FINET mock data...");


    // 2. Seed Clients
    const clientsList: Client[] = [
      {
        id: "cli1",
        advisorId: "adv1",
        name: "Alejandro Santillán",
        email: "alejandro.santillan@uols.com",
        phone: "+54 9 11 5821-4432",
        initialCapital: 50000,
        initialFee: 1200,
        startDate: "2025-05-15",
        active: true,
        currentBalance: 59620,
        notes: "Perfil de riesgo moderado. Interés en diversificación global en ETF e instrumentos locales de tasa fija corporativa.",
        financialGoal: 80000,
        goalDescription: "Armado de fondo educativo para estudios de posgrado en el exterior"
      },
      {
        id: "cli2",
        advisorId: "adv1",
        name: "Valeria Soria",
        email: "valeria.soria@techhouse.la",
        phone: "+54 9 351 682-1144",
        initialCapital: 25000,
        initialFee: 500,
        startDate: "2025-12-10",
        active: true,
        currentBalance: 27150,
        notes: "Perfil agresivo. Fuerte ponderación en renta variable EEUU y exposición controlada a activos tokenizados y cripto.",
        financialGoal: 50000,
        goalDescription: "Próxima compra de vivienda de fin de semana"
      },
      {
        id: "cli3",
        advisorId: "adv2",
        name: "Bruno Díaz",
        email: "bruno.diaz@waynecorp.com",
        phone: "+54 9 11 9900-4721",
        initialCapital: 100000,
        initialFee: 2500,
        startDate: "2026-04-05",
        active: true,
        currentBalance: 101850,
        notes: "Perfil conservador alto. Foco en preservación patrimonial, dividendos robustos en USD y bonos exentos de impuestos.",
        financialGoal: 150000,
        goalDescription: "Preservación patrimonial líquida de contingencia empresaria"
      },
      {
        id: "cli4",
        advisorId: "adv3",
        name: "Mariana Paz",
        email: "mariana.paz@estudiopaz.com.ar",
        phone: "+54 9 261 411-9875",
        initialCapital: 12000,
        initialFee: 300,
        startDate: "2025-06-20", // Just reached 1 year!
        active: true,
        currentBalance: 14450,
        notes: "Perfil balanceado. Interés en estructuración de dividendos recurrentes y obligaciones negociables.",
        financialGoal: 20000,
        goalDescription: "Cambio de vehículo familiar proyectado para finales de año"
      }
    ];

    for (const cli of clientsList) {
      await setDoc(doc(db, "clients", cli.id), cli);
    }

    // 3. Seed Monthly Performance
    // Alejandro Santillán (13 Months) - Initial $50,000, growth to $59,620
    const cli1Performances: Performance[] = [
      { id: "perf1_1", clientId: "cli1", monthYear: "2025-06", profitPercentage: 1.5, profitAmount: 750, notes: "Buen inicio de cartera basado en obligaciones negociables.", createdAt: "2025-06-30" },
      { id: "perf1_2", clientId: "cli1", monthYear: "2025-07", profitPercentage: 1.8, profitAmount: 913.5, notes: "Aumento de yields en fondos comunes de inversión corporativos.", createdAt: "2025-07-31" },
      { id: "perf1_3", clientId: "cli1", monthYear: "2025-08", profitPercentage: -0.5, profitAmount: -258.3, notes: "Corrección global de bonos soberanos de mercados emergentes.", createdAt: "2025-08-31" },
      { id: "perf1_4", clientId: "cli1", monthYear: "2025-09", profitPercentage: 2.1, profitAmount: 1070.3, notes: "Fuerte rebote del índice S&P 500 y ETFs de tecnología.", createdAt: "2025-09-30" },
      { id: "perf1_5", clientId: "cli1", monthYear: "2025-10", profitPercentage: 1.2, profitAmount: 629.7, notes: "Ingreso de dividendos corporativos trimestrales consolidados.", createdAt: "2025-10-31" },
      { id: "perf1_6", clientId: "cli1", monthYear: "2025-11", profitPercentage: 2.8, profitAmount: 1486.9, notes: "Suba sustancial del sector financiero y energético local.", createdAt: "2025-11-30" },
      { id: "perf1_7", clientId: "cli1", monthYear: "2025-12", profitPercentage: 3.0, profitAmount: 1637.7, notes: "Rally navideño apuntala las carteras de renta variable.", createdAt: "2025-12-31" },
      { id: "perf1_8", clientId: "cli1", monthYear: "2026-01", profitPercentage: -1.2, profitAmount: -674.7, notes: "Ajuste de tasas de la Reserva Federal de EEUU genera reticencia.", createdAt: "2026-01-31" },
      { id: "perf1_9", clientId: "cli1", monthYear: "2026-02", profitPercentage: 1.4, profitAmount: 777.7, notes: "Recuperación apalancada por excelentes balances trimestrales.", createdAt: "2026-02-28" },
      { id: "perf1_10", clientId: "cli1", monthYear: "2026-03", profitPercentage: 1.1, profitAmount: 619.6, notes: "Estabilización de rendimientos en instrumentos de renta fija.", createdAt: "2026-03-31" },
      { id: "perf1_11", clientId: "cli1", monthYear: "2026-04", profitPercentage: 2.2, profitAmount: 1252.8, notes: "Efecto positivo por recalificación de crédito soberano regional.", createdAt: "2026-04-30" },
      { id: "perf1_12", clientId: "cli1", monthYear: "2026-05", profitPercentage: 1.9, profitAmount: 1106.6, notes: "Cierre de ciclo anual completo con ganancias robustas acumuladas.", createdAt: "2026-05-31" },
      { id: "perf1_13", clientId: "cli1", monthYear: "2026-06", profitPercentage: 0.5, profitAmount: 298.1, notes: "Comienzo del segundo año de acompañamiento financiero.", createdAt: "2026-06-20" }
    ];

    // Valeria Soria (6 Months) - Initial $25,000, current $27,150
    const cli2Performances: Performance[] = [
      { id: "perf2_1", clientId: "cli2", monthYear: "2026-01", profitPercentage: 2.5, profitAmount: 625, notes: "Ingreso oportuno en canasta de ETFs tecnológicos de alta capitalización.", createdAt: "2026-01-31" },
      { id: "perf2_2", clientId: "cli2", monthYear: "2026-02", profitPercentage: 3.2, profitAmount: 820, notes: "Rendimientos destacados en la porción cripto de la cartera activa.", createdAt: "2026-02-28" },
      { id: "perf2_3", clientId: "cli2", monthYear: "2026-03", profitPercentage: -1.5, profitAmount: -396, notes: "Toma de ganancias generalizada en mercados globales.", createdAt: "2026-03-31" },
      { id: "perf2_4", clientId: "cli2", monthYear: "2026-04", profitPercentage: 1.8, profitAmount: 468, notes: "Ingreso de dividendos de compañías de semiconductores.", createdAt: "2026-04-30" },
      { id: "perf2_5", clientId: "cli2", monthYear: "2026-05", profitPercentage: 2.3, profitAmount: 633, notes: "Cierre de mes con fuerte impulso de renta fija corporativa en dólares.", createdAt: "2026-05-31" }
    ];

    // Bruno Díaz (2 Months) - Initial $100,000, current $101,850
    const cli3Performances: Performance[] = [
      { id: "perf3_1", clientId: "cli3", monthYear: "2026-05", profitPercentage: 1.85, profitAmount: 1850, notes: "Colocación inicial exitosa en bonos grado de inversión y arbitraje.", createdAt: "2026-05-31" }
    ];

    // Mariana Paz (12 Months) - Initial $12,000, growth to $14,450
    const cli4Performances: Performance[] = [
      { id: "perf4_1", clientId: "cli4", monthYear: "2025-07", profitPercentage: 1.2, profitAmount: 144, notes: "Posicionamiento en Obligaciones Negociables cortas.", createdAt: "2025-07-31" },
      { id: "perf4_2", clientId: "cli4", monthYear: "2025-08", profitPercentage: 1.5, profitAmount: 182, notes: "Acumulación en fondos corporativos estables.", createdAt: "2025-08-31" },
      { id: "perf4_3", clientId: "cli4", monthYear: "2025-09", profitPercentage: 2.0, profitAmount: 246, notes: "Subas en renta variable indexada de EEUU.", createdAt: "2025-09-30" },
      { id: "perf4_4", clientId: "cli4", monthYear: "2025-10", profitPercentage: -0.8, profitAmount: -100, notes: "Ajuste transitorio por volatilidad cambiaria.", createdAt: "2025-10-31" },
      { id: "perf4_5", clientId: "cli4", monthYear: "2025-11", profitPercentage: 1.4, profitAmount: 174, notes: "Intereses devengados por colocaciones bancarias directas.", createdAt: "2025-11-30" },
      { id: "perf4_6", clientId: "cli4", monthYear: "2025-12", profitPercentage: 3.1, profitAmount: 392, notes: "Excelente impulso de fin de año en activos bursátiles.", createdAt: "2025-12-31" },
      { id: "perf4_7", clientId: "cli4", monthYear: "2026-01", profitPercentage: 1.1, profitAmount: 143, notes: "Mantenimiento estable de yields reales.", createdAt: "2026-01-31" },
      { id: "perf4_8", clientId: "cli4", monthYear: "2026-02", profitPercentage: 1.8, profitAmount: 237, notes: "Nuevas licitaciones primarias de deuda rinden con ventaja.", createdAt: "2026-02-28" },
      { id: "perf4_9", clientId: "cli4", monthYear: "2026-03", profitPercentage: 2.2, profitAmount: 295, notes: "Fuerte tendencia alcista en renta fija privada seleccionada.", createdAt: "2026-03-31" },
      { id: "perf4_10", clientId: "cli4", monthYear: "2026-04", profitPercentage: 1.5, profitAmount: 205, notes: "Liquidación trimestral de intereses corporativos.", createdAt: "2026-04-30" },
      { id: "perf4_11", clientId: "cli4", monthYear: "2026-05", profitPercentage: 2.4, profitAmount: 332, notes: "Favorable revalorización de portfolio accionario de dividendo estable.", createdAt: "2026-05-31" },
      { id: "perf4_12", clientId: "cli4", monthYear: "2026-06", profitPercentage: 1.4, profitAmount: 200, notes: "Completado el ciclo anual de 12 meses de gestión.", createdAt: "2026-06-20" }
    ];

    const allPerformances = [...cli1Performances, ...cli2Performances, ...cli3Performances, ...cli4Performances];
    for (const p of allPerformances) {
      await setDoc(doc(db, "performances", p.id), p);
    }

    // 4. Seed Transactions
    const transactionsList: Transaction[] = [
      // Alejandro Santillán
      { id: "tx_1", clientId: "cli1", date: "2025-05-15", type: "deposit", amount: 50000, assetCategory: "Efectivo", description: "Depósito de capital de inversión semilla inicial." },
      { id: "tx_2", clientId: "cli1", date: "2025-05-15", type: "initial_advisory_fee", amount: -1200, assetCategory: "Efectivo", description: "Honorarios cobrados por FINET por diseño de la cartera inicial." },
      { id: "tx_3", clientId: "cli1", date: "2025-05-20", type: "withdrawal", amount: -15000, assetCategory: "Renta Fija", description: "Compra orientada: Bonos corporativos liquidados en dólares." },
      { id: "tx_4", clientId: "cli1", date: "2025-05-25", type: "deposit", amount: 15000, assetCategory: "Renta Variable", description: "Inversión efectuada en cartera diversificada de CEDEARs de empresas globales de gran capitalización." },
      // Performance Fee Charged automatically at 1-year mark (Alejandro reached 1 year in May 2026!)
      // Profit gained during the year: ($59,620 with $50,000 capital, so gain was ~$9,321.9 in yields)
      // 10% fee: $932
      { id: "tx_5", clientId: "cli1", date: "2026-05-15", type: "annual_performance_fee", amount: -932, assetCategory: "Efectivo", description: "Cobro del 10% de honorarios sobre ganancia neta anual ganada ($9,321.9) al cumplir 1 año de permanencia." },

      // Valeria Soria
      { id: "tx_6", clientId: "cli2", date: "2025-12-10", type: "deposit", amount: 25000, assetCategory: "Efectivo", description: "Suscripción de cartera y transferencia de fondos." },
      { id: "tx_7", clientId: "cli2", date: "2025-12-10", type: "initial_advisory_fee", amount: -500, assetCategory: "Efectivo", description: "Cargo de honorarios por diseño de cartera e inicialización de cuentas de Valeria Soria." },
      { id: "tx_8", clientId: "cli2", date: "2026-01-15", type: "withdrawal", amount: -8000, assetCategory: "Cripto", description: "Adquisición de Bitcoin y Ethereum para la cuota agresiva de alta rentabilidad de la cartera." },
      { id: "tx_9", clientId: "cli2", date: "2026-01-15", type: "deposit", amount: 8000, assetCategory: "Renta Variable", description: "Inversión en portafolio industrial de robótica e inteligencia artificial." },

      // Bruno Díaz
      { id: "tx_10", clientId: "cli3", date: "2026-04-05", type: "deposit", amount: 100000, assetCategory: "Efectivo", description: "Constitución inicial de fondos." },
      { id: "tx_11", clientId: "cli3", date: "2026-04-05", type: "initial_advisory_fee", amount: -2500, assetCategory: "Efectivo", description: "Honorarios por diseño de portafolio familiar bajo mandato privado." },

      // Mariana Paz - reached exactly 1 year!
      { id: "tx_12", clientId: "cli4", date: "2025-06-20", type: "deposit", amount: 12000, assetCategory: "Efectivo", description: "Aporte inicial de fondos." },
      { id: "tx_13", clientId: "cli4", date: "2025-06-20", type: "initial_advisory_fee", amount: -300, assetCategory: "Efectivo", description: "Honorarios iniciales fijos de asesoría FINET." },
      // Performance Fee Pending (Let user click button to trigger the payment! Amazing interactive touch!)
    ];

    for (const tx of transactionsList) {
      await setDoc(doc(db, "transactions", tx.id), tx);
    }

    // 5. Seed Documents
    const docsList: ClientDocument[] = [
      { id: "doc1", clientId: "cli1", title: "Contrato de Acompañamiento Financiero - FINET.pdf", category: "Contrato", uploadDate: "2025-05-15", fileSize: "1.4 MB", status: "Firmado", url: "#" },
      { id: "doc2", clientId: "cli1", title: "Propuesta de Distribución de Activos v2.pdf", category: "Portafolio", uploadDate: "2025-05-14", fileSize: "3.2 MB", status: "Firmado", url: "#" },
      { id: "doc3", clientId: "cli1", title: "Reporte de Rentabilidad Semestral - Nov 2025.pdf", category: "Reporte", uploadDate: "2025-11-20", fileSize: "912 KB", status: "Borrador", url: "#" },
      { id: "doc4", clientId: "cli2", title: "Contrato Inicial de Adhesión - Soria.pdf", category: "Contrato", uploadDate: "2025-12-10", fileSize: "1.3 MB", status: "Firmado", url: "#" },
      { id: "doc5", clientId: "cli2", title: "Declaración de Aptitud de Riesgo Agresivo.pdf", category: "Contrato", uploadDate: "2025-12-10", fileSize: "720 KB", status: "Firmado", url: "#" },
      { id: "doc6", clientId: "cli3", title: "Estructura Patrimonial - WayneCorp.pdf", category: "Portafolio", uploadDate: "2026-04-05", fileSize: "5.5 MB", status: "Firmado", url: "#" },
      { id: "doc7", clientId: "cli4", title: "Contrato de Mandato de Inversión.pdf", category: "Contrato", uploadDate: "2025-06-20", fileSize: "1.2 MB", status: "Firmado", url: "#" }
    ];

    for (const d of docsList) {
      await setDoc(doc(db, "documents", d.id), d);
    }

    // 6. Seed Alerts
    const alertsList: Alert[] = [
      { id: "al_1", clientId: "cli1", title: "¡Hito alcanzado: +15% de Rentabilidad!", message: "El portafolio de Alejandro Santillán ha superado el 15% de rentabilidad acumulada total.", date: "2026-04-12", read: false, type: "milestone" },
      { id: "al_2", clientId: "cli1", title: "Primer Año de Permanencia Completado", message: "Se ha cumplido el primer año desde la suscripción inicial. Se aplicó el 10% sobre la ganancia neta.", date: "2026-05-15", read: true, type: "anniversary" },
      { id: "al_3", clientId: "cli2", title: "Objetivo Intermedio del 50%", message: "La cartera agresiva de Valeria Soria está al 54% de avance para alcanzar su meta de ahorro de $50,000.", date: "2026-05-30", read: false, type: "portfolio_goal" },
      { id: "al_4", clientId: "cli4", title: "¡Aniversario de 1 Año Alcanzado! 🎂", message: "Mariana Paz ha cumplido 1 año de permanencia. Balance anual y cobro de honororarios del 10% listos para procesar.", date: "2026-06-20", read: false, type: "anniversary" }
    ];

    for (const al of alertsList) {
      await setDoc(doc(db, "alerts", al.id), al);
    }

    // Mark the database as seeded so we don't seed again on subsequent empties
    await setDoc(doc(db, "settings", "setup"), { seeded: true });

    console.log("Database seeded successfully!");
  } catch (err) {
    console.error("Error seeding database:", err);
  }
}
