import { expect, it } from "vitest";
import {
  availableCredits,
  canFundAnalysis,
  sandboxBilling,
} from "@/frontend/lib/creditBalance";
it("shows eligible sandbox funds without treating them as paid credits", () => {
  const credits = [
    {
      amount: 0,
      sandboxAmount: 24,
      availableAmount: 24,
      billingEnvironment: "sandbox" as const,
      canAnalyze: true,
    },
  ];
  expect(availableCredits(credits)).toBe(24);
  expect(canFundAnalysis(credits)).toBe(true);
  expect(sandboxBilling(credits)).toBe(true);
});
it("does not combine two insufficient pools into an eligible analysis", () => {
  const credits = [
    {
      amount: 4,
      sandboxAmount: 4,
      availableAmount: 8,
      billingEnvironment: "sandbox" as const,
      canAnalyze: false,
    },
  ];
  expect(availableCredits(credits)).toBe(8);
  expect(canFundAnalysis(credits)).toBe(false);
});
it("ignores test funds in production and debt in available balances", () => {
  expect(
    availableCredits([
      {
        amount: -16,
        sandboxAmount: 24,
        availableAmount: 0,
        canAnalyze: false,
        billingEnvironment: "production",
      },
    ]),
  ).toBe(0);
  expect(
    canFundAnalysis([
      {
        amount: -16,
        sandboxAmount: 24,
        availableAmount: 0,
        canAnalyze: false,
        billingEnvironment: "production",
      },
    ]),
  ).toBe(false);
});
