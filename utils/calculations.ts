// ─────────────────────────────────────────────────────────
// Earnings Calculation — shared with backend
// ─────────────────────────────────────────────────────────

export interface CalcInput {
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
  
  maintenanceFee: number;
  sharePercent: number;
}

export const calculate = (input: CalcInput) => {
  const totalFare =
    input.uber + input.ola + input.rapido + input.direct -
    input.driveAllowance - input.tip;

  const balance = totalFare - input.gas - input.maintenanceFee - input.commission;
  const share = Math.ceil((balance * input.sharePercent) / 100);

  const totalCashReceived =
    input.uberCash + input.olaCash + input.rapidoCash + input.directCash;

  const cashSettlement =
    totalCashReceived - input.gas - share - input.otherExpense +
    input.toll - input.tip - input.driveAllowance;

  return { totalFare, balance, share, totalCashReceived, cashSettlement };
};
