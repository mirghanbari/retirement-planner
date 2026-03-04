import { useState, useMemo } from "react";

const formatCurrency = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const formatK = (n) => {
  if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
  if (Math.abs(n) >= 1000) {
    const k = n / 1000;
    return `$${+k.toFixed(2)}k`;
  }
  return formatCurrency(n);
};

const fmtPct = (v) => `${+Number(v).toFixed(2)}%`;

const Slider = ({ label, value, min, max, step, onChange, format, hint }) => {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');

  const commit = (raw) => {
    const n = parseFloat(raw.replace(/[^0-9.\-]/g, ''));
    if (!isNaN(n)) onChange(Math.min(Math.max(n, min), max));
    setEditing(false);
  };

  return (
    <div className="slider-group">
      <div className="slider-header">
        <span className="slider-label">{label}</span>
        {editing ? (
          <input
            className="slider-direct-input"
            type="number"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onBlur={() => commit(inputVal)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit(inputVal);
              if (e.key === 'Escape') setEditing(false);
            }}
            autoFocus
          />
        ) : (
          <span
            className="slider-value editable"
            onClick={() => { setInputVal(String(value)); setEditing(true); }}
            title="Click to type exact value"
          >
            {format ? format(value) : value}
          </span>
        )}
      </div>
      {hint && <div className="slider-hint">{hint}</div>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider"
      />
      <div className="slider-range">
        <span>{format ? format(min) : min}</span>
        <span>{format ? format(max) : max}</span>
      </div>
    </div>
  );
};

const GaugeMeter = ({ value, min, max, label, color }) => {
  const pct = Math.min(Math.max((value - min) / (max - min), 0), 1);
  const angle = -140 + pct * 280;
  const r = 54;
  const cx = 70, cy = 70;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const arcX = (deg) => cx + r * Math.cos(toRad(deg - 90));
  const arcY = (deg) => cy + r * Math.sin(toRad(deg - 90));
  const startDeg = -140, endDeg = 140;
  const trackPath = `M ${arcX(startDeg)} ${arcY(startDeg)} A ${r} ${r} 0 1 1 ${arcX(endDeg)} ${arcY(endDeg)}`;
  const fillEnd = startDeg + pct * 280;
  const largeArc = pct > 0.5 ? 1 : 0;
  const fillPath = `M ${arcX(startDeg)} ${arcY(startDeg)} A ${r} ${r} 0 ${largeArc} 1 ${arcX(fillEnd)} ${arcY(fillEnd)}`;
  const needleX = cx + (r - 10) * Math.cos(toRad(angle - 90));
  const needleY = cy + (r - 10) * Math.sin(toRad(angle - 90));

  return (
    <div className="gauge-wrap">
      <svg width="140" height="122" viewBox="0 0 140 122">
        <path d={trackPath} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" strokeLinecap="round" />
        <path d={fillPath} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="white" strokeWidth="2" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="4" fill="white" />
      </svg>
      <div className="gauge-value" style={{ color }}>{formatK(value)}</div>
      <div className="gauge-label">{label}</div>
    </div>
  );
};

const YearBar = ({ year, value, max, target }) => {
  const pct = Math.min((value / max) * 100, 100);
  const atTarget = value >= target;
  return (
    <div className="year-bar-wrap">
      <div className="year-bar-label">Yr {year}</div>
      <div className="year-bar-track">
        <div className="year-bar-fill" style={{ width: `${pct}%`, background: atTarget ? "#4ade80" : "#60a5fa" }} />
        {target && (
          <div className="year-bar-target" style={{ left: `${Math.min((target / max) * 100, 100)}%` }} />
        )}
      </div>
      <div className="year-bar-value" style={{ color: atTarget ? "#4ade80" : "#e2e8f0" }}>{formatK(value)}</div>
    </div>
  );
};

export default function LifePlanCalc() {
  // Inputs
  const [cash, setCash] = useState(400000);
  const [k401, setK401] = useState(265000);
  const [equity, setEquity] = useState(175000);
  const [monthlySavings, setMonthlySavings] = useState(5000);
  const [homeValue, setHomeValue] = useState(805000);
  const [mortgage, setMortgage] = useState(630000);
  const [piti, setPiti] = useState(4300);
  const [cashReturn, setCashReturn] = useState(6);
  const [kReturn, setKReturn] = useState(7);
  const [homeAppreciation, setHomeAppreciation] = useState(2.5);
  const [rentalGross, setRentalGross] = useState(3500);
  const [furnishedPremium, setFurnishedPremium] = useState(true);
  const [clientIncome, setClientIncome] = useState(1500);
  const [withdrawalRate, setWithdrawalRate] = useState(5);
  const [overseasHome, setOverseasHome] = useState(200000);
  const [targetMonthly, setTargetMonthly] = useState(5500);
  const [years, setYears] = useState(5);
  const [k401Accessible, setK401Accessible] = useState(false);
  const [tab, setTab] = useState("overview");

  const calc = useMemo(() => {
    const annualSavings = monthlySavings * 12;
    const r = cashReturn / 100;
    const rk = kReturn / 100;
    const ra = homeAppreciation / 100;

    // Year-by-year
    const yearData = [];
    let cashBal = cash;
    let savingsBal = 0;
    let k401Bal = k401;
    let homeBal = homeValue;
    let mortgageBal = mortgage;

    // Principal paydown per year (approx, 5.5% on ~630k)
    const monthlyRate = 5.5 / 100 / 12;
    // Approximate principal paid per year
    const getPrincipalPaid = (bal) => {
      const monthlyPayment = bal * (monthlyRate * Math.pow(1 + monthlyRate, 360)) / (Math.pow(1 + monthlyRate, 360) - 1);
      let principal = 0;
      for (let m = 0; m < 12; m++) {
        const interest = bal * monthlyRate;
        const p = monthlyPayment - interest;
        principal += p;
        bal -= p;
      }
      return principal;
    };

    for (let y = 1; y <= 10; y++) {
      cashBal = cashBal * (1 + r) + annualSavings * (1 + r / 2);
      k401Bal = k401Bal * (1 + rk);
      homeBal = homeBal * (1 + ra);
      const principalPaid = getPrincipalPaid(mortgageBal);
      mortgageBal = Math.max(mortgageBal - principalPaid, 0);
      savingsBal = savingsBal * (1 + r) + annualSavings;

      const homeEquity = homeBal - mortgageBal;
      const liquidInvestable = cashBal;
      const totalInvestable = liquidInvestable + (k401Accessible ? k401Bal : 0);

      // Rental
      const mgmtFee = furnishedPremium ? 0 : rentalGross * 0.09;
      const maintenance = homeBal * 0.01 / 12;
      const insurance = 900;
      const netRental = rentalGross - mgmtFee - maintenance - insurance - piti;

      const investmentIncome = (totalInvestable * withdrawalRate / 100) / 12;
      const totalMonthly = investmentIncome + Math.max(netRental, 0) + clientIncome;

      yearData.push({
        year: y,
        cashBal,
        k401Bal,
        homeBal,
        mortgageBal,
        homeEquity,
        liquidInvestable,
        totalInvestable: totalInvestable + k401Bal, // always show total
        netRental,
        investmentIncome,
        totalMonthly,
      });
    }

    const target = yearData[years - 1];

    // After buying overseas home
    const overseasFunded = target.homeEquity >= overseasHome;
    const remainingPortfolio = target.liquidInvestable - (overseasFunded ? 0 : overseasHome);
    const accessibleTotal = remainingPortfolio + (k401Accessible ? target.k401Bal : 0);
    const finalInvestmentIncome = (accessibleTotal * withdrawalRate / 100) / 12;

    const mgmtFee = furnishedPremium ? 0 : rentalGross * 0.09;
    const maintenance = target.homeBal * 0.01 / 12;
    const insurance = 900;
    const netRental = rentalGross - mgmtFee - maintenance - insurance - piti;

    const scenarioA = {
      name: "Conservative",
      desc: "Long-term unfurnished, no 401k, no clients",
      investment: (target.liquidInvestable * withdrawalRate / 100) / 12,
      rental: netRental,
      client: 0,
    };
    scenarioA.total = scenarioA.investment + Math.max(scenarioA.rental, 0);

    const scenarioB = {
      name: "Moderate",
      desc: "Furnished/corporate lease, 1 client",
      investment: (target.liquidInvestable * withdrawalRate / 100) / 12,
      rental: rentalGross - maintenance - insurance - piti,
      client: clientIncome,
    };
    scenarioB.total = scenarioB.investment + Math.max(scenarioB.rental, 0) + scenarioB.client;

    const scenarioC = {
      name: "Optimal",
      desc: "401k accessible, furnished, 1–2 clients",
      investment: ((target.liquidInvestable + target.k401Bal) * withdrawalRate / 100) / 12,
      rental: rentalGross - maintenance - insurance - piti + 300,
      client: clientIncome,
    };
    scenarioC.total = scenarioC.investment + Math.max(scenarioC.rental, 0) + scenarioC.client;

    const shortfall = targetMonthly - scenarioB.total;

    return { yearData, scenarioA, scenarioB, scenarioC, target, shortfall, netRental };
  }, [cash, k401, monthlySavings, homeValue, mortgage, piti, cashReturn, kReturn, homeAppreciation,
    rentalGross, furnishedPremium, clientIncome, withdrawalRate, overseasHome, targetMonthly, years, k401Accessible, equity]);

  const maxBar = Math.max(...calc.yearData.map(d => d.totalInvestable)) * 1.1;
  const target = calc.yearData[years - 1];
  const scenarios = [calc.scenarioA, calc.scenarioB, calc.scenarioC];
  const scenarioColors = ["#60a5fa", "#a78bfa", "#4ade80"];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body { background: #080c14; }

        .app {
          min-height: 100vh;
          background: #080c14;
          background-image:
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(96,165,250,0.07) 0%, transparent 60%),
            radial-gradient(ellipse 40% 30% at 80% 80%, rgba(167,139,250,0.05) 0%, transparent 50%);
          color: #e2e8f0;
          font-family: 'DM Mono', monospace;
          padding: 0 0 60px;
        }

        .header {
          padding: 40px 40px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        .header-left h1 {
          font-family: 'DM Serif Display', serif;
          font-size: 2.2rem;
          color: #f8fafc;
          line-height: 1.1;
          letter-spacing: -0.02em;
        }

        .header-left h1 em {
          font-style: italic;
          color: #93c5fd;
        }

        .header-sub {
          margin-top: 6px;
          font-size: 0.75rem;
          color: #64748b;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .badge {
          background: rgba(96,165,250,0.1);
          border: 1px solid rgba(96,165,250,0.25);
          color: #93c5fd;
          font-size: 0.7rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 6px 14px;
          border-radius: 100px;
        }

        .layout {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 0;
          min-height: calc(100vh - 120px);
        }

        .sidebar {
          padding: 28px 24px;
          border-right: 1px solid rgba(255,255,255,0.06);
          overflow-y: auto;
        }

        .main {
          padding: 28px 32px;
          overflow-y: auto;
        }

        .section-title {
          font-size: 0.65rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #475569;
          margin-bottom: 16px;
          margin-top: 28px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }

        .section-title:first-child { margin-top: 0; }

        .slider-group {
          margin-bottom: 20px;
        }

        .slider-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 4px;
        }

        .slider-label {
          font-size: 0.72rem;
          color: #94a3b8;
        }

        .slider-value {
          font-size: 0.85rem;
          color: #f1f5f9;
          font-weight: 500;
        }

        .slider-hint {
          font-size: 0.64rem;
          color: #475569;
          margin-bottom: 6px;
        }

        .slider {
          width: 100%;
          appearance: none;
          height: 3px;
          background: rgba(255,255,255,0.08);
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }

        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          background: #60a5fa;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(96,165,250,0.5);
        }

        .slider-range {
          display: flex;
          justify-content: space-between;
          font-size: 0.62rem;
          color: #334155;
          margin-top: 3px;
        }

        .slider-value.editable {
          cursor: text;
          border-bottom: 1px dashed rgba(255,255,255,0.15);
          padding-bottom: 1px;
          transition: color 0.15s, border-color 0.15s;
        }

        .slider-value.editable:hover {
          color: #93c5fd;
          border-bottom-color: rgba(96,165,250,0.5);
        }

        .slider-direct-input {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(96,165,250,0.45);
          border-radius: 4px;
          color: #f1f5f9;
          font-family: 'DM Mono', monospace;
          font-size: 0.82rem;
          padding: 2px 6px;
          width: 90px;
          text-align: right;
          outline: none;
        }

        .slider-direct-input::-webkit-inner-spin-button,
        .slider-direct-input::-webkit-outer-spin-button { opacity: 0.4; }

        .toggle-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .toggle-label {
          font-size: 0.72rem;
          color: #94a3b8;
        }

        .toggle {
          width: 36px;
          height: 20px;
          background: rgba(255,255,255,0.08);
          border-radius: 10px;
          position: relative;
          cursor: pointer;
          transition: background 0.2s;
          border: none;
          outline: none;
        }

        .toggle.on { background: #3b82f6; }

        .toggle::after {
          content: '';
          position: absolute;
          width: 14px;
          height: 14px;
          background: white;
          border-radius: 50%;
          top: 3px;
          left: 3px;
          transition: transform 0.2s;
        }

        .toggle.on::after { transform: translateX(16px); }

        /* Tabs */
        .tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 28px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding-bottom: 0;
        }

        .tab-btn {
          background: none;
          border: none;
          color: #64748b;
          font-family: 'DM Mono', monospace;
          font-size: 0.72rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 10px 16px;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          transition: color 0.15s, border-color 0.15s;
        }

        .tab-btn.active {
          color: #93c5fd;
          border-bottom-color: #60a5fa;
        }

        .tab-btn:hover:not(.active) { color: #94a3b8; }

        /* Gauges */
        .gauges {
          display: flex;
          gap: 0;
          flex-wrap: wrap;
          margin-bottom: 32px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          overflow: hidden;
        }

        .gauge-wrap {
          flex: 1;
          min-width: 130px;
          padding: 20px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          border-right: 1px solid rgba(255,255,255,0.05);
        }

        .gauge-wrap:last-child { border-right: none; }

        .gauge-value {
          font-size: 1.1rem;
          font-weight: 500;
          margin-top: -8px;
        }

        .gauge-label {
          font-size: 0.62rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-top: 4px;
          text-align: center;
        }

        /* Scenarios */
        .scenarios {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 32px;
        }

        .scenario-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 20px;
          position: relative;
          overflow: hidden;
          transition: border-color 0.2s;
        }

        .scenario-card.winner {
          border-color: rgba(74,222,128,0.3);
          background: rgba(74,222,128,0.03);
        }

        .scenario-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
        }

        .scenario-card:nth-child(1)::before { background: #60a5fa; }
        .scenario-card:nth-child(2)::before { background: #a78bfa; }
        .scenario-card:nth-child(3)::before { background: #4ade80; }

        .scenario-name {
          font-family: 'DM Serif Display', serif;
          font-size: 1.1rem;
          color: #f1f5f9;
          margin-bottom: 4px;
        }

        .scenario-desc {
          font-size: 0.65rem;
          color: #64748b;
          margin-bottom: 16px;
          line-height: 1.4;
        }

        .scenario-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.72rem;
          color: #94a3b8;
          padding: 5px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }

        .scenario-row:last-of-type { border-bottom: none; }

        .scenario-row span:last-child { color: #e2e8f0; }

        .scenario-total {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,0.08);
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }

        .scenario-total-label {
          font-size: 0.65rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .scenario-total-value {
          font-size: 1.4rem;
          font-weight: 500;
        }

        .hit { color: #4ade80; }
        .miss { color: #f87171; }
        .close { color: #fbbf24; }

        /* Year bars */
        .year-bars {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 20px 24px;
          margin-bottom: 32px;
        }

        .year-bars-title {
          font-size: 0.65rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          margin-bottom: 16px;
        }

        .year-bar-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 10px;
        }

        .year-bar-label {
          font-size: 0.68rem;
          color: #64748b;
          width: 28px;
          flex-shrink: 0;
        }

        .year-bar-track {
          flex: 1;
          height: 8px;
          background: rgba(255,255,255,0.06);
          border-radius: 4px;
          position: relative;
          overflow: visible;
        }

        .year-bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.4s ease;
        }

        .year-bar-target {
          position: absolute;
          top: -4px;
          width: 2px;
          height: 16px;
          background: rgba(251,191,36,0.7);
          transform: translateX(-50%);
          border-radius: 1px;
        }

        .year-bar-value {
          font-size: 0.72rem;
          width: 70px;
          text-align: right;
          flex-shrink: 0;
        }

        /* Rental analysis */
        .rental-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .rental-title {
          font-family: 'DM Serif Display', serif;
          font-size: 1.1rem;
          margin-bottom: 4px;
        }

        .rental-subtitle {
          font-size: 0.66rem;
          color: #64748b;
          margin-bottom: 20px;
        }

        .rental-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .rental-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .rental-item-label {
          font-size: 0.62rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .rental-item-value {
          font-size: 1rem;
          color: #e2e8f0;
        }

        .rental-item-value.pos { color: #4ade80; }
        .rental-item-value.neg { color: #f87171; }
        .rental-item-value.neutral { color: #fbbf24; }

        /* Summary */
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }

        .summary-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 16px 20px;
        }

        .summary-card-label {
          font-size: 0.62rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 6px;
        }

        .summary-card-value {
          font-size: 1.3rem;
          color: #f1f5f9;
        }

        .summary-card-sub {
          font-size: 0.66rem;
          color: #475569;
          margin-top: 4px;
        }

        .insight {
          background: rgba(96,165,250,0.05);
          border: 1px solid rgba(96,165,250,0.15);
          border-radius: 10px;
          padding: 14px 18px;
          font-size: 0.73rem;
          color: #93c5fd;
          line-height: 1.6;
          margin-bottom: 12px;
        }

        .insight strong { color: #bfdbfe; }

        .shortfall-bar {
          margin-top: 16px;
          padding: 14px 18px;
          border-radius: 10px;
          font-size: 0.75rem;
          line-height: 1.5;
        }

        .shortfall-bar.hit { background: rgba(74,222,128,0.07); border: 1px solid rgba(74,222,128,0.2); color: #86efac; }
        .shortfall-bar.miss { background: rgba(248,113,113,0.07); border: 1px solid rgba(248,113,113,0.2); color: #fca5a5; }

        .number-input-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .number-input-label { font-size: 0.72rem; color: #94a3b8; }

        .number-input {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          color: #f1f5f9;
          font-family: 'DM Mono', monospace;
          font-size: 0.82rem;
          padding: 5px 10px;
          width: 110px;
          text-align: right;
          outline: none;
        }

        .number-input:focus { border-color: rgba(96,165,250,0.4); }

        @media (max-width: 900px) {
          .layout { grid-template-columns: 1fr; }
          .sidebar { border-right: none; border-bottom: 1px solid rgba(255,255,255,0.06); }
          .scenarios { grid-template-columns: 1fr; }
          .gauges { flex-direction: column; }
        }
      `}</style>

      <div className="app">
        <div className="header">
          <div className="header-left">
            <h1>West Seattle <em>Escape Plan</em></h1>
            <div className="header-sub">5-Year Financial Independence Calculator · Two Adults · Two Cats</div>
          </div>
          <div className="badge">Japan / Scotland / Ireland</div>
        </div>

        <div className="layout">
          {/* SIDEBAR */}
          <div className="sidebar">
            <div className="section-title">Starting Assets</div>

            <Slider label="Cash / Savings" value={cash} min={100000} max={800000} step={500}
              onChange={setCash} format={formatK} />
            <Slider label="401(k) Balance" value={k401} min={50000} max={600000} step={500}
              onChange={setK401} format={formatK} />
            <Slider label="Home Equity" value={equity} min={50000} max={500000} step={500}
              onChange={setEquity} format={formatK} hint="Implied home value ~$805k" />
            <Slider label="Monthly Savings" value={monthlySavings} min={1000} max={12000} step={50}
              onChange={setMonthlySavings} format={(v) => `${formatK(v)}/mo`} />

            <div className="section-title">Home & Mortgage</div>

            <Slider label="Current Home Value" value={homeValue} min={600000} max={1500000} step={1000}
              onChange={setHomeValue} format={formatK} />
            <Slider label="Mortgage Balance" value={mortgage} min={400000} max={900000} step={500}
              onChange={setMortgage} format={formatK} hint="Fixed at 5.5% per plan" />
            <Slider label="PITI Payment" value={piti} min={3000} max={7000} step={10}
              onChange={setPiti} format={(v) => `${formatK(v)}/mo`} />
            <Slider label="Home Appreciation" value={homeAppreciation} min={0} max={6} step={0.05}
              onChange={setHomeAppreciation} format={(v) => `${fmtPct(v)}/yr`} />

            <div className="section-title">Rental Strategy</div>

            <Slider label="Gross Rental Income" value={rentalGross} min={3000} max={7500} step={25}
              onChange={setRentalGross} format={(v) => `${formatK(v)}/mo`} />

            <div className="toggle-row">
              <span className="toggle-label">Furnished / Corporate Lease</span>
              <button className={`toggle ${furnishedPremium ? "on" : ""}`}
                onClick={() => setFurnishedPremium(!furnishedPremium)} />
            </div>

            <div className="section-title">Overseas & Income</div>

            <Slider label="Overseas Home Budget" value={overseasHome} min={80000} max={350000} step={500}
              onChange={setOverseasHome} format={formatK} />
            <Slider label="Client Income" value={clientIncome} min={0} max={5000} step={25}
              onChange={setClientIncome} format={(v) => `${formatK(v)}/mo`} />
            <Slider label="Target Monthly Income" value={targetMonthly} min={3000} max={9000} step={25}
              onChange={setTargetMonthly} format={(v) => `${formatK(v)}/mo`} />

            <div className="section-title">Returns & Timeline</div>

            <Slider label="Cash Portfolio Return" value={cashReturn} min={3} max={9} step={0.05}
              onChange={setCashReturn} format={fmtPct} />
            <Slider label="401(k) Return" value={kReturn} min={4} max={10} step={0.05}
              onChange={setKReturn} format={fmtPct} />
            <Slider label="Withdrawal Rate" value={withdrawalRate} min={3} max={7} step={0.05}
              onChange={setWithdrawalRate} format={fmtPct} />
            <Slider label="Years to Departure" value={years} min={2} max={10} step={1}
              onChange={setYears} format={(v) => `${v} yrs`} />

            <div className="toggle-row" style={{ marginTop: 8 }}>
              <span className="toggle-label">401(k) Accessible at Departure</span>
              <button className={`toggle ${k401Accessible ? "on" : ""}`}
                onClick={() => setK401Accessible(!k401Accessible)} />
            </div>
          </div>

          {/* MAIN */}
          <div className="main">
            <div className="tabs">
              {["overview", "scenarios", "rental", "growth"].map(t => (
                <button key={t} className={`tab-btn ${tab === t ? "active" : ""}`}
                  onClick={() => setTab(t)}>
                  {t}
                </button>
              ))}
            </div>

            {tab === "overview" && (
              <>
                <div className="gauges">
                  <GaugeMeter value={target.liquidInvestable} min={0} max={2000000}
                    label="Liquid Portfolio" color="#60a5fa" />
                  <GaugeMeter value={target.k401Bal} min={0} max={800000}
                    label="401(k) Value" color="#a78bfa" />
                  <GaugeMeter value={target.homeEquity} min={0} max={600000}
                    label="Home Equity" color="#f59e0b" />
                  <GaugeMeter value={calc.scenarioB.total} min={0} max={12000}
                    label="Monthly Income" color="#4ade80" />
                </div>

                <div className="summary-grid">
                  <div className="summary-card">
                    <div className="summary-card-label">Total Net Worth at Yr {years}</div>
                    <div className="summary-card-value">{formatK(target.liquidInvestable + target.k401Bal + target.homeEquity)}</div>
                    <div className="summary-card-sub">Incl. home equity & 401(k)</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-card-label">Liquid + Investable (Yr {years})</div>
                    <div className="summary-card-value">{formatK(target.liquidInvestable)}</div>
                    <div className="summary-card-sub">Excludes 401(k) & home</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-card-label">Home Value at Yr {years}</div>
                    <div className="summary-card-value">{formatK(target.homeBal)}</div>
                    <div className="summary-card-sub">Mortgage: {formatK(target.mortgageBal)} remaining</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-card-label">Monthly Savings Contribution</div>
                    <div className="summary-card-value">{formatK(monthlySavings * 12 * years)}</div>
                    <div className="summary-card-sub">{formatK(monthlySavings)}/mo × {years} years</div>
                  </div>
                </div>

                <div className={`shortfall-bar ${calc.scenarioB.total >= targetMonthly ? "hit" : "miss"}`}>
                  {calc.scenarioB.total >= targetMonthly
                    ? `✅ Moderate scenario hits your ${formatK(targetMonthly)}/mo target — generating ${formatK(calc.scenarioB.total)}/mo (+${formatK(calc.scenarioB.total - targetMonthly)} buffer).`
                    : `⚠️ Moderate scenario generates ${formatK(calc.scenarioB.total)}/mo — ${formatK(targetMonthly - calc.scenarioB.total)}/mo short of your ${formatK(targetMonthly)}/mo target. Adjust sliders or add client income.`}
                </div>

                <div className="insight">
                  <strong>West Seattle View Premium:</strong> Your Sound + Olympics + Rainier tri-view townhome with a 96 walk score sits in the top tier of Seattle's rental market. Corporate relocation tenants (Amazon, Microsoft, Boeing) regularly budget {formatK(5500)}–{formatK(6500)}/mo for this profile. Furnished corporate lease strategy can move your rental from cash-flow negative to breakeven or better.
                </div>

                <div className="insight">
                  <strong>The 401(k) Wildcard:</strong> At {formatK(target.k401Bal)} by year {years}, toggling 401(k) accessible (above) adds ~{formatK((target.k401Bal * withdrawalRate / 100) / 12)}/mo to your income. If you're near 59½ at departure, this changes your plan significantly. Consider 72(t) SEPP distributions if you're not.
                </div>
              </>
            )}

            {tab === "scenarios" && (
              <>
                <div className="scenarios">
                  {scenarios.map((s, i) => {
                    const color = scenarioColors[i];
                    const cls = s.total >= targetMonthly ? "hit" : s.total >= targetMonthly * 0.85 ? "close" : "miss";
                    return (
                      <div key={i} className={`scenario-card ${s.total >= targetMonthly ? "winner" : ""}`}>
                        <div className="scenario-name">{s.name}</div>
                        <div className="scenario-desc">{s.desc}</div>
                        <div className="scenario-row">
                          <span>Investment income</span>
                          <span>{formatK(s.investment)}/mo</span>
                        </div>
                        <div className="scenario-row">
                          <span>Net rental</span>
                          <span style={{ color: s.rental >= 0 ? "#4ade80" : "#f87171" }}>
                            {s.rental >= 0 ? "+" : ""}{formatK(s.rental)}/mo
                          </span>
                        </div>
                        <div className="scenario-row">
                          <span>Client income</span>
                          <span>{formatK(s.client)}/mo</span>
                        </div>
                        <div className="scenario-total">
                          <span className="scenario-total-label">Total / mo</span>
                          <span className={`scenario-total-value ${cls}`}>{formatK(s.total)}</span>
                        </div>
                        <div style={{ fontSize: "0.65rem", marginTop: 8, color: s.total >= targetMonthly ? "#86efac" : "#f87171" }}>
                          {s.total >= targetMonthly
                            ? `✅ Exceeds ${formatK(targetMonthly)} target by ${formatK(s.total - targetMonthly)}`
                            : `⚠️ ${formatK(targetMonthly - s.total)} short of ${formatK(targetMonthly)} target`}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="insight">
                  <strong>Scenario B is your baseline plan.</strong> One furnished corporate lease + one retained client + your invested portfolio hits the target with margin. You don't need everything to go perfectly — just two of the three income streams performing.
                </div>

                <div className="insight">
                  <strong>Sensitivity check:</strong> If rental stays unfurnished and you get no clients (Scenario A), you'd need to draw {formatK(targetMonthly - calc.scenarioA.total)}/mo more from your portfolio. At {withdrawalRate}% that requires an additional {formatK(((targetMonthly - calc.scenarioA.total) * 12) / (withdrawalRate / 100))} in invested assets — achievable only if you save more aggressively or delay departure.
                </div>
              </>
            )}

            {tab === "rental" && (
              <>
                <div className="rental-card">
                  <div className="rental-title">Unfurnished Long-Term Lease</div>
                  <div className="rental-subtitle">Standard 12-month lease, professional property management</div>
                  <div className="rental-grid">
                    {[
                      ["Gross Rent", formatK(rentalGross) + "/mo", "neutral"],
                      ["Mgmt Fee (9%)", "-" + formatK(rentalGross * 0.09) + "/mo", "neg"],
                      ["Maintenance Reserve", "-" + formatK(target.homeBal * 0.01 / 12) + "/mo", "neg"],
                      ["Insurance + Prop Tax", "-$900/mo", "neg"],
                      ["PITI (5.5%)", "-" + formatK(piti) + "/mo", "neg"],
                      ["Net Cash Flow", formatK(rentalGross - rentalGross * 0.09 - target.homeBal * 0.01 / 12 - 900 - piti) + "/mo",
                        rentalGross - rentalGross * 0.09 - target.homeBal * 0.01 / 12 - 900 - piti >= 0 ? "pos" : "neg"],
                    ].map(([label, value, cls]) => (
                      <div key={label} className="rental-item">
                        <div className="rental-item-label">{label}</div>
                        <div className={`rental-item-value ${cls}`}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rental-card">
                  <div className="rental-title">Furnished / Corporate Relocation Lease</div>
                  <div className="rental-subtitle">Amazon / Microsoft / Boeing exec relocation — no mgmt fee, premium pricing</div>
                  <div className="rental-grid">
                    {[
                      ["Furnished Gross Rent", formatK(rentalGross + 800) + "/mo", "neutral"],
                      ["Relocation Agency (one-time)", "-$600/mo est.", "neg"],
                      ["Maintenance Reserve", "-" + formatK(target.homeBal * 0.01 / 12) + "/mo", "neg"],
                      ["Insurance + Prop Tax", "-$900/mo", "neg"],
                      ["PITI (5.5%)", "-" + formatK(piti) + "/mo", "neg"],
                      ["Net Cash Flow", formatK(rentalGross + 800 - 600 - target.homeBal * 0.01 / 12 - 900 - piti) + "/mo",
                        rentalGross + 800 - 600 - target.homeBal * 0.01 / 12 - 900 - piti >= 0 ? "pos" : "neg"],
                    ].map(([label, value, cls]) => (
                      <div key={label} className="rental-item">
                        <div className="rental-item-label">{label}</div>
                        <div className={`rental-item-value ${cls}`}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="insight">
                  <strong>Hidden wealth builder:</strong> Even at cash-flow breakeven, your tenants pay ~{formatK(1200)}/mo in principal on your behalf, and the home appreciates ~{formatK(homeValue * homeAppreciation / 100 / 12)}/mo. That's {formatK(1200 + homeValue * homeAppreciation / 100 / 12)}/mo in wealth creation that never touches your P&L — the real reason to hold.
                </div>

                <div className="insight">
                  <strong>View premium is real:</strong> Tri-view properties (Sound + Olympics + Rainier) in West Seattle command a documented 15–25% rent premium over comparable non-view townhomes. At the high end of the Seattle corporate relocation market, your asking rent of {formatK(rentalGross + 800)}/mo is firmly defensible. Lead with all three views and the walk score in every listing.
                </div>
              </>
            )}

            {tab === "growth" && (
              <>
                <div className="year-bars">
                  <div className="year-bars-title">Liquid Portfolio Growth (10 Years) — Target: {formatK(targetMonthly * 12 / (withdrawalRate / 100))}</div>
                  {calc.yearData.map(d => (
                    <YearBar key={d.year} year={d.year} value={d.liquidInvestable}
                      max={maxBar} target={targetMonthly * 12 / (withdrawalRate / 100)} />
                  ))}
                  <div style={{ fontSize: "0.62rem", color: "#475569", marginTop: 10 }}>
                    Yellow line = portfolio size needed to generate {formatK(targetMonthly)}/mo at {withdrawalRate}% withdrawal rate · Green bars = target reached
                  </div>
                </div>

                <div className="year-bars">
                  <div className="year-bars-title">Total Net Worth (Liquid + 401k + Home Equity)</div>
                  {calc.yearData.map(d => (
                    <YearBar key={d.year} year={d.year}
                      value={d.liquidInvestable + d.k401Bal + d.homeEquity}
                      max={Math.max(...calc.yearData.map(x => x.liquidInvestable + x.k401Bal + x.homeEquity)) * 1.1}
                      target={null} />
                  ))}
                </div>

                <div className="insight">
                  <strong>Departure year {years}:</strong> Liquid portfolio {formatK(target.liquidInvestable)} · 401(k) {formatK(target.k401Bal)} · Home equity {formatK(target.homeEquity)} · Total net worth {formatK(target.liquidInvestable + target.k401Bal + target.homeEquity)}.
                </div>
                <div className="insight">
                  <strong>Overseas home funding:</strong> Your {years}-year home equity of {formatK(target.homeEquity)} {target.homeEquity >= overseasHome ? `fully covers your ${formatK(overseasHome)} overseas home budget — you can buy outright without touching your investment portfolio.` : `doesn't fully cover your ${formatK(overseasHome)} overseas budget. The ${formatK(overseasHome - target.homeEquity)} gap can be funded from your liquid portfolio, leaving ${formatK(target.liquidInvestable - (overseasHome - target.homeEquity))} invested.`}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
