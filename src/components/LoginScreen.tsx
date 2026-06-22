import React, { useState } from "react";
import { Advisor } from "../types";
import { Compass, Lock, UserCheck, AlertCircle, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";

interface LoginScreenProps {
  advisors: Advisor[];
  onLogin: (advisor: Advisor) => void;
}

export default function LoginScreen({ advisors, onLogin }: LoginScreenProps) {
  const [selectedAdvisor, setSelectedAdvisor] = useState<Advisor | null>(null);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default security PIN for demo purposes
  const DEMO_PIN = "1234";

  const getLoginAdvisorTheme = (name: string) => {
    const normName = name.toLowerCase().trim();
    if (normName.includes("facu")) {
      return {
        avatarColor: "bg-amber-500/10 text-amber-500 border-amber-500/30",
        selectedBorder: "border-[#d97706]",
        bulletBg: "bg-[#d97706]"
      };
    }
    if (normName.includes("mati")) {
      return {
        avatarColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        selectedBorder: "border-[#059669]",
        bulletBg: "bg-[#059669]"
      };
    }
    if (normName.includes("lalo")) {
      return {
        avatarColor: "bg-blue-500/10 text-blue-400 border-blue-500/30",
        selectedBorder: "border-[#2563eb]",
        bulletBg: "bg-[#2563eb]"
      };
    }
    return {
      avatarColor: "bg-yellow-500/10 text-[#cccc00] border-yellow-500/30",
      selectedBorder: "border-[#cccc00]",
      bulletBg: "bg-[#cccc00]"
    };
  };

  const handleSelectAdvisor = (advisor: Advisor) => {
    setSelectedAdvisor(advisor);
    setPin("");
    setErrorCode(null);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdvisor) return;

    setIsSubmitting(true);
    setErrorCode(null);

    // Simulated short delay for highly responsive terminal validation effect
    setTimeout(() => {
      if (pin === DEMO_PIN) {
        onLogin(selectedAdvisor);
      } else {
        setErrorCode("El PIN ingresado es incorrecto. Intente con '1234'.");
        setIsSubmitting(false);
      }
    }, 450);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-8">
        
        {/* LOGO AND BRANDING */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-900 border border-brand/30 shadow-2xl relative overflow-hidden">
            <svg id="Capa_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190.03 190.03" className="w-full h-full">
              <rect fill="#d2cc00" stroke="#12100b" strokeWidth="0.51" x=".26" y=".26" width="189.52" height="189.52"/>
              <path fill="#12100b" d="M25.09,164.94h139.85V25.09H25.09v139.85ZM127.36,69.53h-46v18.09h40.53v16.99h-40.53v32.89h-18.69V52.54h64.69v16.99Z"/>
            </svg>
            <div 
              style={{ borderRadius: "0.3554400000000002px" }} 
              className="absolute -top-1 -right-1 w-3 h-3 bg-brand rounded-full animate-ping opacity-75" 
            />
          </div>
          <div>
            <h1 
              style={{ lineHeight: "30px", height: "39px", fontSize: "40px" }} 
              className="font-extrabold tracking-[0.2em] text-white font-sans mt-2"
            >
              FINET
            </h1>
            <span className="text-[10px] text-[#cccc00] font-bold uppercase tracking-[0.25em] block mt-1">Acompañamiento financiero</span>
          </div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Por favor, seleccione su perfil de asesor para acceder a la terminal de control integrada de carteras de inversores.
          </p>
        </div>

        {/* CONTAINER CARD */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-2xl p-6 backdrop-blur-md space-y-6">
          
          {/* PROFILE SELECTION TAB */}
          <div className="space-y-3">
            <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Asesores Registrados
            </label>
            <div className="grid grid-cols-1 gap-2.5">
              {advisors.map((adv) => {
                const isSelected = selectedAdvisor?.id === adv.id;
                const theme = getLoginAdvisorTheme(adv.name);

                return (
                  <button
                    key={adv.id}
                    onClick={() => handleSelectAdvisor(adv)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all duration-300 ${
                      isSelected
                        ? `bg-zinc-800/80 ${theme.selectedBorder} shadow-lg transform -translate-y-0.5`
                        : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold border text-sm ${theme.avatarColor}`}>
                        {adv.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-slate-100">{adv.name}</h3>
                      </div>
                    </div>
                    {isSelected && (
                      <div className={`w-5 h-5 rounded-full ${theme.bulletBg} flex items-center justify-center shadow-md`}>
                        <UserCheck className="w-3.5 h-3.5 text-black font-extrabold" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* PASSWORD PIN CARD */}
          {selectedAdvisor && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleLoginSubmit}
              className="space-y-4 pt-4 border-t border-zinc-800"
            >
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    PIN de Seguridad
                  </label>
                  <span className="text-[9px] text-slate-500 font-medium">Demostración: 1234</span>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPin ? "text" : "password"}
                    maxLength={10}
                    placeholder="Ingrese su PIN de acceso"
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value);
                      if (errorCode) setErrorCode(null);
                    }}
                    disabled={isSubmitting}
                    className="w-full bg-zinc-950 border border-zinc-700 hover:border-zinc-500 text-white rounded-xl pl-9 pr-10 py-3 text-xs outline-none focus:border-[#cccc00] focus:ring-1 focus:ring-[#cccc00]/35 transition font-mono tracking-widest text-center"
                    style={{ color: '#ffffff' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-550 hover:text-slate-350 transition"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {errorCode && (
                <div className="flex items-start gap-2 text-xs text-rose-400 bg-rose-950/20 border border-rose-900/30 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorCode}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !pin}
                className="w-full py-3 px-4 bg-brand hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-slate-500 text-black font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-2xl uppercase tracking-wider relative overflow-hidden"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-1.5">
                    <svg className="animate-spin h-3.5 w-3.5 text-black" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Autenticando...</span>
                  </div>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Establecer Conexión</span>
                  </>
                )}
              </button>
            </motion.form>
          )}

        </div>

        {/* SECURE SUB-FOOTER */}
        <p className="text-center text-[10px] text-slate-500 font-mono flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          FINET SECURITY INTERFACE ACTIVE • AES-256 ENCRYPTED
        </p>

      </div>
    </div>
  );
}
