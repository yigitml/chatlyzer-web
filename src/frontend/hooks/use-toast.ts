import { useCallback, useEffect, useRef, useState } from "react";
interface ToastState {
  message: string;
  type: "success" | "error";
}
export const useToast = () => {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideToast = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToast(null);
  }, []);
  const showToast = useCallback(
    (message: string, type: "success" | "error") => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, type });
      timer.current = setTimeout(() => setToast(null), 4000);
    },
    [],
  );
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return { toast, showToast, hideToast };
};
