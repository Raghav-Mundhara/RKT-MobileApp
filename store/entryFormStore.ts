import { create } from "zustand";

// Entry field names for form inputs
export type EntryField =
  | "uber" | "ola" | "rapido" | "direct"
  | "uberCash" | "olaCash" | "rapidoCash" | "directCash"
  | "gas" | "toll" | "otherExpense" | "tip"
  | "driveAllowance" | "commission";

interface EntryFormState {
  date: Date;
  uber: number;
  ola: number;
  rapido: number;
  direct: number;
  uberCash: number;
  olaCash: number;
  rapidoCash: number;
  directCash: number;
  gas: number;
  toll: number;
  otherExpense: number;
  tip: number;
  driveAllowance: number;
  commission: number;

  setDate: (date: Date) => void;
  setField: (field: EntryField, value: number) => void;
  reset: () => void;
}

const initialValues = {
  uber: 0, ola: 0, rapido: 0, direct: 0,
  uberCash: 0, olaCash: 0, rapidoCash: 0, directCash: 0,
  gas: 0, toll: 0, otherExpense: 0, tip: 0,
  driveAllowance: 0, commission: 0,
};

export const useEntryFormStore = create<EntryFormState>((set) => ({
  date: new Date(),
  ...initialValues,

  setDate: (date) => set({ date }),
  setField: (field, value) => set({ [field]: value }),
  reset: () => set({ date: new Date(), ...initialValues }),
}));
