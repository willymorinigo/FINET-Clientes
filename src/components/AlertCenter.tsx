import React, { useState } from "react";
import { Alert } from "../types";
import { Bell, X, Check, Calendar, Milestone, AlertTriangle, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AlertCenterProps {
  alerts: Alert[];
  onDismiss: (id: string) => void;
  onClearAll: () => void;
}

export default function AlertCenter({ alerts, onDismiss, onClearAll }: AlertCenterProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const unreadAlerts = alerts.filter(al => !al.read);

  return (
    <div className="relative">
      {/* TRIGGER BUTTON */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-650 hover:text-slate-800 transition duration-200 shadow-sm"
      >
        <Bell className="w-4 h-4" />
        {unreadAlerts.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-slate-900 text-brand font-bold text-[10px] rounded-full flex items-center justify-center shadow-sm border border-slate-900">
            {unreadAlerts.length}
          </span>
        )}
      </button>

      {/* DROPDOWN OVERLAY */}
      <AnimatePresence>
        {showDropdown && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowDropdown(false)} />
            
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-40 overflow-hidden"
            >
              {/* DROPDOWN HEADER */}
              <div className="p-4 bg-slate-50 border-b border-slate-150 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Centro de Notificaciones</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Alertas automáticas de hitos de carteras FINET</p>
                </div>
                {alerts.length > 0 && (
                  <button
                    onClick={onClearAll}
                    className="text-[10px] text-slate-500 hover:text-amber-600 hover:font-bold underline transition"
                  >
                    Borrar todas
                  </button>
                )}
              </div>

              {/* DROPDOWN CONTENT */}
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {alerts.length === 0 ? (
                  <div className="p-6 text-center text-slate-450 text-xs">
                    <Check className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
                    Sin alertas pendientes.
                  </div>
                ) : (
                  alerts.map(al => {
                    // Type styling
                    let iconEl = <MessageSquare className="w-4 h-4 text-slate-400" />;
                    if (al.type === "milestone") {
                      iconEl = <Milestone className="w-4 h-4 text-emerald-600" />;
                    } else if (al.type === "anniversary") {
                      iconEl = <Calendar className="w-4 h-4 text-amber-500" />;
                    } else if (al.type === "portfolio_goal") {
                      iconEl = <AlertTriangle className="w-4 h-4 text-amber-600" />;
                    }

                    return (
                      <div key={al.id} className={`p-4 hover:bg-slate-50/50 transition relative group ${!al.read ? 'bg-brand/5 border-l-2 border-brand' : ''}`}>
                        <div className="flex gap-3">
                          <div className="mt-0.5 p-1 rounded-lg bg-slate-50 border border-slate-150 shrink-0">
                            {iconEl}
                          </div>
                          
                          <div className="space-y-1 pr-4">
                            <h5 className="font-bold text-xs text-slate-800 leading-snug">{al.title}</h5>
                            <p className="text-[10px] text-slate-500 leading-relaxed">{al.message}</p>
                            <span className="block text-[9px] text-slate-400 font-mono">{al.date}</span>
                          </div>
                        </div>

                        {/* DISMISS BUTTON */}
                        <button
                          onClick={() => onDismiss(al.id)}
                          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
