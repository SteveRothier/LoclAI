import { create } from "zustand";

export type ToastType = "success" | "error" | "info";

type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastState = {
  toasts: Toast[];
  show: (message: string, type?: ToastType) => void;
  dismiss: (id: string) => void;
};

let toastCounter = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show: (message, type = "info") => {
    const id = `toast-${++toastCounter}`;
    set({ toasts: [...get().toasts, { id, message, type }] });
    window.setTimeout(() => {
      get().dismiss(id);
    }, 4000);
  },
  dismiss: (id) => {
    set({ toasts: get().toasts.filter((toast) => toast.id !== id) });
  },
}));
