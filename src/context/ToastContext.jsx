import { createContext, useContext, useState, useCallback } from "react";
import { BadgeCheck, AlertCircle } from "lucide-react";

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [timeoutId, setTimeoutId] = useState(null);

  const showToast = useCallback(
    (message, type = "success") => {
      setToast({ show: true, message, type });
      if (timeoutId) clearTimeout(timeoutId);

      const id = setTimeout(() => {
        setToast((prev) => ({ ...prev, show: false }));
      }, 3000);
      setTimeoutId(id);
    },
    [timeoutId],
  );

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div
        className={`fixed bottom-6 right-6 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg transition-all duration-300 transform z-[9999] ${
          toast.show
            ? "translate-y-0 opacity-100"
            : "translate-y-8 opacity-0 pointer-events-none"
        } ${toast.type === "success" ? "bg-slate-900 text-white" : "bg-red-600 text-white"}`}
      >
        {toast.type === "success" ? (
          <BadgeCheck className="w-5 h-5 text-emerald-400" />
        ) : (
          <AlertCircle className="w-5 h-5 text-white" />
        )}
        <p className="font-medium text-sm">{toast.message}</p>
      </div>
    </ToastContext.Provider>
  );
};