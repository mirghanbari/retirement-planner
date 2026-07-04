// Financial projection model — pure functions, no React.

export const MORTGAGE_RATE = 5.5; // annual %, fixed per plan
export const MORTGAGE_TERM_MONTHS = 360;
export const INSURANCE_MONTHLY = 900; // insurance + property tax
export const MAINTENANCE_RATE = 0.01; // fraction of home value per year
export const MGMT_FEE_RATE = 0.09; // long-term property management, fraction of gross rent
export const FURNISHED_PREMIUM = 800; // $/mo over unfurnished gross rent
export const RELOCATION_FEE = 600; // $/mo amortized relocation-agency cost
export const SELLING_COST_RATE = 0.06; // realtor + closing costs on a home sale
export const PROJECTION_YEARS = 10;

export const monthlyPayment = (principal, annualRatePct, months = MORTGAGE_TERM_MONTHS) => {
  const i = annualRatePct / 100 / 12;
  return (principal * (i * Math.pow(1 + i, months))) / (Math.pow(1 + i, months) - 1);
};

export function calculate({
  cash,
  k401,
  monthlySavings,
  homeValue,
  mortgage,
  piti,
  cashReturn,
  kReturn,
  homeAppreciation,
  rentalGross,
  furnishedPremium,
  clientIncome,
  withdrawalRate,
  overseasHome,
  years,
  k401Accessible,
  sellHome,
}) {
  const annualSavings = monthlySavings * 12;
  const r = cashReturn / 100;
  const rk = kReturn / 100;
  const ra = homeAppreciation / 100;

  // Fixed payment set at origination; the principal share grows each year.
  const payment = monthlyPayment(mortgage, MORTGAGE_RATE);
  const mRate = MORTGAGE_RATE / 100 / 12;

  const netRentalAt = (homeBal, furnished) => {
    const maintenance = (homeBal * MAINTENANCE_RATE) / 12;
    return furnished
      ? rentalGross + FURNISHED_PREMIUM - RELOCATION_FEE - maintenance - INSURANCE_MONTHLY - piti
      : rentalGross - rentalGross * MGMT_FEE_RATE - maintenance - INSURANCE_MONTHLY - piti;
  };

  const yearData = [];
  let cashBal = cash;
  let k401Bal = k401;
  let homeBal = homeValue;
  let mortgageBal = mortgage;

  for (let y = 1; y <= PROJECTION_YEARS; y++) {
    cashBal = cashBal * (1 + r) + annualSavings * (1 + r / 2);
    k401Bal = k401Bal * (1 + rk);
    homeBal = homeBal * (1 + ra);

    let principalPaid = 0;
    for (let m = 0; m < 12 && mortgageBal > 0; m++) {
      const p = Math.min(payment - mortgageBal * mRate, mortgageBal);
      principalPaid += p;
      mortgageBal -= p;
    }

    const homeEquity = homeBal - mortgageBal;
    const netRental = netRentalAt(homeBal, furnishedPremium);
    const accessible = cashBal + (k401Accessible ? k401Bal : 0);
    const investmentIncome = (accessible * withdrawalRate) / 100 / 12;

    yearData.push({
      year: y,
      cashBal,
      k401Bal,
      homeBal,
      mortgageBal,
      homeEquity,
      principalPaid,
      liquidInvestable: cashBal,
      totalInvestable: cashBal + k401Bal,
      netRental,
      investmentIncome,
      totalMonthly: investmentIncome + netRental + clientIncome,
    });
  }

  const target = yearData[years - 1];

  // Departure strategy. Selling converts equity to cash (net of selling costs) and
  // forfeits rental income; keeping leaves the equity locked in the house, so the
  // overseas purchase comes entirely out of the liquid portfolio.
  const saleProceeds = target.homeEquity * (1 - SELLING_COST_RATE);
  const spendable = target.liquidInvestable + (sellHome ? saleProceeds : 0);
  const investablePool = Math.max(spendable - overseasHome, 0);

  const draw = (pool) => (pool * withdrawalRate) / 100 / 12;
  const rentalFor = (furnished) => (sellHome ? 0 : netRentalAt(target.homeBal, furnished));

  const scenarioA = {
    name: "Conservative",
    desc: sellHome ? "Home sold, portfolio income only, no clients" : "Long-term unfurnished, no 401k, no clients",
    investment: draw(investablePool),
    rental: rentalFor(false),
    client: 0,
  };
  scenarioA.total = scenarioA.investment + scenarioA.rental;

  const scenarioB = {
    name: "Moderate",
    desc: sellHome ? "Home sold, 1 client retained" : "Furnished/corporate lease, 1 client",
    investment: draw(investablePool),
    rental: rentalFor(true),
    client: clientIncome,
  };
  scenarioB.total = scenarioB.investment + scenarioB.rental + scenarioB.client;

  const scenarioC = {
    name: "Optimal",
    desc: sellHome ? "Home sold, 401k accessible, 1–2 clients" : "401k accessible, furnished, 1–2 clients",
    investment: draw(investablePool + target.k401Bal),
    rental: rentalFor(true),
    client: clientIncome,
  };
  scenarioC.total = scenarioC.investment + scenarioC.rental + scenarioC.client;

  // The user's own plan: follows the sidebar toggles, unlike the fixed scenario archetypes.
  const plan = {
    investment: draw(investablePool + (k401Accessible ? target.k401Bal : 0)),
    rental: rentalFor(furnishedPremium),
    client: clientIncome,
  };
  plan.total = plan.investment + plan.rental + plan.client;

  return { yearData, target, scenarioA, scenarioB, scenarioC, plan, investablePool, saleProceeds };
}
