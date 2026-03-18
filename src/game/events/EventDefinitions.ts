import { EventCategory, CargoType } from "../../data/types.ts";
import type { EventEffect, EventChoice } from "../../data/types.ts";

export interface EventTemplate {
  id: string;
  name: string;
  description: string;
  category: EventCategory;
  duration: number;
  effects: EventEffect[];
  weight: number;
  headwindWeight: number;
  tailwindWeight: number;
  requiresChoice?: boolean;
  choices?: EventChoice[];
}

// ---------------------------------------------------------------------------
// Market Events (5)
// ---------------------------------------------------------------------------

const oreBoom: EventTemplate = {
  id: "ore_boom",
  name: "Ore Boom",
  description:
    "A surge in construction across the sector has driven raw materials demand up 50% on {target}.",
  category: EventCategory.Market,
  duration: 2,
  effects: [
    { type: "modifyDemand", cargoType: CargoType.RawMaterials, value: 0.5 },
  ],
  weight: 10,
  headwindWeight: 0,
  tailwindWeight: 0,
};

const techGlut: EventTemplate = {
  id: "tech_glut",
  name: "Tech Glut",
  description:
    "Overproduction of technology goods has flooded the market, dropping tech prices by 30% galaxy-wide.",
  category: EventCategory.Market,
  duration: 2,
  effects: [
    { type: "modifyPrice", cargoType: CargoType.Technology, value: -0.3 },
  ],
  weight: 8,
  headwindWeight: 0,
  tailwindWeight: 0,
};

const famineCrisis: EventTemplate = {
  id: "famine_crisis",
  name: "Famine Crisis",
  description:
    "Crop failures on {target} have driven food demand up 80%. Haulers needed urgently!",
  category: EventCategory.Market,
  duration: 3,
  effects: [{ type: "modifyDemand", cargoType: CargoType.Food, value: 0.8 }],
  weight: 8,
  headwindWeight: 0,
  tailwindWeight: 0,
};

const tradeAgreement: EventTemplate = {
  id: "trade_agreement",
  name: "Trade Agreement",
  description:
    "A new interstellar trade pact has reduced fuel costs by 20% for all carriers.",
  category: EventCategory.Market,
  duration: 2,
  effects: [{ type: "modifyPrice", value: -0.2 }],
  weight: 6,
  headwindWeight: 0,
  tailwindWeight: 8,
};

const economicRecession: EventTemplate = {
  id: "economic_recession",
  name: "Economic Recession",
  description:
    "An economic downturn has reduced demand for all goods by 15% across the galaxy.",
  category: EventCategory.Market,
  duration: 3,
  effects: [{ type: "modifyDemand", value: -0.15 }],
  weight: 6,
  headwindWeight: 8,
  tailwindWeight: 0,
};

// ---------------------------------------------------------------------------
// Hazard Events (5)
// ---------------------------------------------------------------------------

const asteroidStorm: EventTemplate = {
  id: "asteroid_storm",
  name: "Asteroid Storm",
  description:
    "A dense asteroid field has made the route through {target} impassable for the time being.",
  category: EventCategory.Hazard,
  duration: 2,
  effects: [{ type: "blockRoute", value: 1 }],
  weight: 8,
  headwindWeight: 0,
  tailwindWeight: 0,
};

const pirateActivity: EventTemplate = {
  id: "pirate_activity",
  name: "Pirate Activity",
  description:
    "Pirate raiders in the {target} system are forcing ships to take slower evasive routes, reducing speed by 20%.",
  category: EventCategory.Hazard,
  duration: 2,
  effects: [{ type: "modifySpeed", value: -0.2 }],
  weight: 7,
  headwindWeight: 8,
  tailwindWeight: 0,
};

const solarFlare: EventTemplate = {
  id: "solar_flare",
  name: "Solar Flare",
  description:
    "Intense solar activity in the {target} system is disrupting navigation, reducing ship speed by 30%.",
  category: EventCategory.Hazard,
  duration: 1,
  effects: [{ type: "modifySpeed", value: -0.3 }],
  weight: 9,
  headwindWeight: 0,
  tailwindWeight: 0,
};

const quarantine: EventTemplate = {
  id: "quarantine",
  name: "Quarantine",
  description:
    "A disease outbreak on {target} has halted all passenger traffic to and from the planet.",
  category: EventCategory.Hazard,
  duration: 3,
  effects: [{ type: "blockPassengers", value: 1 }],
  weight: 6,
  headwindWeight: 0,
  tailwindWeight: 0,
};

const fuelShortage: EventTemplate = {
  id: "fuel_shortage",
  name: "Fuel Shortage",
  description:
    "Supply chain disruptions have caused fuel prices to spike by 40% across all stations.",
  category: EventCategory.Hazard,
  duration: 2,
  effects: [{ type: "modifyPrice", value: 0.4 }],
  weight: 7,
  headwindWeight: 8,
  tailwindWeight: 0,
};

// ---------------------------------------------------------------------------
// Opportunity Events (5)
// ---------------------------------------------------------------------------

const emergencyTransport: EventTemplate = {
  id: "emergency_transport",
  name: "Emergency Transport",
  description:
    "An urgent delivery contract pays a flat bonus of $20,000 upon completion.",
  category: EventCategory.Opportunity,
  duration: 1,
  effects: [{ type: "modifyCash", value: 20000 }],
  weight: 6,
  headwindWeight: 0,
  tailwindWeight: 8,
};

const derelictShip: EventTemplate = {
  id: "derelict_ship",
  name: "Derelict Ship",
  description:
    "A derelict cargo shuttle has been found drifting near {target}. It can be salvaged at 30% condition.",
  category: EventCategory.Opportunity,
  duration: 1,
  effects: [],
  weight: 4,
  headwindWeight: 0,
  tailwindWeight: 4,
  requiresChoice: true,
  choices: [
    {
      label: "Salvage the ship",
      effects: [{ type: "modifyCash", value: 0 }],
    },
    {
      label: "Sell for scrap",
      effects: [{ type: "modifyCash", value: 5000 }],
    },
  ],
};

const governmentSubsidy: EventTemplate = {
  id: "government_subsidy",
  name: "Government Subsidy",
  description:
    "A government grant reduces your fleet maintenance costs by 50% for the next 2 turns.",
  category: EventCategory.Opportunity,
  duration: 2,
  effects: [{ type: "modifyPrice", value: -0.5 }],
  weight: 5,
  headwindWeight: 0,
  tailwindWeight: 8,
};

const newColony: EventTemplate = {
  id: "new_colony",
  name: "New Colony",
  description:
    "A new colony on {target} is generating fresh demand for supplies across all cargo types.",
  category: EventCategory.Opportunity,
  duration: 3,
  effects: [{ type: "modifyDemand", value: 0.4 }],
  weight: 6,
  headwindWeight: 0,
  tailwindWeight: 0,
};

const celebrityPassenger: EventTemplate = {
  id: "celebrity_passenger",
  name: "Celebrity Passenger",
  description:
    "A celebrity wants to travel through {target}, doubling passenger revenue on routes to that planet.",
  category: EventCategory.Opportunity,
  duration: 1,
  effects: [
    {
      type: "modifyDemand",
      cargoType: CargoType.Passengers,
      value: 1.0,
    },
  ],
  weight: 7,
  headwindWeight: 0,
  tailwindWeight: 0,
};

// ---------------------------------------------------------------------------
// Flavor Events (5)
// ---------------------------------------------------------------------------

const alienAmbassador: EventTemplate = {
  id: "alien_ambassador",
  name: "Alien Ambassador",
  description:
    "An alien diplomatic envoy has praised your company's service, boosting your reputation by 5.",
  category: EventCategory.Flavor,
  duration: 1,
  effects: [{ type: "modifyReputation", value: 5 }],
  weight: 6,
  headwindWeight: 0,
  tailwindWeight: 0,
};

const galacticFestival: EventTemplate = {
  id: "galactic_festival",
  name: "Galactic Festival",
  description:
    "The Annual Galactic Festival is underway! Fireworks and celebrations across the sector.",
  category: EventCategory.Flavor,
  duration: 1,
  effects: [],
  weight: 10,
  headwindWeight: 0,
  tailwindWeight: 0,
};

const scientificBreakthrough: EventTemplate = {
  id: "scientific_breakthrough",
  name: "Scientific Breakthrough",
  description:
    "Researchers have announced a major breakthrough in faster-than-light communication.",
  category: EventCategory.Flavor,
  duration: 1,
  effects: [],
  weight: 10,
  headwindWeight: 0,
  tailwindWeight: 0,
};

const holovidPremiere: EventTemplate = {
  id: "holovid_premiere",
  name: "Holovid Premiere",
  description:
    "The most anticipated holovid of the year premieres today, drawing crowds across the galaxy.",
  category: EventCategory.Flavor,
  duration: 1,
  effects: [],
  weight: 10,
  headwindWeight: 0,
  tailwindWeight: 0,
};

const historicalDiscovery: EventTemplate = {
  id: "historical_discovery",
  name: "Historical Discovery",
  description:
    "Archaeologists have uncovered ancient alien ruins, generating positive press for your sector. Reputation +3.",
  category: EventCategory.Flavor,
  duration: 1,
  effects: [{ type: "modifyReputation", value: 3 }],
  weight: 7,
  headwindWeight: 0,
  tailwindWeight: 0,
};

// ---------------------------------------------------------------------------
// All templates exported as an array
// ---------------------------------------------------------------------------

export const EVENT_TEMPLATES: EventTemplate[] = [
  // Market
  oreBoom,
  techGlut,
  famineCrisis,
  tradeAgreement,
  economicRecession,
  // Hazard
  asteroidStorm,
  pirateActivity,
  solarFlare,
  quarantine,
  fuelShortage,
  // Opportunity
  emergencyTransport,
  derelictShip,
  governmentSubsidy,
  newColony,
  celebrityPassenger,
  // Flavor
  alienAmbassador,
  galacticFestival,
  scientificBreakthrough,
  holovidPremiere,
  historicalDiscovery,
];
