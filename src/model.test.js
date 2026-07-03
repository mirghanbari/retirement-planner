import { describe, it, expect } from "vitest";
import {
  calculate,
  monthlyPayment,
  MORTGAGE_RATE,
  MGMT_FEE_RATE,
  FURNISHED_PREMIUM,
  RELOCATION_FEE,
  INSURANCE_MONTHLY,
  MAINTENANCE_RATE,
  PROJECTION_YEARS,
} from "./model.js";

// App defaults
const base = {
  cash: 400000,
  k401: 265000,
  monthlySavings: 5000,
  homeValue: 805000,
  mortgage: 630000,
  piti: 4300,
  cashReturn: 6,
  kReturn: 7,
  homeAppreciation: 2.5,
  rentalGross: 3500,
  furnishedPremium: true,
  clientIncome: 1500,
  withdrawalRate: 5,
  overseasHome: 200000,
  years: 5,
  k401Accessible: false,
};

describe("projection basics", () => {
  it("produces 10 years of data and picks the target year", () => {
    const calc = calculate(base);
    expect(calc.yearData).toHaveLength(PROJECTION_YEARS);
    expect(calc.target).toBe(calc.yearData[base.years - 1]);
  });

  it("compounds cash with mid-year contributions in year 1", () => {
    const { yearData } = calculate(base);
    // 400k * 1.06 + 60k * 1.03
    expect(yearData[0].cashBal).toBeCloseTo(485800, 0);
  });

  it("home equity is always home value minus mortgage balance", () => {
    const { yearData } = calculate(base);
    for (const d of yearData) {
      expect(d.homeEquity).toBeCloseTo(d.homeBal - d.mortgageBal, 6);
    }
  });
});

describe("amortization (fixed payment, not annual re-cast)", () => {
  it("computes the standard 30-year payment", () => {
    // $630k at 5.5%/360mo ≈ $3,577/mo
    expect(monthlyPayment(630000, MORTGAGE_RATE)).toBeCloseTo(3577, 0);
  });

  it("pays down more principal each year as interest share shrinks", () => {
    const { yearData } = calculate(base);
    for (let i = 1; i < yearData.length; i++) {
      expect(yearData[i].principalPaid).toBeGreaterThan(yearData[i - 1].principalPaid);
    }
    // Year-1 principal on a fresh 630k/5.5% loan is ~8.4k
    expect(yearData[0].principalPaid).toBeGreaterThan(8000);
    expect(yearData[0].principalPaid).toBeLessThan(9000);
  });

  it("annual principal grows by the monthly rate compounded 12x", () => {
    const { yearData } = calculate(base);
    const growth = yearData[1].principalPaid / yearData[0].principalPaid;
    expect(growth).toBeCloseTo(Math.pow(1 + MORTGAGE_RATE / 100 / 12, 12), 4);
  });
});

describe("401k accounting", () => {
  it("never double-counts the 401k in totalInvestable", () => {
    const off = calculate({ ...base, k401Accessible: false });
    const on = calculate({ ...base, k401Accessible: true });
    for (let i = 0; i < PROJECTION_YEARS; i++) {
      expect(off.yearData[i].totalInvestable).toBeCloseTo(
        off.yearData[i].cashBal + off.yearData[i].k401Bal,
        6
      );
      expect(on.yearData[i].totalInvestable).toBeCloseTo(off.yearData[i].totalInvestable, 6);
    }
  });

  it("accessibility toggle changes yearly income but not balances", () => {
    const off = calculate({ ...base, k401Accessible: false });
    const on = calculate({ ...base, k401Accessible: true });
    expect(on.yearData[0].investmentIncome).toBeGreaterThan(off.yearData[0].investmentIncome);
    expect(on.yearData[0].cashBal).toBe(off.yearData[0].cashBal);
  });

  it("scenario C draws on the 401k, scenario B does not", () => {
    const calc = calculate(base);
    const extra = (calc.target.k401Bal * base.withdrawalRate) / 100 / 12;
    expect(calc.scenarioC.investment - calc.scenarioB.investment).toBeCloseTo(extra, 6);
  });
});

describe("rental scenarios", () => {
  it("scenario A (unfurnished) is unaffected by the furnished toggle", () => {
    const furnished = calculate({ ...base, furnishedPremium: true });
    const unfurnished = calculate({ ...base, furnishedPremium: false });
    expect(furnished.scenarioA.rental).toBeCloseTo(unfurnished.scenarioA.rental, 6);
    expect(furnished.scenarioA.total).toBeCloseTo(unfurnished.scenarioA.total, 6);
  });

  it("scenario B includes the furnished premium net of fees, and skips mgmt fee", () => {
    const calc = calculate(base);
    const expectedDiff =
      FURNISHED_PREMIUM - RELOCATION_FEE + base.rentalGross * MGMT_FEE_RATE;
    expect(calc.scenarioB.rental - calc.scenarioA.rental).toBeCloseTo(expectedDiff, 6);
  });

  it("year-by-year net rental follows the furnished toggle", () => {
    const furnished = calculate({ ...base, furnishedPremium: true });
    const unfurnished = calculate({ ...base, furnishedPremium: false });
    expect(furnished.yearData[0].netRental).toBeGreaterThan(unfurnished.yearData[0].netRental);
  });

  it("unfurnished net rental matches its line items", () => {
    const calc = calculate({ ...base, furnishedPremium: false });
    const d = calc.yearData[0];
    const expected =
      base.rentalGross -
      base.rentalGross * MGMT_FEE_RATE -
      (d.homeBal * MAINTENANCE_RATE) / 12 -
      INSURANCE_MONTHLY -
      base.piti;
    expect(d.netRental).toBeCloseTo(expected, 6);
  });
});

describe("the user's plan (sidebar toggles)", () => {
  it("scenario cards are fixed archetypes — toggles don't move them", () => {
    const a = calculate({ ...base, furnishedPremium: false, k401Accessible: false });
    const b = calculate({ ...base, furnishedPremium: true, k401Accessible: true });
    expect(a.scenarioA.total).toBeCloseTo(b.scenarioA.total, 6);
    expect(a.scenarioB.total).toBeCloseTo(b.scenarioB.total, 6);
    expect(a.scenarioC.total).toBeCloseTo(b.scenarioC.total, 6);
  });

  it("the furnished toggle changes the plan's rental income", () => {
    const on = calculate({ ...base, furnishedPremium: true });
    const off = calculate({ ...base, furnishedPremium: false });
    const expectedDiff =
      FURNISHED_PREMIUM - RELOCATION_FEE + base.rentalGross * MGMT_FEE_RATE;
    expect(on.plan.rental - off.plan.rental).toBeCloseTo(expectedDiff, 6);
  });

  it("the 401k toggle changes the plan's investment income", () => {
    const on = calculate({ ...base, k401Accessible: true });
    const off = calculate({ ...base, k401Accessible: false });
    const expected = (on.target.k401Bal * base.withdrawalRate) / 100 / 12;
    expect(on.plan.investment - off.plan.investment).toBeCloseTo(expected, 6);
  });

  it("plan matches scenario B when toggles say furnished, no 401k", () => {
    const calc = calculate({ ...base, furnishedPremium: true, k401Accessible: false });
    expect(calc.plan.total).toBeCloseTo(calc.scenarioB.total, 6);
  });
});

describe("negative rental cash flow", () => {
  it("a money-losing rental reduces monthly totals instead of clamping to $0", () => {
    const calc = calculate(base); // rental is cash-flow negative at defaults
    expect(calc.scenarioA.rental).toBeLessThan(0);
    expect(calc.scenarioA.total).toBeCloseTo(
      calc.scenarioA.investment + calc.scenarioA.rental,
      6
    );
    expect(calc.plan.total).toBeCloseTo(
      calc.plan.investment + calc.plan.rental + calc.plan.client,
      6
    );
    expect(calc.yearData[0].totalMonthly).toBeCloseTo(
      calc.yearData[0].investmentIncome + calc.yearData[0].netRental + base.clientIncome,
      6
    );
  });

  it("the furnished toggle moves plan.total even while rental is negative", () => {
    const on = calculate({ ...base, furnishedPremium: true });
    const off = calculate({ ...base, furnishedPremium: false });
    const expectedDiff =
      FURNISHED_PREMIUM - RELOCATION_FEE + base.rentalGross * MGMT_FEE_RATE;
    expect(on.plan.total - off.plan.total).toBeCloseTo(expectedDiff, 6);
  });
});

describe("overseas home purchase", () => {
  it("doesn't touch the portfolio when home equity covers the budget", () => {
    const calc = calculate(base); // equity at yr 5 ≈ $330k > $200k budget
    expect(calc.overseasGap).toBe(0);
    expect(calc.investablePool).toBe(calc.target.liquidInvestable);
  });

  it("funds only the gap beyond home equity from the liquid portfolio", () => {
    const calc = calculate({ ...base, overseasHome: 350000, years: 2 });
    const expectedGap = 350000 - calc.target.homeEquity;
    expect(expectedGap).toBeGreaterThan(0);
    expect(calc.overseasGap).toBeCloseTo(expectedGap, 6);
    expect(calc.investablePool).toBeCloseTo(calc.target.liquidInvestable - expectedGap, 6);
  });

  it("reduces scenario investment income when a gap exists", () => {
    const noGap = calculate(base);
    const withGap = calculate({ ...base, overseasHome: 350000, years: 2 });
    const drawOnFullPool =
      (withGap.target.liquidInvestable * base.withdrawalRate) / 100 / 12;
    expect(withGap.scenarioB.investment).toBeLessThan(drawOnFullPool);
    expect(noGap.scenarioB.investment).toBeCloseTo(
      (noGap.target.liquidInvestable * base.withdrawalRate) / 100 / 12,
      6
    );
  });
});
