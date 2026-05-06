import type { DilemmaTemplate } from "../../data/types.ts";

/**
 * v1 starter pool of player dilemmas. Each option declares the state inputs
 * (`scalingTags`) that move its success%, and unscaled "100%" effect values.
 * SuccessFormula scales effect magnitudes at resolve-time.
 *
 * Authoring guidelines:
 *   - 2–4 options per dilemma; meaningfully different tradeoffs.
 *   - At least one option should "feel safe" (lower stakes, safer scaling tag).
 *   - At least one option should "feel bold" (bigger effect, riskier scaling).
 *   - Use {empire}, {rival}, {port} for subject binding.
 *   - `headwindWeight` boosts firing when player is winning; `tailwindWeight`
 *     boosts firing when player is struggling.
 */
export const DILEMMA_TEMPLATES: DilemmaTemplate[] = [
  // -------------------------------------------------------------------------
  // Operational — fleet/route stress
  // -------------------------------------------------------------------------
  {
    id: "engineer_strike",
    category: "operational",
    imageKey: "dilemma_engineer_strike",
    prompt:
      "Engineers across {port} are threatening a wildcat strike. They want hazard pay, or they walk.",
    weight: 8,
    headwindWeight: 6,
    tailwindWeight: 1,
    options: [
      {
        id: "pay_demands",
        label: "Pay the hazard premium",
        outcomeDescription: "Crews stay on the line. Costs hurt, morale holds.",
        baseSuccess: 60,
        scalingTags: ["cash"],
        effects: [
          { type: "modifyCash", value: -8000 },
          { type: "modifyReputation", value: 4 },
        ],
      },
      {
        id: "rotate_crews",
        label: "Rotate fresh crews from your fleet",
        outcomeDescription:
          "You absorb the hit by leaning on your operational depth.",
        baseSuccess: 45,
        scalingTags: ["fleetSize", "fleetCondition"],
        effects: [
          { type: "modifyCash", value: -1500 },
          { type: "modifyReputation", value: 2 },
        ],
      },
      {
        id: "break_strike",
        label: "Break the strike publicly",
        outcomeDescription:
          "Cheaper today, costlier in goodwill. Word travels.",
        baseSuccess: 40,
        scalingTags: ["rep"],
        effects: [
          { type: "modifyCash", value: -500 },
          { type: "modifyReputation", value: -10 },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Diplomatic — empire / rival friction
  // -------------------------------------------------------------------------
  {
    id: "tariff_brinkmanship",
    category: "diplomatic",
    imageKey: "dilemma_tariff_brinkmanship",
    prompt:
      "{empire} is hinting at a tariff hike that would gut your margins. A back-channel deal might smooth it over.",
    weight: 6,
    headwindWeight: 5,
    tailwindWeight: 2,
    options: [
      {
        id: "diplomatic_visit",
        label: "Send a diplomatic envoy",
        outcomeDescription:
          "A formal visit demonstrates respect. Reputation matters here.",
        baseSuccess: 55,
        scalingTags: ["rep"],
        effects: [
          { type: "modifyReputation", value: 6 },
          { type: "modifyCash", value: -2000 },
        ],
      },
      {
        id: "covert_payments",
        label: "Quiet payments to key officials",
        outcomeDescription:
          "Money talks loudest. So does the audit if it leaks.",
        baseSuccess: 50,
        scalingTags: ["cash"],
        effects: [
          { type: "modifyCash", value: -10000 },
          { type: "modifyReputation", value: -3 },
        ],
      },
      {
        id: "go_public",
        label: "Threaten to pull out of {empire} markets",
        outcomeDescription:
          "A risky public stance — your fleet's heft is the leverage.",
        baseSuccess: 40,
        scalingTags: ["fleetSize"],
        effects: [
          { type: "modifyReputation", value: 8 },
          { type: "modifyCash", value: -3000 },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Financial — credit / market shock
  // -------------------------------------------------------------------------
  {
    id: "credit_squeeze",
    category: "financial",
    imageKey: "dilemma_credit_squeeze",
    prompt:
      "Sector banks are tightening credit. Your liquidity coverage is being scrutinized.",
    weight: 6,
    headwindWeight: 3,
    tailwindWeight: 4,
    options: [
      {
        id: "shore_up_cash",
        label: "Park reserves with the trustees",
        outcomeDescription:
          "Show them you're solid. The cushion gets you through.",
        baseSuccess: 65,
        scalingTags: ["cash"],
        effects: [
          { type: "modifyCash", value: -2500 },
          { type: "modifyReputation", value: 5 },
        ],
      },
      {
        id: "tech_pitch",
        label: "Pitch your modernization roadmap",
        outcomeDescription:
          "Investors love R&D. Your tech portfolio is the story.",
        baseSuccess: 50,
        scalingTags: ["tech"],
        effects: [
          { type: "modifyCash", value: 4000 },
          { type: "modifyReputation", value: 3 },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Narrative — character / flavor
  // -------------------------------------------------------------------------
  {
    id: "rival_recruits",
    category: "narrative",
    imageKey: "dilemma_rival_recruits",
    prompt:
      "{rival} has been quietly poaching your senior crews with signing bonuses. The dock chatter is getting noisy.",
    weight: 5,
    headwindWeight: 4,
    tailwindWeight: 2,
    options: [
      {
        id: "match_offers",
        label: "Match the signing bonuses",
        outcomeDescription: "Expensive, but loyalty has a price.",
        baseSuccess: 55,
        scalingTags: ["cash"],
        effects: [{ type: "modifyCash", value: -6000 }],
      },
      {
        id: "promote_within",
        label: "Promote from within and grant equity",
        outcomeDescription: "Your reputation as a fair boss is the moat here.",
        baseSuccess: 50,
        scalingTags: ["rep", "fleetSize"],
        effects: [{ type: "modifyReputation", value: 6 }],
      },
      {
        id: "let_them_go",
        label: "Let them go — train new talent",
        outcomeDescription:
          "Painful in the short term. Resilient organizations recover.",
        baseSuccess: 40,
        scalingTags: ["fleetCondition"],
        effects: [
          { type: "modifyCash", value: -1500 },
          { type: "modifyReputation", value: -2 },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Operational mid-game — modernization
  // -------------------------------------------------------------------------
  {
    id: "retrofit_offer",
    category: "operational",
    imageKey: "dilemma_retrofit_offer",
    prompt:
      "An engineering consortium offers a fleet retrofit package — better fuel efficiency, but the install windows ground ships for a turn.",
    weight: 4,
    headwindWeight: 1,
    tailwindWeight: 3,
    eligibility: "midGame",
    options: [
      {
        id: "accept_full",
        label: "Retrofit the entire fleet",
        outcomeDescription:
          "Bold investment. Tech-heavy companies handle the disruption better.",
        baseSuccess: 50,
        scalingTags: ["tech", "fleetSize"],
        effects: [
          { type: "modifyCash", value: -12000 },
          { type: "modifyReputation", value: 4 },
        ],
      },
      {
        id: "accept_partial",
        label: "Retrofit only your worst ships",
        outcomeDescription: "Conservative play, modest payoff.",
        baseSuccess: 65,
        scalingTags: ["fleetCondition"],
        effects: [{ type: "modifyCash", value: -4000 }],
      },
      {
        id: "decline",
        label: "Decline — keep ships in service",
        outcomeDescription:
          "No disruption, no upgrade. The consortium will remember.",
        baseSuccess: 70,
        scalingTags: [],
        effects: [{ type: "modifyReputation", value: -2 }],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Operational crisis — quarantine outbreak
  // -------------------------------------------------------------------------
  {
    id: "quarantine_outbreak",
    category: "operational",
    imageKey: "dilemma_quarantine_outbreak",
    prompt:
      "A novel pathogen is sweeping {port}. Local authorities want immediate action — and the press is already on it.",
    weight: 6,
    headwindWeight: 3,
    tailwindWeight: 5,
    options: [
      {
        id: "lockdown_routes",
        label: "Lock down all {port} routes",
        outcomeDescription:
          "Halt traffic until the outbreak clears. Safe, but margins evaporate.",
        baseSuccess: 70,
        scalingTags: ["cash"],
        effects: [
          { type: "modifyCash", value: -5000 },
          { type: "modifyReputation", value: 6 },
        ],
      },
      {
        id: "smuggle_vaccines",
        label: "Run vaccines through quietly",
        outcomeDescription:
          "Tech-heavy fleets can move medical cargo discreetly. Big upside, big optics risk if caught.",
        baseSuccess: 45,
        scalingTags: ["tech", "fleetCondition"],
        effects: [
          { type: "modifyCash", value: 6000 },
          { type: "modifyReputation", value: 5 },
        ],
      },
      {
        id: "public_health_pr",
        label: "Fund a public health campaign",
        outcomeDescription:
          "Spend big, look good. Reputation does the heavy lifting.",
        baseSuccess: 60,
        scalingTags: ["rep"],
        effects: [
          { type: "modifyCash", value: -8000 },
          { type: "modifyReputation", value: 10 },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Narrative — corporate espionage
  // -------------------------------------------------------------------------
  {
    id: "corporate_espionage",
    category: "narrative",
    imageKey: "dilemma_corporate_espionage",
    prompt:
      "A defector from {rival} offers you a dossier of stolen R&D plans. Your move sets the tone for years.",
    weight: 4,
    headwindWeight: 5,
    tailwindWeight: 1,
    eligibility: "midGame",
    options: [
      {
        id: "buy_dossier",
        label: "Buy the dossier",
        outcomeDescription:
          "Tech windfall — but if it leaks, the lawsuits are real.",
        baseSuccess: 55,
        scalingTags: ["tech", "cash"],
        effects: [
          { type: "modifyCash", value: -7000 },
          { type: "modifyReputation", value: -4 },
        ],
      },
      {
        id: "report_defector",
        label: "Report the defector to {rival}",
        outcomeDescription: "The high road. Goodwill banked across the sector.",
        baseSuccess: 65,
        scalingTags: ["rep"],
        effects: [{ type: "modifyReputation", value: 8 }],
      },
      {
        id: "counter_intel",
        label: "Run counter-intel — feed them garbage",
        outcomeDescription:
          "A spy game. Deeply researched companies pull this off; others get burned.",
        baseSuccess: 40,
        scalingTags: ["tech"],
        effects: [
          { type: "modifyCash", value: 3000 },
          { type: "modifyReputation", value: 2 },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Diplomatic — bandit warlord shakedown
  // -------------------------------------------------------------------------
  {
    id: "bandit_warlord_offer",
    category: "diplomatic",
    imageKey: "dilemma_bandit_warlord_offer",
    prompt:
      "A self-styled warlord controls a chokepoint near {port} and wants tribute for safe passage.",
    weight: 5,
    headwindWeight: 4,
    tailwindWeight: 3,
    options: [
      {
        id: "pay_tribute",
        label: "Pay the tribute",
        outcomeDescription:
          "Routes stay open. Cheap relative to the alternative — until the next demand.",
        baseSuccess: 70,
        scalingTags: ["cash"],
        effects: [
          { type: "modifyCash", value: -4500 },
          { type: "modifyReputation", value: -3 },
        ],
      },
      {
        id: "fight_warlord",
        label: "Run the gauntlet with armed escort",
        outcomeDescription:
          "A larger, healthier fleet calls the bluff. A smaller one bleeds.",
        baseSuccess: 35,
        scalingTags: ["fleetSize", "fleetCondition"],
        effects: [
          { type: "modifyCash", value: -2000 },
          { type: "modifyReputation", value: 8 },
        ],
      },
      {
        id: "negotiate_alliance",
        label: "Offer a trade pact instead",
        outcomeDescription:
          "Turn enemy into partner. Reputation does the talking.",
        baseSuccess: 45,
        scalingTags: ["rep"],
        effects: [
          { type: "modifyCash", value: -1500 },
          { type: "modifyReputation", value: 5 },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Financial — data breach
  // -------------------------------------------------------------------------
  {
    id: "data_breach",
    category: "financial",
    imageKey: "dilemma_data_breach",
    prompt:
      "Your books are leaking. A blogger is shopping the story. You have hours, not days.",
    weight: 5,
    headwindWeight: 5,
    tailwindWeight: 2,
    options: [
      {
        id: "buy_silence",
        label: "Buy the leak's silence",
        outcomeDescription:
          "Quietly resolved. The cost is real, the precedent worse.",
        baseSuccess: 60,
        scalingTags: ["cash"],
        effects: [
          { type: "modifyCash", value: -9000 },
          { type: "modifyReputation", value: -2 },
        ],
      },
      {
        id: "preempt_disclosure",
        label: "Pre-empt with a public disclosure",
        outcomeDescription: "Own the narrative. Investors respect the spine.",
        baseSuccess: 55,
        scalingTags: ["rep", "tech"],
        effects: [
          { type: "modifyCash", value: -2500 },
          { type: "modifyReputation", value: 6 },
        ],
      },
      {
        id: "sue_the_leak",
        label: "Lawyer up — sue the leak",
        outcomeDescription:
          "A long road. Tech-heavy IP defense makes this winnable.",
        baseSuccess: 45,
        scalingTags: ["tech", "cash"],
        effects: [
          { type: "modifyCash", value: -4000 },
          { type: "modifyReputation", value: 1 },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Opportunity (late-game) — inherited derelict mega-hauler
  // -------------------------------------------------------------------------
  {
    id: "legacy_freighter_inheritance",
    category: "opportunity",
    imageKey: "dilemma_legacy_freighter",
    prompt:
      "A deceased competitor's family offers you their derelict mega-hauler. Restoration is huge — and risky.",
    weight: 3,
    headwindWeight: 1,
    tailwindWeight: 4,
    eligibility: "lateGame",
    options: [
      {
        id: "restore_ship",
        label: "Restore the mega-hauler to service",
        outcomeDescription:
          "A trophy ship — if your shipyards can handle the work.",
        baseSuccess: 50,
        scalingTags: ["tech", "fleetCondition"],
        effects: [
          { type: "modifyCash", value: -15000 },
          { type: "modifyReputation", value: 8 },
        ],
      },
      {
        id: "scrap_for_parts",
        label: "Scrap her for parts",
        outcomeDescription:
          "Pragmatic. The salvage covers retrofits across your fleet.",
        baseSuccess: 70,
        scalingTags: ["fleetSize"],
        effects: [
          { type: "modifyCash", value: 6000 },
          { type: "modifyReputation", value: -1 },
        ],
      },
      {
        id: "sell_to_rival",
        label: "Resell to {rival}",
        outcomeDescription: "Cash today, a competitor's strength tomorrow.",
        baseSuccess: 65,
        scalingTags: ["cash"],
        effects: [
          { type: "modifyCash", value: 8000 },
          { type: "modifyReputation", value: -3 },
        ],
      },
    ],
  },
  // ---------------------------------------------------------------------------
  // Space Hazard dilemmas
  // ---------------------------------------------------------------------------
  {
    id: "navigate_spatial_rift",
    category: "operational",
    imageKey: "dilemma_spatial_rift",
    prompt:
      "A spatial rift is destabilizing the {port} corridor. Your captain wants instructions before sunrise.",
    weight: 4,
    headwindWeight: 4,
    tailwindWeight: 1,
    options: [
      {
        id: "push_through_rift",
        label: "Push through with reinforced shielding",
        outcomeDescription: "Fast and risky.",
        baseSuccess: 45,
        scalingTags: ["fleetCondition", "tech"],
        effects: [
          { type: "modifyCash", value: -3500 },
          { type: "modifyFleetCondition", value: -8 },
        ],
      },
      {
        id: "hull_reinforce_rift",
        label: "Hull-reinforce before crossing",
        outcomeDescription: "Slower but safer.",
        baseSuccess: 70,
        scalingTags: ["cash"],
        effects: [{ type: "modifyCash", value: -7000 }],
      },
      {
        id: "abandon_rift_route",
        label: "Abandon the route entirely",
        outcomeDescription: "Lose contracts, save lives.",
        baseSuccess: 90,
        scalingTags: ["navigation"],
        effects: [
          { type: "modifyCash", value: -5000 },
          { type: "modifyReputation", value: 2 },
        ],
      },
    ],
  },
  {
    id: "wormhole_exploitation",
    category: "opportunity",
    imageKey: "dilemma_wormhole",
    prompt:
      "A wormhole has opened near {port} — but it's collapsing within days. Big risk, big margin.",
    weight: 3,
    headwindWeight: 1,
    tailwindWeight: 4,
    options: [
      {
        id: "use_wormhole",
        label: "Run cargo through before it collapses",
        outcomeDescription: "Hit the window for a payday.",
        baseSuccess: 55,
        scalingTags: ["fleetSize", "navigation"],
        effects: [{ type: "modifyCash", value: 14000 }],
      },
      {
        id: "sell_wormhole_access",
        label: "Sell access rights to a rival",
        outcomeDescription: "Less profit, less risk.",
        baseSuccess: 80,
        scalingTags: ["cash"],
        effects: [
          { type: "modifyCash", value: 8000 },
          { type: "modifyReputation", value: -3 },
        ],
      },
      {
        id: "report_wormhole_imp",
        label: "Report it to imperial astrocartography",
        outcomeDescription: "Earn imperial favor and a finder's fee.",
        baseSuccess: 75,
        scalingTags: ["rep"],
        effects: [
          { type: "modifyCash", value: 3000 },
          { type: "modifyReputation", value: 7 },
        ],
      },
    ],
  },
  {
    id: "radiation_shelter",
    category: "operational",
    imageKey: "dilemma_radiation",
    prompt:
      "A radiation burst is sweeping {port}. Captain {ceo} requests guidance for the in-flight fleet.",
    weight: 4,
    headwindWeight: 3,
    tailwindWeight: 1,
    options: [
      {
        id: "ground_radiation",
        label: "Ground all in-system ships",
        outcomeDescription: "No casualties, missed deliveries.",
        baseSuccess: 90,
        scalingTags: ["navigation"],
        effects: [{ type: "modifyCash", value: -6000 }],
      },
      {
        id: "push_radiation",
        label: "Push through with current shielding",
        outcomeDescription: "Faster but ships take damage.",
        baseSuccess: 40,
        scalingTags: ["fleetCondition"],
        effects: [{ type: "modifyFleetCondition", value: -15 }],
      },
      {
        id: "hire_shielded_escort",
        label: "Hire shielded escorts",
        outcomeDescription: "Expensive but safe.",
        baseSuccess: 75,
        scalingTags: ["cash", "tech"],
        effects: [{ type: "modifyCash", value: -9000 }],
      },
    ],
  },
  {
    id: "dark_matter_futures",
    category: "financial",
    imageKey: "dilemma_dark_matter",
    prompt:
      "Your analyst caught wind of an imminent dark-matter surge — fuel will spike. The data isn't public yet.",
    weight: 3,
    headwindWeight: 1,
    tailwindWeight: 4,
    options: [
      {
        id: "buy_fuel_futures",
        label: "Buy fuel futures heavily",
        outcomeDescription: "If your tip is right, big payday.",
        baseSuccess: 60,
        scalingTags: ["cash"],
        effects: [{ type: "modifyCash", value: 11000 }],
      },
      {
        id: "wait_dark_matter",
        label: "Wait for public data",
        outcomeDescription: "No insider risk, no insider profit.",
        baseSuccess: 95,
        effects: [],
      },
      {
        id: "warn_others_dm",
        label: "Warn other shippers (and your home empire)",
        outcomeDescription: "You become the trustworthy one.",
        baseSuccess: 80,
        scalingTags: ["rep"],
        effects: [{ type: "modifyReputation", value: 8 }],
      },
    ],
  },
  {
    id: "stellar_evacuation_profiteer",
    category: "opportunity",
    imageKey: "dilemma_stellar_collapse",
    prompt:
      "{port} is being evacuated as its star collapses. Refugees will pay anything for transport off-world.",
    weight: 2,
    headwindWeight: 1,
    tailwindWeight: 5,
    options: [
      {
        id: "price_gouge_refugees",
        label: "Charge premium evacuation rates",
        outcomeDescription: "Massive cash, ugly press.",
        baseSuccess: 70,
        scalingTags: ["fleetSize", "cash"],
        effects: [
          { type: "modifyCash", value: 22000 },
          { type: "modifyReputation", value: -12 },
        ],
      },
      {
        id: "free_transport_refugees",
        label: "Provide free transport",
        outcomeDescription: "Goodwill that lasts a generation.",
        baseSuccess: 85,
        scalingTags: ["fleetSize"],
        effects: [
          { type: "modifyCash", value: -10000 },
          { type: "modifyReputation", value: 18 },
        ],
      },
      {
        id: "ignore_evacuation",
        label: "Stay clear of the chaos",
        outcomeDescription: "Neither hero nor villain.",
        baseSuccess: 95,
        effects: [],
      },
    ],
  },
  // ---------------------------------------------------------------------------
  // Military dilemmas
  // ---------------------------------------------------------------------------
  {
    id: "arms_dealer_contact",
    category: "diplomatic",
    imageKey: "dilemma_arms_dealer",
    prompt:
      "An off-the-books arms dealer wants to use your fleet to ship to {empire}. Their tech is bleeding-edge and illegal.",
    weight: 3,
    headwindWeight: 1,
    tailwindWeight: 3,
    options: [
      {
        id: "buy_illegal_tech",
        label: "Buy the tech for your fleet",
        outcomeDescription: "Capability gain, reputation risk.",
        baseSuccess: 50,
        scalingTags: ["cash", "tech"],
        effects: [
          { type: "modifyCash", value: -10000 },
          { type: "modifyReputation", value: -4 },
        ],
      },
      {
        id: "report_arms_dealer",
        label: "Report the dealer to imperial authorities",
        outcomeDescription: "Empire favor, dangerous enemies.",
        baseSuccess: 65,
        scalingTags: ["rep"],
        effects: [{ type: "modifyReputation", value: 10 }],
      },
      {
        id: "double_agent_arms",
        label: "Run them as a double agent",
        outcomeDescription: "Highest risk, highest reward.",
        baseSuccess: 35,
        scalingTags: ["tech", "rep"],
        effects: [
          { type: "modifyCash", value: 9000 },
          { type: "modifyReputation", value: 4 },
        ],
      },
    ],
  },
  {
    id: "defecting_officer",
    category: "narrative",
    imageKey: "dilemma_defector",
    prompt:
      "{rank} {officer} of {empire} wants to defect — and they want your fleet to extract them.",
    weight: 2,
    headwindWeight: 1,
    tailwindWeight: 3,
    options: [
      {
        id: "shelter_defector",
        label: "Shelter the defector quietly",
        outcomeDescription: "Diplomatic risk; long-term ally.",
        baseSuccess: 50,
        scalingTags: ["fleetCondition", "rep"],
        effects: [{ type: "modifyReputation", value: 6 }],
      },
      {
        id: "sell_defector_back",
        label: "Sell them back to {empire}",
        outcomeDescription: "Cash and empire favor; betrayal taste in mouth.",
        baseSuccess: 70,
        scalingTags: ["cash"],
        effects: [
          { type: "modifyCash", value: 12000 },
          { type: "modifyReputation", value: -7 },
        ],
      },
      {
        id: "exploit_defector_intel",
        label: "Take the intel, leave them stranded",
        outcomeDescription: "Tech edge; dishonor.",
        baseSuccess: 60,
        scalingTags: ["tech"],
        effects: [{ type: "modifyReputation", value: -10 }],
      },
    ],
  },
  {
    id: "border_patrol_bribe",
    category: "operational",
    imageKey: "dilemma_border_bribe",
    prompt:
      "A {empire} border patrol officer is hinting that a small payment will skip the inspection of your fleet.",
    weight: 5,
    headwindWeight: 5,
    tailwindWeight: 1,
    options: [
      {
        id: "pay_border_bribe",
        label: "Pay the bribe",
        outcomeDescription: "Faster, dirtier.",
        baseSuccess: 80,
        scalingTags: ["cash"],
        effects: [
          { type: "modifyCash", value: -2500 },
          { type: "modifyReputation", value: -2 },
        ],
      },
      {
        id: "refuse_bribe",
        label: "Refuse and accept the inspection delay",
        outcomeDescription: "Clean conscience, slow ship.",
        baseSuccess: 85,
        scalingTags: ["fleetCondition"],
        effects: [{ type: "modifyCash", value: -1500 }],
      },
      {
        id: "report_corrupt_patrol",
        label: "Report the corrupt officer",
        outcomeDescription: "Big rep gain; certain officials remember you.",
        baseSuccess: 60,
        scalingTags: ["rep"],
        effects: [{ type: "modifyReputation", value: 6 }],
      },
    ],
  },
  {
    id: "mercenary_contract",
    category: "diplomatic",
    imageKey: "dilemma_mercenary",
    prompt:
      "A contested route through {sector} needs armed escorts. A mercenary outfit is offering competitive rates.",
    weight: 4,
    headwindWeight: 4,
    tailwindWeight: 2,
    options: [
      {
        id: "hire_mercenaries",
        label: "Hire the mercenaries",
        outcomeDescription:
          "Cargo arrives safely, but you're now linked to them.",
        baseSuccess: 75,
        scalingTags: ["cash"],
        effects: [{ type: "modifyCash", value: -6000 }],
      },
      {
        id: "no_protection",
        label: "Run the route without protection",
        outcomeDescription: "Cheap and dangerous.",
        baseSuccess: 35,
        scalingTags: ["fleetCondition"],
        effects: [{ type: "modifyFleetCondition", value: -12 }],
      },
      {
        id: "cede_route",
        label: "Cede the route to a rival",
        outcomeDescription: "Lose contracts, lose face.",
        baseSuccess: 90,
        effects: [
          { type: "modifyCash", value: -3500 },
          { type: "modifyReputation", value: -3 },
        ],
      },
    ],
  },
];
