import type { DebtItem, DebtPlan } from "@shared/schema";

export interface PayoffDataPoint {
  month: number;
  date: Date;
  originalBalance: number;
  originalTotalPaid: number;
  proposedBalance: number;
  proposedTotalPaid: number;
}

export interface PayoffSchedule {
  data: PayoffDataPoint[];
  originalPayoffDate: Date | null;
  proposedPayoffDate: Date | null;
  originalTotalInterest: number;
  proposedTotalInterest: number;
}

/**
 * Calculate minimum payment schedule for a single debt
 */
function calculateMinimumPaymentSchedule(
  debt: DebtItem,
  startDate: Date = new Date()
): PayoffDataPoint[] {
  const schedule: PayoffDataPoint[] = [];
  let balance = debt.balance;
  let totalPaid = 0;
  const monthlyRate = debt.interestRate / 100 / 12;
  let currentDate = new Date(startDate);
  let month = 0;

  while (balance > 0.01 && month < 600) { // Max 50 years
    const interest = balance * monthlyRate;
    const principalPayment = Math.min(debt.minimumPayment - interest, balance);
    const payment = interest + principalPayment;
    
    balance = Math.max(0, balance - principalPayment);
    totalPaid += payment;

    schedule.push({
      month,
      date: new Date(currentDate),
      originalBalance: balance,
      originalTotalPaid: totalPaid,
      proposedBalance: balance,
      proposedTotalPaid: totalPaid,
    });

    currentDate.setMonth(currentDate.getMonth() + 1);
    month++;
  }

  return schedule;
}

/**
 * Calculate proposed payment schedule with extra payments
 */
function calculateProposedPaymentSchedule(
  debt: DebtItem,
  extraMonthlyPayment: number,
  oneTimePayment: number,
  startDate: Date = new Date()
): PayoffDataPoint[] {
  const schedule: PayoffDataPoint[] = [];
  let balance = debt.balance;
  let totalPaid = 0;
  const monthlyRate = debt.interestRate / 100 / 12;
  let currentDate = new Date(startDate);
  let month = 0;
  let oneTimeApplied = false;

  // Apply one-time payment at the start
  if (oneTimePayment > 0 && !oneTimeApplied) {
    balance = Math.max(0, balance - oneTimePayment);
    totalPaid += oneTimePayment;
    oneTimeApplied = true;
  }

  while (balance > 0.01 && month < 600) {
    const interest = balance * monthlyRate;
    const totalPayment = debt.minimumPayment + extraMonthlyPayment;
    const principalPayment = Math.min(totalPayment - interest, balance);
    const payment = interest + principalPayment;
    
    balance = Math.max(0, balance - principalPayment);
    totalPaid += payment;

    schedule.push({
      month,
      date: new Date(currentDate),
      originalBalance: 0, // Will be filled by merge
      originalTotalPaid: 0, // Will be filled by merge
      proposedBalance: balance,
      proposedTotalPaid: totalPaid,
    });

    currentDate.setMonth(currentDate.getMonth() + 1);
    month++;
  }

  return schedule;
}

/**
 * Calculate payoff schedule for a single debt with comparison
 */
export function calculateDebtPayoffSchedule(
  debt: DebtItem,
  extraMonthlyPayment: number = 0,
  oneTimePayment: number = 0,
  startDate: Date = new Date()
): PayoffSchedule {
  const originalSchedule = calculateMinimumPaymentSchedule(debt, startDate);
  const proposedSchedule = calculateProposedPaymentSchedule(
    debt,
    extraMonthlyPayment,
    oneTimePayment,
    startDate
  );

  // Merge schedules to align by month
  const merged: PayoffDataPoint[] = [];
  const maxMonths = Math.max(originalSchedule.length, proposedSchedule.length);

  for (let month = 0; month < maxMonths; month++) {
    const original = originalSchedule[month];
    const proposed = proposedSchedule[month];

    if (original && proposed) {
      merged.push({
        month,
        date: original.date,
        originalBalance: original.originalBalance,
        originalTotalPaid: original.originalTotalPaid,
        proposedBalance: proposed.proposedBalance,
        proposedTotalPaid: proposed.proposedTotalPaid,
      });
    } else if (original) {
      merged.push({
        month,
        date: original.date,
        originalBalance: original.originalBalance,
        originalTotalPaid: original.originalTotalPaid,
        proposedBalance: 0,
        proposedTotalPaid: original.originalTotalPaid,
      });
    } else if (proposed) {
      merged.push({
        month,
        date: proposed.date,
        originalBalance: 0,
        originalTotalPaid: proposed.proposedTotalPaid,
        proposedBalance: proposed.proposedBalance,
        proposedTotalPaid: proposed.proposedTotalPaid,
      });
    }
  }

  const originalPayoffDate = originalSchedule.length > 0 
    ? originalSchedule[originalSchedule.length - 1].date 
    : null;
  const proposedPayoffDate = proposedSchedule.length > 0 
    ? proposedSchedule[proposedSchedule.length - 1].date 
    : null;

  const originalTotalInterest = originalSchedule.length > 0
    ? originalSchedule[originalSchedule.length - 1].originalTotalPaid - debt.balance
    : 0;
  const proposedTotalInterest = proposedSchedule.length > 0
    ? proposedSchedule[proposedSchedule.length - 1].proposedTotalPaid - debt.balance
    : 0;

  return {
    data: merged,
    originalPayoffDate,
    proposedPayoffDate,
    originalTotalInterest,
    proposedTotalInterest,
  };
}
