export interface DisplayCredit {
  amount: number;
  minimumBalance?: number;
  sandboxAmount?: number;
  availableAmount?: number;
  canAnalyze?: boolean;
  billingEnvironment?: "sandbox" | "production";
}
export function availableCredits(credits: DisplayCredit[]) {
  return credits.reduce(
    (sum, credit) =>
      sum +
      (credit.availableAmount ??
        Math.max(0, credit.amount - (credit.minimumBalance || 0))),
    0,
  );
}
export function canFundAnalysis(credits: DisplayCredit[]) {
  // A debit comes entirely from one pool. Four paid + four test credits cannot fund it.
  return credits.some(
    (credit) =>
      credit.canAnalyze ??
      Math.max(0, credit.amount - (credit.minimumBalance || 0)) >= 8,
  );
}
export function sandboxBilling(credits: DisplayCredit[]) {
  return credits.some((credit) => credit.billingEnvironment === "sandbox");
}
