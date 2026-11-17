// js/decks/coo.js — COO & markets deck for 103 (BofA COO Superday). Written by Louis's coach; replace the whole file.
// Facts checked on 2026-11-17 (T+1 dates, FRTB status, BofA leadership). Re-check leadership and rates before the interview.

AT.registerDeck({
 "id": "coo",
 "title": "COO & markets",
 "section": "Finance",
 "idPrefix": "C",
 "version": "2026-11-17-v1",
 "chapters": {
  "1": "Trade lifecycle & operations",
  "2": "Market infrastructure",
  "3": "Regulation",
  "4": "Bank balance sheet & risk cases",
  "5": "Markets intuition",
  "6": "Excel",
  "7": "Bank of America & the COO role"
 },
 "scopes": null,
 "reference": [
  {
   "title": "Long call",
   "plot": {
    "fns": [
     {
      "f": "(x-100+abs(x-100))/2"
     }
    ],
    "x": [
     60,
     140
    ],
    "y": [
     -15,
     25
    ],
    "xticks": [
     [
      100,
      "K"
     ]
    ],
    "yticks": [
     [
      0,
      "0"
     ]
    ],
    "caption": "max(S − K, 0)"
   }
  },
  {
   "title": "Long put",
   "plot": {
    "fns": [
     {
      "f": "(100-x+abs(100-x))/2"
     }
    ],
    "x": [
     60,
     140
    ],
    "y": [
     -15,
     25
    ],
    "xticks": [
     [
      100,
      "K"
     ]
    ],
    "yticks": [
     [
      0,
      "0"
     ]
    ],
    "caption": "max(K − S, 0)"
   }
  },
  {
   "title": "Short call",
   "plot": {
    "fns": [
     {
      "f": "-((x-100+abs(x-100))/2)"
     }
    ],
    "x": [
     60,
     140
    ],
    "y": [
     -25,
     15
    ],
    "xticks": [
     [
      100,
      "K"
     ]
    ],
    "yticks": [
     [
      0,
      "0"
     ]
    ],
    "caption": "−max(S − K, 0): unlimited loss"
   }
  },
  {
   "title": "Long straddle",
   "plot": {
    "fns": [
     {
      "f": "abs(x-100)"
     }
    ],
    "x": [
     60,
     140
    ],
    "y": [
     -15,
     25
    ],
    "xticks": [
     [
      100,
      "K"
     ]
    ],
    "yticks": [
     [
      0,
      "0"
     ]
    ],
    "caption": "|S − K|: bet on a big move"
   }
  }
 ],
 "cards": [
  {
   "id": "C1-lifecycle-order",
   "chapter": 1,
   "game": "tool",
   "topic": "trade lifecycle",
   "prompt": "Correct order of the trade lifecycle?",
   "answer": "Execution → capture/booking → confirmation → clearing → settlement → reconciliation",
   "distractors": [
    "Execution → settlement → confirmation → clearing → booking → reconciliation",
    "Booking → execution → clearing → confirmation → reconciliation → settlement",
    "Execution → clearing → booking → settlement → confirmation → reconciliation"
   ],
   "explain": "Pre-trade checks (client onboarding/KYC, limits) come before execution. Confirm what was agreed, then clear (net, guarantee), then settle (exchange cash and securities), then reconcile your records against external ones.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C1-front-office",
   "chapter": 1,
   "game": "statements",
   "topic": "front/middle/back",
   "prompt": "Which team is FRONT office?",
   "answer": "Sales and trading (revenue-generating, client-facing)",
   "distractors": [
    "Product control",
    "Settlements",
    "Reconciliations"
   ],
   "explain": "Front office: sales, trading, structuring. Middle: risk, product control, trade support. Back: confirmations, settlement, reconciliation, custody, payments.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C1-product-control",
   "chapter": 1,
   "game": "statements",
   "topic": "front/middle/back",
   "prompt": "What does Product Control do?",
   "answer": "Produces and explains daily P&L and independently verifies prices (IPV)",
   "distractors": [
    "Executes client orders",
    "Sends settlement instructions to the custodian",
    "Approves new client accounts (KYC)"
   ],
   "explain": "A middle-office control: traders' P&L is checked and explained (P&L explain: delta, carry, new trades…) and marks are verified against independent sources.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C1-back-office",
   "chapter": 1,
   "game": "statements",
   "topic": "front/middle/back",
   "prompt": "Which task is BACK office?",
   "answer": "Matching confirmations and settling trades",
   "distractors": [
    "Pricing a structured product for a client",
    "Setting the desk's VaR limit",
    "Quoting a two-way price"
   ],
   "explain": "Back office makes sure what was traded is confirmed, settled, recorded and reconciled. Errors here cost money (fails, penalties) and reputation.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C1-break-def",
   "chapter": 1,
   "game": "statements",
   "topic": "reconciliation",
   "prompt": "A reconciliation 'break' is",
   "answer": "A difference between two records that should agree (e.g. internal books vs custodian statement)",
   "distractors": [
    "A trade cancelled by the client",
    "A pause in trading after a market drop",
    "A failed login to the trading system"
   ],
   "explain": "Breaks are investigated, root-caused and resolved; ageing breaks are escalated. Types: trade, position, cash (nostro) breaks.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C1-nostro",
   "chapter": 1,
   "game": "statements",
   "topic": "reconciliation",
   "prompt": "A nostro account is",
   "answer": "Our bank's account held at another bank, usually in a foreign currency",
   "distractors": [
    "Another bank's account held at our bank",
    "A client's custody account",
    "The central bank reserve account"
   ],
   "explain": "Nostro = 'ours with you'; vostro = 'yours with us'. Nostro reconciliation compares expected cash movements with the correspondent's statement.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C1-stp-why",
   "chapter": 1,
   "game": "statements",
   "topic": "efficiency",
   "prompt": "Why does a COO care about the STP rate?",
   "answer": "Fewer manual touches → lower cost per trade, fewer errors, faster settlement, more scalable",
   "distractors": [
    "A higher STP rate increases trading revenue directly",
    "Regulators set a minimum STP rate",
    "STP only matters for retail clients"
   ],
   "explain": "Straight-through processing = trades flow end to end without manual intervention. It is a core efficiency KPI, together with cost per trade and break ageing.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C1-static-data",
   "chapter": 1,
   "game": "statements",
   "topic": "data",
   "prompt": "A wrong settlement instruction (SSI) for a counterparty in static data most likely causes",
   "answer": "Settlement fails on every trade with that counterparty",
   "distractors": [
    "A wrong trade price",
    "A VaR limit breach",
    "A wrong P&L sign on the desk"
   ],
   "explain": "Static/reference data (SSIs, identifiers, holiday calendars) is reused by every trade: one wrong record repeats the error. That is why data quality is an operations priority.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C1-four-eyes",
   "chapter": 1,
   "game": "statements",
   "topic": "controls",
   "prompt": "The four-eyes principle means",
   "answer": "A second person reviews and approves an action before it takes effect",
   "distractors": [
    "Two traders must agree on every price",
    "Every trade is reported to two regulators",
    "Each desk has two risk managers"
   ],
   "explain": "Typical for payments, static data changes, manual adjustments. Closely linked to segregation of duties.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C1-segregation",
   "chapter": 1,
   "game": "statements",
   "topic": "controls",
   "prompt": "Segregation of duties exists mainly to prevent",
   "answer": "One person both executing trades and controlling/booking/settling them (e.g. hiding losses)",
   "distractors": [
    "Traders from talking to sales",
    "Clients from seeing their positions",
    "Two desks from trading the same product"
   ],
   "explain": "Barings (Leeson, 1995) and Société Générale (Kerviel, 2008): rogue trading hidden because front and back office controls were weak or circumvented.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C1-confirm-before-settle",
   "chapter": 1,
   "game": "truefalse",
   "topic": "trade lifecycle",
   "prompt": "A trade should be confirmed/affirmed with the counterparty before it settles.",
   "answer": true,
   "explain": "Confirmation catches disagreements on the economic terms while they are cheap to fix. Under T+1 the time for this shrinks to the trade date itself.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C1-fail-cost",
   "chapter": 1,
   "game": "statements",
   "topic": "settlement",
   "prompt": "Main consequences of a settlement fail?",
   "answer": "Funding/opportunity cost, possible buy-in or cash penalties (EU CSDR), and client/reputation impact",
   "distractors": [
    "The trade is automatically cancelled with no cost",
    "Only the regulator is affected",
    "The price of the security is reset"
   ],
   "explain": "Under the EU CSDR settlement discipline regime, failing participants pay daily cash penalties. Fails also tie up capital and liquidity.",
   "source": "CSDR"
  },
  {
   "id": "C1-root-cause",
   "chapter": 1,
   "game": "tool",
   "topic": "process",
   "prompt": "Breaks on one product have doubled this month. Best first step as a COO analyst?",
   "answer": "Categorise breaks by root cause (data, booking, timing, counterparty) and quantify each",
   "distractors": [
    "Hire more people for the reconciliation team",
    "Ask traders to trade less",
    "Escalate everything to the regulator"
   ],
   "explain": "Data first, then fix the biggest root cause (often static data or a manual step), then automate. Headcount is the last resort.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C1-kpis",
   "chapter": 1,
   "game": "statements",
   "topic": "efficiency",
   "prompt": "Which is NOT a typical operations KPI?",
   "answer": "Trading desk Sharpe ratio",
   "distractors": [
    "STP rate",
    "Number and ageing of open breaks",
    "Cost per trade"
   ],
   "explain": "Ops KPIs: STP, breaks (count, age, value), fails, cost per trade, SLA adherence, manual touches. Sharpe is a performance metric for a strategy.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C2-ccp",
   "chapter": 2,
   "game": "statements",
   "topic": "infrastructure",
   "prompt": "What does a CCP (central counterparty) do?",
   "answer": "Becomes buyer to every seller and seller to every buyer, nets positions and collects margin",
   "distractors": [
    "Holds securities in custody for investors",
    "Sets interest rates",
    "Matches orders on an exchange"
   ],
   "explain": "Novation to the CCP removes bilateral counterparty risk; default risk is managed by margin and a default fund. Examples: LCH, Eurex Clearing, CME Clearing.",
   "source": "EMIR"
  },
  {
   "id": "C2-im-vm",
   "chapter": 2,
   "game": "statements",
   "topic": "infrastructure",
   "prompt": "Initial margin vs variation margin?",
   "answer": "IM covers potential future loss if a party defaults; VM settles daily mark-to-market gains and losses",
   "distractors": [
    "IM is paid daily, VM once at inception",
    "Both cover exactly the same risk",
    "VM is only for options, IM only for futures"
   ],
   "explain": "VM moves the realised P&L every day (futures: the daily P&L you compute in the Finance drills). IM is a buffer sized on a stress/VaR-type model.",
   "source": "EMIR"
  },
  {
   "id": "C2-csd",
   "chapter": 2,
   "game": "statements",
   "topic": "infrastructure",
   "prompt": "A CSD (central securities depository) mainly",
   "answer": "Holds securities in book-entry form and settles transfers between participants",
   "distractors": [
    "Clears derivatives",
    "Provides loans to banks",
    "Publishes market prices"
   ],
   "explain": "Examples: Euroclear France, Clearstream Banking Frankfurt, DTC (US). ICSDs (Euroclear Bank, Clearstream Banking Luxembourg) settle international bonds.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C2-dvp",
   "chapter": 2,
   "game": "statements",
   "topic": "settlement",
   "prompt": "Delivery versus payment (DvP) eliminates",
   "answer": "Principal risk: delivering securities without receiving cash (or the reverse)",
   "distractors": [
    "Market risk on the position",
    "The need for confirmations",
    "Settlement fails"
   ],
   "explain": "Both legs settle simultaneously or not at all. Fails can still happen (no securities or no cash), but you never lose the principal.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C2-netting",
   "chapter": 2,
   "game": "statements",
   "topic": "infrastructure",
   "prompt": "Multilateral netting at a CCP mainly",
   "answer": "Reduces the number and size of payments and exposures",
   "distractors": [
    "Increases liquidity needs",
    "Removes market risk",
    "Replaces margin requirements"
   ],
   "explain": "Many offsetting trades become one net position per member: less settlement flow, lower exposure.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C2-t1-us",
   "chapter": 2,
   "game": "statements",
   "topic": "settlement",
   "prompt": "Standard settlement cycle for US equities today?",
   "answer": "T+1 (since May 2024)",
   "distractors": [
    "T+2",
    "T+0",
    "T+3"
   ],
   "explain": "The US moved from T+2 to T+1 on 28 May 2024. It compresses confirmation, allocation and FX funding into the trade date.",
   "source": "SEC"
  },
  {
   "id": "C2-t1-europe",
   "chapter": 2,
   "game": "statements",
   "topic": "settlement",
   "prompt": "When do the EU, UK and Switzerland move to T+1?",
   "answer": "11 October 2027",
   "distractors": [
    "Already done in 2024",
    "1 January 2026",
    "No date set"
   ],
   "explain": "EU regulation published in October 2025 for application on 11 October 2027; the UK and Switzerland chose the same date. Ops impact: same-day affirmation, earlier FX and funding, more automation.",
   "source": "ESMA; FCA"
  },
  {
   "id": "C2-t1-impact",
   "chapter": 2,
   "game": "statements",
   "topic": "settlement",
   "prompt": "Biggest operational challenge of moving to T+1?",
   "answer": "Less time to confirm, allocate, fund (incl. FX) and fix exceptions before settlement",
   "distractors": [
    "Higher trading commissions",
    "Lower market volatility",
    "More paper confirmations"
   ],
   "explain": "Manual steps that used to run overnight must happen on trade date. Answer: automate, affirm same day, pre-fund FX for cross-border investors.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C2-repo",
   "chapter": 2,
   "game": "statements",
   "topic": "infrastructure",
   "prompt": "A repo is economically",
   "answer": "A short-term loan collateralised by securities (sell now, buy back later at a fixed price)",
   "distractors": [
    "An outright sale of a bond",
    "A derivative on interest rates",
    "An unsecured interbank loan"
   ],
   "explain": "The price difference is the repo interest. A haircut protects the cash lender. The securities stay on the borrower's balance sheet.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C2-swift-iso",
   "chapter": 2,
   "game": "statements",
   "topic": "messaging",
   "prompt": "ISO 20022 is",
   "answer": "The richer, structured messaging standard replacing legacy SWIFT MT messages for payments",
   "distractors": [
    "A capital requirement",
    "A settlement cycle",
    "An accounting standard"
   ],
   "explain": "More structured data → better STP, sanctions screening and reconciliation.",
   "source": "SWIFT"
  },
  {
   "id": "C2-futures-otc",
   "chapter": 2,
   "game": "truefalse",
   "topic": "products",
   "prompt": "Futures are standardised, exchange-traded and centrally cleared; forwards are bilateral (OTC) and customised.",
   "answer": true,
   "explain": "Swaps are OTC too, but standardised swaps must now be centrally cleared (EMIR, Dodd-Frank).",
   "source": "Ops fundamentals"
  },
  {
   "id": "C3-mifid",
   "chapter": 3,
   "game": "statements",
   "topic": "regulation",
   "prompt": "MiFID II (EU, 2018) is mainly about",
   "answer": "Investor protection and market transparency: best execution, transaction reporting, pre/post-trade transparency",
   "distractors": [
    "Bank capital ratios",
    "Central clearing of OTC derivatives",
    "Settlement discipline"
   ],
   "explain": "Also: research unbundling, product governance, recording of communications.",
   "source": "EU"
  },
  {
   "id": "C3-emir",
   "chapter": 3,
   "game": "statements",
   "topic": "regulation",
   "prompt": "EMIR (EU) requires",
   "answer": "Central clearing of standardised OTC derivatives, trade reporting to trade repositories, risk mitigation for uncleared trades",
   "distractors": [
    "Best execution for retail clients",
    "A 3% leverage ratio",
    "T+1 settlement"
   ],
   "explain": "The EU answer to the 2009 G20 commitments after 2008; US equivalent: Dodd-Frank Title VII.",
   "source": "EU"
  },
  {
   "id": "C3-dodd-frank",
   "chapter": 3,
   "game": "statements",
   "topic": "regulation",
   "prompt": "Which is part of Dodd-Frank (US, 2010)?",
   "answer": "The Volcker rule restricting proprietary trading by banks",
   "distractors": [
    "MiFID best execution",
    "The CSDR penalty regime",
    "SFTR reporting"
   ],
   "explain": "Also: swap clearing and reporting, stress tests, creation of the CFPB.",
   "source": "US"
  },
  {
   "id": "C3-sftr",
   "chapter": 3,
   "game": "statements",
   "topic": "regulation",
   "prompt": "SFTR requires reporting of",
   "answer": "Securities financing transactions: repos, securities lending, margin lending",
   "distractors": [
    "Equity trades by retail clients",
    "Bank capital levels",
    "Credit card fees"
   ],
   "explain": "Reported to trade repositories, to give regulators visibility of shadow-banking leverage.",
   "source": "EU"
  },
  {
   "id": "C3-basel3",
   "chapter": 3,
   "game": "statements",
   "topic": "regulation",
   "prompt": "Basel III introduced or strengthened",
   "answer": "Higher-quality capital (CET1), a leverage ratio, and liquidity ratios (LCR, NSFR)",
   "distractors": [
    "Central clearing of derivatives",
    "Best execution",
    "T+1 settlement"
   ],
   "explain": "Minimum CET1 4.5% of RWA plus a 2.5% conservation buffer (plus other buffers); leverage ratio ≥ 3%; LCR and NSFR ≥ 100%.",
   "source": "BCBS"
  },
  {
   "id": "C3-lcr",
   "chapter": 3,
   "game": "statements",
   "topic": "regulation",
   "prompt": "The Liquidity Coverage Ratio (LCR) compares",
   "answer": "High-quality liquid assets to net cash outflows over a 30-day stress",
   "distractors": [
    "Capital to risk-weighted assets",
    "Stable funding to required stable funding over 1 year",
    "Loans to deposits"
   ],
   "explain": "Must be ≥ 100%: survive a month of stress. NSFR is the 1-year structural funding ratio.",
   "source": "BCBS"
  },
  {
   "id": "C3-frtb",
   "chapter": 3,
   "game": "statements",
   "topic": "regulation",
   "prompt": "FRTB (Fundamental Review of the Trading Book) concerns",
   "answer": "Market-risk capital for the trading book (moves from VaR to Expected Shortfall)",
   "distractors": [
    "Credit card regulation",
    "Anti-money laundering",
    "Settlement cycles"
   ],
   "explain": "Part of the final Basel III package. Its application has been repeatedly delayed in the EU, UK and US amid competitiveness concerns.",
   "source": "BCBS"
  },
  {
   "id": "C3-kyc",
   "chapter": 3,
   "game": "statements",
   "topic": "regulation",
   "prompt": "KYC/AML checks happen mainly",
   "answer": "At client onboarding and on an ongoing basis (transaction monitoring)",
   "distractors": [
    "Only when a trade settles",
    "Only once a year",
    "Only for retail clients"
   ],
   "explain": "Know Your Customer: identity, beneficial owners, source of funds, sanctions screening. Failures lead to large fines.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C3-volcker",
   "chapter": 3,
   "game": "truefalse",
   "topic": "regulation",
   "prompt": "The Volcker rule bans US banks from all trading activity.",
   "answer": false,
   "explain": "It restricts PROPRIETARY trading and fund investments; market-making, hedging and client trading remain allowed.",
   "source": "Dodd-Frank"
  },
  {
   "id": "C4-loan-granted",
   "chapter": 4,
   "game": "statements",
   "topic": "balance sheet",
   "prompt": "A bank grants a 1m loan and credits the client's account. Effect?",
   "answer": "Assets +1m (loan), liabilities +1m (deposit)",
   "distractors": [
    "Assets unchanged, liabilities +1m",
    "Assets +1m, equity +1m",
    "Assets −1m (cash), assets +1m (loan)"
   ],
   "explain": "Lending creates a deposit: the balance sheet grows on both sides.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C4-deposit-in",
   "chapter": 4,
   "game": "statements",
   "topic": "balance sheet",
   "prompt": "A client deposits 1m in cash. Effect?",
   "answer": "Assets +1m (cash/reserves), liabilities +1m (deposit)",
   "distractors": [
    "Equity +1m",
    "Assets +1m only",
    "Liabilities −1m"
   ],
   "explain": "A deposit is a liability: the bank owes it back.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C4-loss",
   "chapter": 4,
   "game": "statements",
   "topic": "balance sheet",
   "prompt": "A loan of 10m is written off. Effect?",
   "answer": "Assets −10m, equity −10m",
   "distractors": [
    "Liabilities −10m",
    "Assets −10m, liabilities −10m",
    "No effect until the next year"
   ],
   "explain": "Losses hit equity (via the P&L). That is why capital ratios matter: equity absorbs losses before depositors.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C4-repo-bs",
   "chapter": 4,
   "game": "statements",
   "topic": "balance sheet",
   "prompt": "A bank borrows 50m cash via repo, posting bonds. Effect?",
   "answer": "Assets +50m (cash), liabilities +50m (repo); the bonds stay on the balance sheet",
   "distractors": [
    "Assets unchanged (cash in, bonds out)",
    "Equity +50m",
    "Liabilities −50m"
   ],
   "explain": "A repo is treated as a collateralised loan, not a sale: the bank keeps the bonds' risk.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C4-side",
   "chapter": 4,
   "game": "statements",
   "topic": "balance sheet",
   "prompt": "On a bank's balance sheet, customer deposits are",
   "answer": "Liabilities",
   "distractors": [
    "Assets",
    "Equity",
    "Off balance sheet"
   ],
   "explain": "Loans and securities held are assets; deposits, bonds issued and repo borrowings are liabilities.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C4-nii-rates",
   "chapter": 4,
   "game": "statements",
   "topic": "balance sheet",
   "prompt": "Rates rise. For a typical asset-sensitive bank, net interest income",
   "answer": "Rises (assets reprice faster than deposits)",
   "distractors": [
    "Falls immediately",
    "Does not change",
    "Becomes negative"
   ],
   "explain": "But bond holdings lose value, and deposits may leave for higher yields — the SVB lesson (2023).",
   "source": "Ops fundamentals"
  },
  {
   "id": "C4-svb",
   "chapter": 4,
   "game": "statements",
   "topic": "risk cases",
   "prompt": "What was the core problem at Silicon Valley Bank (2023)?",
   "answer": "Long-dated bonds lost value as rates rose, and concentrated uninsured deposits ran",
   "distractors": [
    "A rogue trader hid losses",
    "A fat-finger payment error",
    "Exposure to subprime mortgages"
   ],
   "explain": "Interest-rate risk in the banking book + liquidity risk + concentrated depositors.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C4-archegos",
   "chapter": 4,
   "game": "statements",
   "topic": "risk cases",
   "prompt": "Archegos (2021) is mainly an example of",
   "answer": "Counterparty credit and concentration risk in prime brokerage (hidden leverage via swaps)",
   "distractors": [
    "Settlement fail risk",
    "Interest-rate risk",
    "Model risk in mortgage pricing"
   ],
   "explain": "Several banks lost billions when a highly leveraged client defaulted on margin calls.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C4-risk-type",
   "chapter": 4,
   "game": "statements",
   "topic": "risk cases",
   "prompt": "A payment of 900m is sent by mistake because of an unclear system screen. Risk type?",
   "answer": "Operational risk",
   "distractors": [
    "Market risk",
    "Credit risk",
    "Liquidity risk"
   ],
   "explain": "Citi–Revlon (2020): failures of processes, people or systems. Exactly the COO's territory: controls, process design, systems.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C5-rates-up",
   "chapter": 5,
   "game": "statements",
   "topic": "macro",
   "prompt": "The central bank raises rates unexpectedly. Typical immediate reaction?",
   "answer": "Bond prices fall, the currency strengthens, equities fall",
   "distractors": [
    "Bond prices rise, the currency weakens, equities rise",
    "Bond prices fall, the currency weakens, equities rise",
    "No effect on bonds"
   ],
   "explain": "Higher rates: lower PV of fixed cash flows, higher carry for the currency, higher discount rate for stocks.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C5-inverted",
   "chapter": 5,
   "game": "statements",
   "topic": "macro",
   "prompt": "An inverted yield curve means",
   "answer": "Short-term yields are above long-term yields, often read as markets expecting rate cuts / slower growth",
   "distractors": [
    "Long-term yields are above short-term yields",
    "All yields are negative",
    "The curve is flat"
   ],
   "explain": "Historically a recession signal (US 2s10s).",
   "source": "Ops fundamentals"
  },
  {
   "id": "C5-spread-widen",
   "chapter": 5,
   "game": "statements",
   "topic": "credit",
   "prompt": "A company's credit spread widens. Its bond price",
   "answer": "Falls",
   "distractors": [
    "Rises",
    "Does not change",
    "Goes to par"
   ],
   "explain": "Higher required yield → lower price. Spreads widen when default risk is perceived to rise.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C5-flight-quality",
   "chapter": 5,
   "game": "statements",
   "topic": "macro",
   "prompt": "In a flight to quality, which typically RISES?",
   "answer": "US Treasuries and German Bunds",
   "distractors": [
    "High-yield bonds",
    "Emerging-market equities",
    "Bank stocks"
   ],
   "explain": "Also gold, and safe-haven currencies (USD, JPY, CHF).",
   "source": "Ops fundamentals"
  },
  {
   "id": "C5-long-duration",
   "chapter": 5,
   "game": "statements",
   "topic": "rates",
   "prompt": "Rates rise 1%. Which loses more value?",
   "answer": "A 30-year zero-coupon bond",
   "distractors": [
    "A 2-year zero-coupon bond",
    "A 3-month T-bill",
    "Cash"
   ],
   "explain": "Longer duration → more sensitive. ΔP/P ≈ −D·Δy, and a zero's duration ≈ its maturity.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C5-premium",
   "chapter": 5,
   "game": "statements",
   "topic": "rates",
   "prompt": "Coupon 5%, yield 4%. The bond trades",
   "answer": "Above par (premium)",
   "distractors": [
    "Below par (discount)",
    "At par",
    "Cannot tell"
   ],
   "explain": "Coupon > yield → the bond pays more than the market requires → price > 100.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C5-vol-up",
   "chapter": 5,
   "game": "statements",
   "topic": "options",
   "prompt": "Implied volatility rises, all else equal. A long call",
   "answer": "Gains value (and so does a long put)",
   "distractors": [
    "Loses value",
    "Is unaffected",
    "Gains, but a long put loses"
   ],
   "explain": "Positive vega for both long calls and long puts.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C5-atm-delta",
   "chapter": 5,
   "game": "statements",
   "topic": "options",
   "prompt": "Delta of an at-the-money call is about",
   "answer": "0.5",
   "distractors": [
    "0",
    "1",
    "−0.5"
   ],
   "explain": "Deep ITM call → 1, deep OTM → 0. A put's delta is negative (ATM ≈ −0.5).",
   "source": "Ops fundamentals"
  },
  {
   "id": "C5-which-long-put",
   "chapter": 5,
   "game": "laws",
   "topic": "options",
   "prompt": "Which payoff at expiry (strike K, premium ignored) is a LONG PUT?",
   "answer": {
    "plot": {
     "fns": [
      {
       "f": "(100-x+abs(100-x))/2"
      }
     ],
     "x": [
      60,
      140
     ],
     "y": [
      -15,
      25
     ],
     "xticks": [
      [
       100,
       "K"
      ]
     ],
     "yticks": [
      [
       0,
       "0"
      ]
     ]
    }
   },
   "distractors": [
    {
     "plot": {
      "fns": [
       {
        "f": "(x-100+abs(x-100))/2"
       }
      ],
      "x": [
       60,
       140
      ],
      "y": [
       -15,
       25
      ],
      "xticks": [
       [
        100,
        "K"
       ]
      ],
      "yticks": [
       [
        0,
        "0"
       ]
      ]
     }
    },
    {
     "plot": {
      "fns": [
       {
        "f": "-((x-100+abs(x-100))/2)"
       }
      ],
      "x": [
       60,
       140
      ],
      "y": [
       -25,
       15
      ],
      "xticks": [
       [
        100,
        "K"
       ]
      ],
      "yticks": [
       [
        0,
        "0"
       ]
      ]
     }
    },
    {
     "plot": {
      "fns": [
       {
        "f": "-((100-x+abs(100-x))/2)"
       }
      ],
      "x": [
       60,
       140
      ],
      "y": [
       -25,
       15
      ],
      "xticks": [
       [
        100,
        "K"
       ]
      ],
      "yticks": [
       [
        0,
        "0"
       ]
      ]
     }
    }
   ],
   "explain": "Long put: pays K − S below the strike, zero above. The others: long call, short call, short put.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C5-which-straddle",
   "chapter": 5,
   "game": "laws",
   "topic": "options",
   "prompt": "Which payoff is a LONG STRADDLE (long call + long put, same K)?",
   "answer": {
    "plot": {
     "fns": [
      {
       "f": "abs(x-100)"
      }
     ],
     "x": [
      60,
      140
     ],
     "y": [
      -15,
      25
     ],
     "xticks": [
      [
       100,
       "K"
      ]
     ],
     "yticks": [
      [
       0,
       "0"
      ]
     ]
    }
   },
   "distractors": [
    {
     "plot": {
      "fns": [
       {
        "f": "(x-100+abs(x-100))/2"
       }
      ],
      "x": [
       60,
       140
      ],
      "y": [
       -15,
       25
      ],
      "xticks": [
       [
        100,
        "K"
       ]
      ],
      "yticks": [
       [
        0,
        "0"
       ]
      ]
     }
    },
    {
     "plot": {
      "fns": [
       {
        "f": "-abs(x-100)"
       }
      ],
      "x": [
       60,
       140
      ],
      "y": [
       -25,
       15
      ],
      "xticks": [
       [
        100,
        "K"
       ]
      ],
      "yticks": [
       [
        0,
        "0"
       ]
      ]
     }
    },
    {
     "plot": {
      "fns": [
       {
        "f": "(x-100)/2"
       }
      ],
      "x": [
       60,
       140
      ],
      "y": [
       -15,
       25
      ],
      "xticks": [
       [
        100,
        "K"
       ]
      ],
      "yticks": [
       [
        0,
        "0"
       ]
      ]
     }
    }
   ],
   "explain": "V-shaped: you profit from a big move either way (after premiums). The inverted V is a short straddle.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C5-which-short-call",
   "chapter": 5,
   "game": "laws",
   "topic": "options",
   "prompt": "Which payoff is a SHORT CALL?",
   "answer": {
    "plot": {
     "fns": [
      {
       "f": "-((x-100+abs(x-100))/2)"
      }
     ],
     "x": [
      60,
      140
     ],
     "y": [
      -25,
      15
     ],
     "xticks": [
      [
       100,
       "K"
      ]
     ],
     "yticks": [
      [
       0,
       "0"
      ]
     ]
    }
   },
   "distractors": [
    {
     "plot": {
      "fns": [
       {
        "f": "(x-100+abs(x-100))/2"
       }
      ],
      "x": [
       60,
       140
      ],
      "y": [
       -15,
       25
      ],
      "xticks": [
       [
        100,
        "K"
       ]
      ],
      "yticks": [
       [
        0,
        "0"
       ]
      ]
     }
    },
    {
     "plot": {
      "fns": [
       {
        "f": "(100-x+abs(100-x))/2"
       }
      ],
      "x": [
       60,
       140
      ],
      "y": [
       -15,
       25
      ],
      "xticks": [
       [
        100,
        "K"
       ]
      ],
      "yticks": [
       [
        0,
        "0"
       ]
      ]
     }
    },
    {
     "plot": {
      "fns": [
       {
        "f": "-((100-x+abs(100-x))/2)"
       }
      ],
      "x": [
       60,
       140
      ],
      "y": [
       -25,
       15
      ],
      "xticks": [
       [
        100,
        "K"
       ]
      ],
      "yticks": [
       [
        0,
        "0"
       ]
      ]
     }
    }
   ],
   "explain": "Short call: you keep the premium, but lose S − K above the strike, without limit. The riskiest of the four.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C6-xlookup",
   "chapter": 6,
   "game": "statements",
   "topic": "Excel",
   "prompt": "Find a trade ID in column A and return its notional from column D:",
   "answer": "=XLOOKUP(id, A:A, D:D)",
   "distractors": [
    "=VLOOKUP(id, D:A, 1, FALSE)",
    "=XLOOKUP(A:A, id, D:D)",
    "=LOOKUP(D:D, id)"
   ],
   "explain": "XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found]): exact match by default, can look left.",
   "source": "Excel"
  },
  {
   "id": "C6-vlookup",
   "chapter": 6,
   "game": "statements",
   "topic": "Excel",
   "prompt": "Why does =VLOOKUP(x, A:D, 4) sometimes return a wrong value?",
   "answer": "The 4th argument (range_lookup) is omitted, so it does an APPROXIMATE match",
   "distractors": [
    "VLOOKUP cannot return column 4",
    "A:D must be sorted descending",
    "x must be text"
   ],
   "explain": "Always use FALSE (or 0) for an exact match. VLOOKUP also cannot look left of the key column: use INDEX/MATCH or XLOOKUP.",
   "source": "Excel"
  },
  {
   "id": "C6-index-match",
   "chapter": 6,
   "game": "statements",
   "topic": "Excel",
   "prompt": "Classic alternative to VLOOKUP that can look left:",
   "answer": "=INDEX(B:B, MATCH(x, D:D, 0))",
   "distractors": [
    "=MATCH(INDEX(x, D:D), B:B)",
    "=INDEX(x, B:B, D:D)",
    "=VLOOKUP(x, B:D, -2, FALSE)"
   ],
   "explain": "MATCH finds the row number (0 = exact), INDEX returns that row from any column.",
   "source": "Excel"
  },
  {
   "id": "C6-sumifs",
   "chapter": 6,
   "game": "statements",
   "topic": "Excel",
   "prompt": "Total notional (col D) of trades where desk (col B) = \"Rates\" and status (col C) = \"Open\":",
   "answer": "=SUMIFS(D:D, B:B, \"Rates\", C:C, \"Open\")",
   "distractors": [
    "=SUMIFS(B:B, \"Rates\", C:C, \"Open\", D:D)",
    "=SUMIF(D:D, B:B, \"Rates\")",
    "=SUM(D:D, \"Rates\", \"Open\")"
   ],
   "explain": "SUMIFS: sum_range FIRST, then (criteria_range, criterion) pairs. COUNTIFS/AVERAGEIFS work the same way.",
   "source": "Excel"
  },
  {
   "id": "C6-absolute",
   "chapter": 6,
   "game": "statements",
   "topic": "Excel",
   "prompt": "You copy =B2*\\$F\\$1 down one row. It becomes",
   "answer": "=B3*\\$F\\$1",
   "distractors": [
    "=B3*\\$F\\$2",
    "=B2*\\$F\\$1",
    "=C2*\\$G\\$1"
   ],
   "explain": "\\$ fixes the column and/or row. F4 cycles through \\$F\\$1, F\\$1, \\$F1, F1.",
   "source": "Excel"
  },
  {
   "id": "C6-pivot",
   "chapter": 6,
   "game": "tool",
   "topic": "Excel",
   "prompt": "Fastest way to get total breaks per desk per month from a raw list?",
   "answer": "A pivot table (desk in rows, month in columns, count of break ID in values)",
   "distractors": [
    "Sort the list and add subtotals by hand",
    "One SUM per desk",
    "VLOOKUP per row"
   ],
   "explain": "Pivot tables summarise, regroup and filter in seconds; refresh when the data changes.",
   "source": "Excel"
  },
  {
   "id": "C6-iferror",
   "chapter": 6,
   "game": "statements",
   "topic": "Excel",
   "prompt": "=IFERROR(XLOOKUP(id, A:A, D:D), 0) returns",
   "answer": "The notional if found, 0 otherwise",
   "distractors": [
    "0 always",
    "An error if not found",
    "The trade ID"
   ],
   "explain": "IFERROR(value, value_if_error). XLOOKUP also has its own if_not_found argument.",
   "source": "Excel"
  },
  {
   "id": "C6-shortcuts",
   "chapter": 6,
   "game": "statements",
   "topic": "Excel",
   "prompt": "Which shortcut is WRONG (Windows)?",
   "answer": "Ctrl + Shift + L: insert a pivot table",
   "distractors": [
    "Ctrl + arrow: jump to the edge of the data",
    "Alt + =: AutoSum",
    "Ctrl + T: format as a table"
   ],
   "explain": "Ctrl + Shift + L toggles filters. Pivot table: Alt, N, V (Insert ▸ PivotTable).",
   "source": "Excel"
  },
  {
   "id": "C6-duplicates",
   "chapter": 6,
   "game": "statements",
   "topic": "Excel",
   "prompt": "Count how many times trade ID in A2 appears in column A (to spot duplicates):",
   "answer": "=COUNTIF(A:A, A2)",
   "distractors": [
    "=COUNT(A2, A:A)",
    "=MATCH(A2, A:A, 0)",
    "=SUMIF(A2, A:A)"
   ],
   "explain": "> 1 means a duplicate. Data ▸ Remove Duplicates removes them.",
   "source": "Excel"
  },
  {
   "id": "C7-segments",
   "chapter": 7,
   "game": "statements",
   "topic": "Bank of America",
   "prompt": "Bank of America's four business segments?",
   "answer": "Consumer Banking; Global Wealth & Investment Management; Global Banking; Global Markets",
   "distractors": [
    "Retail; Corporate; Insurance; Asset Management",
    "Consumer; Mortgages; Cards; Trading",
    "Investment Banking; Private Equity; Retail; Insurance"
   ],
   "explain": "GWIM includes Merrill and the Private Bank. The segments contain eight lines of business.",
   "source": "BofA 2025 annual report"
  },
  {
   "id": "C7-ceo",
   "chapter": 7,
   "game": "statements",
   "topic": "Bank of America",
   "prompt": "Bank of America's leadership in 2026:",
   "answer": "Brian Moynihan, Chair and CEO; Dean Athanasia and Jim DeMare, Co-Presidents",
   "distractors": [
    "Jamie Dimon, CEO",
    "Jane Fraser, CEO",
    "David Solomon, CEO"
   ],
   "explain": "Moynihan has been CEO since 2010. The two Co-Presidents (since September 2025) jointly oversee the lines of business; Alastair Borthwick is CFO. Re-check before the interview.",
   "source": "BofA newsroom"
  },
  {
   "id": "C7-coo-role",
   "chapter": 7,
   "game": "statements",
   "topic": "COO role",
   "prompt": "What does a business COO team typically do?",
   "answer": "Run the business: strategy execution, budget and expenses, controls and risk, regulatory and change projects, data and reporting",
   "distractors": [
    "Trade on behalf of clients",
    "Approve every loan",
    "Set the bank's interest rates"
   ],
   "explain": "Think of it as the business's operating system: making the front office efficient, controlled and compliant.",
   "source": "Ops fundamentals"
  },
  {
   "id": "C7-why-coo",
   "chapter": 7,
   "game": "statements",
   "topic": "COO role",
   "prompt": "Strongest one-line pitch for 'Why COO?'",
   "answer": "I like improving how things run: using data to find inefficiencies, then fixing processes and controls with people across the business",
   "distractors": [
    "It is less stressful than trading",
    "I could not get a front-office offer",
    "I want to avoid client contact"
   ],
   "explain": "Show impact, analytical skills and collaboration. Back it with one concrete example (a project you ran, a process you improved).",
   "source": "Ops fundamentals"
  },
  {
   "id": "C7-responsible-growth",
   "chapter": 7,
   "game": "statements",
   "topic": "Bank of America",
   "prompt": "Bank of America's long-standing strategy phrase is",
   "answer": "\"Responsible Growth\"",
   "distractors": [
    "\"Move fast and break things\"",
    "\"Fortress balance sheet\"",
    "\"One Firm\""
   ],
   "explain": "Growth with clients, managing risk well, sustainably. (\"Fortress balance sheet\" is JPMorgan's phrase.)",
   "source": "BofA"
  }
 ]
});
