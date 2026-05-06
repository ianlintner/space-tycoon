import type { FlavorTemplate, TickerCategory } from "./types.ts";
import { FLAVOR_CATEGORIES } from "./categories.ts";

/**
 * Galactic News flavor templates. ~500 entries across 20 categories, ~25 each.
 *
 * Tone notes:
 *   • Serious-corporate categories (politics, corporate, market_mover, science,
 *     cosmic_weather) read like real wire copy.
 *   • Light/satirical categories (sports, celebrity, fashion, food, blotter,
 *     local) lean into dry observation.
 *   • Sci-Fi Homages are clear genre nods (Hitchhiker's, Asimov, Dune, Star Trek,
 *     Blade Runner, Star Wars, Firefly, Alien). Reader-in-on-the-joke voice.
 *
 * Tokens documented in `tokens.ts`.
 */

// ── 1. Galactic Politics ───────────────────────────────────────
const POLITICS: string[] = [
  "{empire} parliament adjourns over tariff vote, third recess this cycle",
  "Trade summit between {empire} and {empire2} ends in 'productive ambiguity'",
  "{empire} ambassador denies treaty leak, denies leak occurred at all",
  "Sector {sector} council votes {n2}-{n} to formally ignore the news",
  "{empire} unveils {n}-point plan to deal with {empire2}; six points classified",
  "Border lane {planet}-{planet2} closed for 'review of paperwork integrity'",
  "{empire} prime minister survives no-confidence vote by {n} votes",
  "Diplomatic pouch from {empire2} returns unopened, still smoking",
  "Mediator declares peace talks 'on a brisk simmer' as week three opens",
  "{empire} coalition wobbles after coalition partner declares it 'fine'",
  "Election monitors clear {empire} ballot; turnout reported at {percent}%",
  "Tariff exemption granted to {commodity} importers after lobbying surge",
  "{empire} senate hearing on AI rights extends into a {n2}th day",
  "Diplomatic scandal: {ceo} caught quoting {empire2} press in {empire} brief",
  "{empire} unveils new flag; designer cites 'fewer hostile angles'",
  "Treaty of {planet} hits article {n2}; lawyers expect 'modest fallout'",
  "Sector audit finds {empire} ministry has been quietly out of pencils for months",
  "{empire} foreign minister cancels trip after passport spelled wrong",
  "Constitutional court rules {commodity} not technically a vegetable",
  "{empire} press secretary clarifies that 'absolutely not' was a tonal choice",
  "{ceo} appointed special envoy to {empire2}; tickets one-way",
  "Public referendum on naming new sector ends with 'Sector McSectorface' barred",
  "{empire} introduces tariff on hope; economists relieved it is enforceable",
  "Joint communique describes ongoing crisis as 'opportunity-shaped'",
  "Census of {empire} citizens completed; results pending appeal by {empire2}",
];

// ── 2. Corporate Earnings ──────────────────────────────────────
const CORPORATE: string[] = [
  "{company} posts {percent}% revenue growth on strong {commodity} demand",
  "{company} narrows quarterly loss; CEO {ceo} cites 'disciplined optimism'",
  "{company} announces hostile bid for rival; rival announces stronger coffee",
  "Board reshuffle at {company}; three directors departing for 'health reasons'",
  "{company} reports record {commodity} throughput across {sector} routes",
  "Shareholders approve {company} buyback worth {credits}",
  "{company} delays earnings call citing 'unforeseen but spreadsheet-shaped issue'",
  "{company} CFO replaced after Q2 surprise; replacement also surprised",
  "{ceo}'s compensation package draws fire; {ceo} draws fire elsewhere",
  "{company} merger with {company} hits regulator wall in {empire}",
  "{company} pays {credits} fine for 'aggressive but technically legal scheduling'",
  "{company} guidance raised; analysts raise eyebrows in synchrony",
  "{company} writes down {credits} of {commodity} inventory after market rotation",
  "Dividend held flat at {company}; investors held breath, then exhaled politely",
  "{company} carbon-trade desk closes after carbon refuses to cooperate",
  "{company} restructures middle management; middle management restructures résumés",
  "{company} introduces 'value tier' service; tier ends three meters short of orbit",
  "Activist investor builds {percent}% stake in {company}, vows 'gentle fury'",
  "{company} confirms layoffs at {planet} division; severance offered in {commodity}",
  "{company} chair {ceo} steps down 'to spend more time with portfolio'",
  "Whistleblower at {company} alleges accounting performed 'inventively'",
  "{company} opens new HQ on {planet}; chairs alone cost {credits}",
  "{company} pulls full-year guidance; partial guidance confined to lobby",
  "{company} announces {commodity} subscription service; cancellation requires lawyer",
  "Audit committee at {company} completes review; review now under review",
];

// ── 3. Market Movers ───────────────────────────────────────────
const MARKET_MOVER: string[] = [
  "{stock} jumps {percent}% on {commodity} contract win",
  "{stock} slides {percent}% after disappointing {commodity} guidance",
  "Volume surges in {stock}; {percent}% above twelve-cycle average",
  "Analysts at {empire} bank double-upgrade {stock}, citing 'general vibe'",
  "{stock} hits new {n2}-cycle high amid sector rotation into transport",
  "Short interest in {stock} climbs to {percent}% of float",
  "Hedge fund {ceo Fund} reveals {percent}% position in {stock}",
  "{stock} falls below moving average; chartists murmur ominously",
  "Index of {sector} freight haulers gains {percent}% week-on-week",
  "{commodity} futures spike on {planet} mine outage",
  "Spread between {commodity} and {commodity} narrows to multi-cycle low",
  "{stock} dual-listed on {empire} exchange after compliance review",
  "Insider sale of {credits} in {stock} disclosed by chief operations officer",
  "{stock} suspended for {n} hours pending material announcement",
  "Bond yields on {empire} sovereigns tick up {percent} basis points",
  "{stock} dividend cut to zero; CEO {ceo} cites 'temporal cashflow'",
  "Margin call cascade hits {stock} after {commodity} flash crash",
  "Initial public offering of {company} priced at upper band, raises {credits}",
  "Activist letter sends {stock} up {percent}% in pre-market trading",
  "Quant strategy 'Boltzmann-7' allegedly drove {percent}% of {stock} volume",
  "Gold-pressed latinum benchmark steady; nobody asks why it still exists",
  "Dark pools see record activity in {stock} ahead of merger vote",
  "{stock} added to {empire} sector index, replacing bankrupt {company}",
  "Volatility index across {sector} freight names climbs to multi-cycle high",
  "{stock} closes flat after intraday {percent}% swing 'on no news whatsoever'",
];

// ── 4. Crime & Piracy ──────────────────────────────────────────
const CRIME: string[] = [
  "Customs seize {tonnage} of contraband {commodity} near {port}",
  "Pirate raid on {planet} convoy nets {credits}, two {adj} captives",
  "{empire} fleet patrol disrupts smuggling ring in {sector}",
  "Bounty hunter guild posts {credits} reward for {ceo} after warrant issued",
  "{port} authorities arrest {n2} in dawn raid on counterfeit {commodity} ring",
  "Heist at {company} vault on {planet}; escape vehicle 'borrowed' from staff",
  "Pirate broadcast jams {sector} freight lanes for {n} cycles",
  "{empire} coast guard intercepts {tonnage} of restricted {commodity}",
  "Mob trial on {planet} ends in mistrial; jury reportedly relieved",
  "Insurance fraud at {company} estimated at {credits}; perpetrator clumsy",
  "Customs robot rebooted three times during {port} contraband sweep",
  "Cyber-heist drains {credits} from {company} treasury via 'helpful' chatbot",
  "Black-market {commodity} prices double on {planet} after sting operation",
  "{ceo} questioned over {commodity} kickback scheme, declines coffee politely",
  "Drug ring on {planet} bust nets {tonnage} of synthetic euphoriants",
  "{empire} marshals raid {planet} cantina; cantina found largely cantina-shaped",
  "Pirate king of {sector} declares amnesty week, accepts {commodity} in tribute",
  "Heirloom {commodity} smuggled past {port} scan in fake {commodity} crate",
  "Bounty filed against captain of vessel last seen 'departing rapidly'",
  "{empire} ministry confirms {n} indictments in {company} bribery probe",
  "Forged customs stamps from {planet} traced to ex-{empire} bureaucrat",
  "Catastrophic insurance claim filed by {company} after 'mysterious' fire",
  "Asteroid prospector arrested for filing claim on a moon",
  "{port} police recover {credits} of stolen art, none of it requested back",
  "Three indicted in {empire} pension fund skim; total losses {credits}",
];

// ── 5. Science & Tech ──────────────────────────────────────────
const SCIENCE: string[] = [
  "{empire} researchers claim FTL coil efficiency record, peer review pending",
  "{company} R&D unveils new fusion bottle; bottle still bottle-shaped",
  "Quantum tunneling breakthrough at {planet} institute reduces ping by {percent}%",
  "Terraforming progress on {planet} reaches stage {n}, atmosphere now breathable-ish",
  "{empire} funds antimatter containment study; classified, then unclassified, then reclassified",
  "Robotics team on {planet} demonstrates self-replicating drone swarm — controllably",
  "Cold fusion trial at {empire} lab produces heat, light, and a moderate fire",
  "Subspace relay network expanded across {sector}, latency down {percent}%",
  "{empire} bioethics panel debates uplift of {adj} cephalopods",
  "Deep-space probe {n} returns data after {n2}-year transit; mostly static",
  "Algorithm at {company} trims fuel use {percent}% by 'firmly suggesting' shorter routes",
  "{empire} unveils nanofabric armor; weighs {tonnage}, defeating original purpose",
  "Solar sail trial at {system} reaches half-c, then politely turns back",
  "{empire} confirms quantum computer factored {n}-digit prime ahead of schedule",
  "AI alignment workshop at {planet} concludes, AI takes minutes",
  "Cryostasis trial revives {n2} volunteers; {n} report mild dreaming",
  "{company} patents fold-space corridor; lawyers fold space, then unfold it",
  "Genome of {planet} fungus published; {percent}% overlap with {empire2} cuisine",
  "Plasma engine test on {planet} produces {percent}% efficiency gain, {n} singed eyebrows",
  "Researchers at {empire} confirm dark matter exists, definitely, this time",
  "{empire} space telescope sees back to first {n2} million years; calls it dim",
  "{company} R&D reveals room-temperature superconductor, shipping room not included",
  "Holographic compression standard adopted by {sector} after {n}-year fight",
  "Gravity wave observatory on {planet} reports background hum 'too cheerful'",
  "{empire} releases open-source jump drive plans; lawyers also open-sourced",
];

// ── 6. Sports ──────────────────────────────────────────────────
const SPORTS: string[] = [
  "{empire} routs {empire2} 18-3 in zero-G ball semifinal",
  "Asteroid racing championship returns to {sector} after {n}-cycle suspension",
  "{empire} gravball star {ceo} signs record contract with {empire2} club",
  "{planet} stadium expansion approved; capacity now {n2},000",
  "Underdog squad from {planet} upsets reigning {empire} champions",
  "Doping scandal rocks {sector} league after {commodity} traces found",
  "Esports tourney on {planet} draws {n2} million viewers, three lawsuits",
  "{empire} league cancels mid-season after sponsor goes bankrupt",
  "Coach {ceo} fired despite winning record; cites 'creative differences with cosmos'",
  "Vacuum-fencing makes Olympic provisional list after {n} cycles of lobbying",
  "{empire} fans riot after referee call; referee files for hazard pay",
  "Robot wrestling league suspends {n} bots for unsportsmanlike conduct",
  "{planet} hosts inaugural microgravity marathon; finish line currently in orbit",
  "{empire} swimmer {ceo} breaks zero-g freestyle record by {percent}%",
  "Trade deadline brings {n2} player swaps across {sector} hockey league",
  "Athletics committee rules {commodity} energy drinks 'borderline acceptable'",
  "{empire} chess champion narrowly defeats AI again, claims 'felt different this time'",
  "Stadium pie thrower at {planet} match earns lifetime ban, {n}-cycle book deal",
  "Surfing league launches plasma division on {system}; safety waivers thicken",
  "{empire} squash federation merges with raquet federation, {empire2} unimpressed",
  "Boxing match on {planet} ends in draw after both fighters apologize",
  "Sled racing returns to {planet}; sleds, alarmingly, mostly self-driving",
  "{empire} fencing star {ceo} retires undefeated, with {n2} ribbons",
  "Drone derby on {planet} attracts crowds, three rogue drones still missing",
  "Goaltender {ceo} traded for two prospects and a shipment of {commodity}",
];

// ── 7. Celebrity & Media ───────────────────────────────────────
const CELEBRITY: string[] = [
  "Holovid star {ceo} denies third divorce in weekly statement",
  "Pop sensation {ceo} releases album recorded entirely in low orbit",
  "{ceo} spotted dining with rival {ceo2}; PR teams update talking points",
  "Reality show {n}-Body Problem renewed for fourth season on {empire} network",
  "{ceo} apologizes for comments about {empire2}; later apologizes for the apology",
  "{company} executive {ceo} appears on talk show, says nothing of note for {n} hours",
  "Director of 'Vacuum Heart' announces sequel; lead actor still missing in space",
  "{ceo}'s memoir tops bestseller list in {empire}; ghost-writer credited as 'mostly'",
  "Influencer feed on {planet} crashes after {n2} million simultaneous yawns",
  "Music streamer {company} pays artists {credits} after {n}-cycle dispute",
  "Galactic award show host {ceo} makes joke about {empire}, reservations cancelled",
  "Tabloid claims {ceo} cloned, {ceo} denies, both {ceo}s deny clone",
  "Documentary on {company} executives 'baroque, terrifying, also long'",
  "{empire} broadcaster bans song deemed 'subversively catchy'",
  "Magazine names {ceo} 'Most Reluctantly Respected' for third year",
  "Variety show on {planet} cancelled after {n} contestants vanish in week one",
  "{ceo} pet sentient kelp accepts honorary doctorate from {empire} university",
  "Streaming wars heat up: {company} debuts ad-tier 'with mild surveillance'",
  "{ceo} announces tour spanning {n2} planets; tour bus is also a yacht",
  "Late-night host roasts {empire} cabinet; cabinet roasts back via official channels",
  "{ceo} buys {company} just to fire one critic; analysts call it 'committed'",
  "Sequel to 'Halls of Vorga' delayed again; halls reportedly still being painted",
  "Reality couple {ceo} and {ceo2} renew vows on live broadcast, ratings flat",
  "{empire} broadcaster apologizes for typo that started a minor war",
  "Holographic concert on {planet} draws record crowd, {n} fainted from refractive joy",
];

// ── 8. Cosmic Weather ──────────────────────────────────────────
const COSMIC_WEATHER: string[] = [
  "Class-{n} ion storm forecast over {system} by next cycle",
  "Solar flare warning issued for {planet}; communications expected patchy",
  "{empire} weather service: gravitational tides {percent}% above normal in {sector}",
  "Comet ML-{n2} grazes {planet} orbit; observatory reports 'spectacular, mostly'",
  "Magnetic reversal predicted on {planet} within {n} cycles, compasses unhappy",
  "Cosmic ray surge expected to peak Tuesday across {sector} lanes",
  "{empire} space weather bureau issues navigational hazard for {system}",
  "Aurora forecast on {planet}: vivid, possibly haunting",
  "Subspace turbulence alert for jump corridor between {planet} and {planet2}",
  "Hypernova candidate identified {n2} parsecs out; arrival in {n2} millennia",
  "Asteroid swarm grazes {planet} atmosphere; {n} new craters logged",
  "Meteor shower expected over {planet} hemisphere, peak rate {n2}/hour",
  "Solar wind forecast: brisk, occasionally insolent",
  "Black hole merger detected in {sector}; tides briefly philosophical",
  "{empire} bureau confirms gravitational lensing event near {system}",
  "Cosmic background hum increased by {percent}% in {sector}, scientists puzzled",
  "Pulsar {n} timing drift detected; maintainers issue patch",
  "Coronal mass ejection grazes {planet}; auroras visible from sub-orbit",
  "Snow forecast on Olympus Domes, {planet}; {percent}% accumulation expected",
  "{empire} forecasts ten cycles of suspiciously perfect weather; emergency drills planned",
  "Tidal anomaly raises {port} sea level {percent}cm; insurers blink slowly",
  "Radio blackout expected across {sector} from solar disturbance",
  "Atmospheric pressure on {planet} drops {percent}%, residents 'feel it in knees'",
  "Brown dwarf flyby alters {system} orbits by {percent}%, calendars adjusted",
  "Eclipse on {planet} draws record tourism; vendors run out of {commodity}",
];

// ── 9. Local Planet News ───────────────────────────────────────
const LOCAL: string[] = [
  "{port} traffic council unveils new pedestrian sky-bridge",
  "{planet} mayor opens new transit hub two cycles late, three over budget",
  "Civic statue of {ceo} unveiled at {port}; pigeons unimpressed",
  "{port} farmer's market doubles in size; vendors triple in arguments",
  "{planet} water rationing lifted after {n} cycles of {commodity} importation",
  "New library opens in {port} downtown, named after a deceased benefactor",
  "{port} bus route 7 rerouted after sentient potholes refuse mediation",
  "{planet} school board approves new curriculum, parents tentatively pleased",
  "Elderly resident of {port} celebrates {n2}-cycle birthday, attributes longevity to spite",
  "Power outage on {port} block resolved after {n} hours, kettle saved",
  "{port} street fair this weekend; {commodity} festival expected to disappoint mildly",
  "{planet} hospital adds new wing dedicated to {empire} settlers",
  "Pothole repair on {port} main strip enters phase {n}; locals adjust commute",
  "Local pet on {planet} returns home after {n2} cycles missing, brings friends",
  "{port} council adopts new recycling bins; bins recycled from old recycling bins",
  "Volunteer cleanup at {planet} canal removes {tonnage} of debris, two oddities",
  "{port} elementary school wins regional debate trophy, brings home {commodity}",
  "Construction at {port} intersection enters {n2}th week, drivers philosophical",
  "{planet} farmer's almanac predicts pleasant cycle, ignores all evidence",
  "{port} community center reopens after fire; smell of {commodity} still mild",
  "Local sentient hedge wins {planet} garden contest by default",
  "{port} parade cancelled after lead float experiences existential lag",
  "{port} library hosts {commodity} sculpture exhibit, attendance moderate",
  "Mayor of {port} apologizes for jokes during ribbon cutting, ribbon survives",
  "{planet} weather predicts rain; rain predicts {planet} weather",
];

// ── 10. Health & Medical ───────────────────────────────────────
const HEALTH: string[] = [
  "Longevity clinic opens on {port}; package starts at {credits}",
  "{empire} health authority recalls {commodity} batch after {n2} reports of mild glow",
  "Vaccination drive in {sector} reaches {percent}% coverage milestone",
  "Hospital on {planet} pioneers neural repair; success rate now {percent}%",
  "Outbreak of {adj} fever on {planet} contained within {n} cycles",
  "{empire} medical board licenses uplift therapy for {commodity} workers",
  "Genetic counseling lines on {port} backlog now {n2} cycles deep",
  "Telemedicine network spans {sector}; latency reduces by {percent}%",
  "{company} pharma subsidiary recalls painkiller; replacement also being recalled",
  "Surgeons on {planet} debut zero-g spine repair; patient {percent}% taller",
  "Galactic flu season opens; {empire} clinics report shortage of {commodity}",
  "{empire} ban on cloning amended after lawyers cloned the previous ban",
  "Mental health awareness week in {sector}; productivity briefly drops {percent}%",
  "Dental implant breakthrough at {planet} institute; chewing efficiency up {percent}%",
  "Eye surgery on {planet} gives recipients {adj} vision, debate ongoing",
  "Herbal remedy on {port} found to be {percent}% placebo, {percent}% paint",
  "{empire} hospitals adopt AI triage; queue still long, just better-organized",
  "Birthrate on {planet} ticks up {percent}%; daycare waitlists explode",
  "Robotics-assisted surgery succeeds on {n2}th attempt at {planet} clinic",
  "Cosmic-radiation-induced rash sweeps {sector}; cure: more sun, less radiation",
  "{empire} surgeons graft sentient kelp into volunteer's spine; volunteer pleased",
  "Public health study finds {percent}% of {planet} residents have not slept properly",
  "{commodity} now classified as 'mostly therapeutic' by {empire} board",
  "Pediatric ward on {planet} opens new wing for {adj} aliens",
  "{port} pharmacist replaces label printer, errors drop {percent}%",
];

// ── 11. Religion & Philosophy ──────────────────────────────────
const RELIGION: string[] = [
  "Cult of the Frozen Logician schisms over heat-death debate",
  "{empire} interfaith council adds {n}th deity, removes one nobody worshipped",
  "Pilgrimage season on {planet} opens; capacity capped at {n2},000",
  "{empire} monastery on {planet} debates whether AI souls qualify for {commodity}",
  "Galactic ethics conference adjourns after {n} cycles, no decisions made",
  "Priest {ceo} excommunicated for selling indulgences denominated in {commodity}",
  "Order of the Slow Computation accepts new initiates on {port}",
  "{empire} census records {percent}% increase in 'spiritual but unaffiliated'",
  "Doomsday cult relocates predicted apocalypse to following Tuesday",
  "{empire} church of the Algorithm publishes update {n}.{n2}, schism imminent",
  "Theology student on {planet} proves God's existence in {n} steps, last step shaky",
  "{empire} shrine to {commodity} reopens after restoration, smell stronger than ever",
  "{port} ethical philosophy department shrinks {percent}%, students unrepentant",
  "Clergy on {planet} debate whether bots can take confession; bots noncommittal",
  "Annual fast on {planet} ends with feast that breaks last cycle's record",
  "{empire} druids release white paper on photosynthetic prayer techniques",
  "{port} church bells tolling out of sync; congregation oddly united",
  "Order of the Empty Beaker celebrates founding {n2}-cycle ago, glasses raised dryly",
  "Book of Predictions translated; predictions remain unfailingly vague",
  "{empire} imam delivers sermon on {commodity} ethics, audience nods politely",
  "Cult on {planet} adopts new symbol; symbol coincidentally trademarked",
  "Theological journal on {port} publishes paper titled 'Maybe?', cited {n2} times",
  "{empire} parliament debates separating {commodity} subsidy from religious tax",
  "Trappist colony on {planet} releases brewing log, surprisingly racy",
  "Ascetic order on {port} divests of all material possessions, except {commodity}",
];

// ── 12. Odd Crime Blotter ──────────────────────────────────────
const BLOTTER: string[] = [
  "{port} man arrested attempting to mail self to {planet}",
  "Resident of {port} tries to pay parking fine in {commodity}, arrested politely",
  "Two on {planet} cited for racing rental loaders down a service tube",
  "{port} business reports break-in; intruder left {credits} cash by accident",
  "Burglar on {planet} fell asleep mid-heist, woke to coffee and {empire} police",
  "{port} officials warn against feeding {adj} sentient pigeons synthetic bread",
  "Driver on {planet} cited for {percent}% over speed limit in school zone",
  "Stolen {commodity} returned to {port} shop with apology note and gift card",
  "Suspect on {planet} disguised as council statue evaded capture for {n} cycles",
  "{port} police: 'No, the alien did not eat your homework, please stop calling'",
  "Bicycle theft ring on {planet} rolled up after suspect rode to station",
  "{port} cashier subdues robber with sandwich; sandwich survives",
  "Two cited for performing impromptu opera in {planet} restricted airspace",
  "{port} woman files report against own past self, case closed",
  "Loiterer outside {planet} bakery turns out to be undercover food critic",
  "Resident of {port} accidentally adopts riot bot, names it 'Spunky'",
  "{port} police remind public: drone delivery services are not a taxi for cats",
  "{planet} man arrested for selling moon, claims he meant a different moon",
  "Pickpocket on {planet} returns wallet with detailed financial advice",
  "{port} police chase suspect at jogging speed for {n2} blocks, suspect tires first",
  "Suspect attempts escape via shopping cart, achieves moderate velocity",
  "{port} residents report 'dignified looking thief' wearing top hat at robbery",
  "{port} bakery robbed of pastries; suspect described as 'crumbly'",
  "Driver on {planet} ticketed for U-turn through wedding procession",
  "{port} parking dispute settled by {n}-round dance-off, both fined",
];

// ── 13. Food & Cuisine ─────────────────────────────────────────
const FOOD: string[] = [
  "Three-star reviewer pans {port} restaurant: 'tastes of regret'",
  "{planet} chef {ceo} wins regional cup with synthetic {commodity} dish",
  "{port} food festival sells out of {commodity} skewers in {n} hours",
  "{empire} diet trend: cut all carbs, add more {commodity}, drink more water",
  "Restaurant on {planet} closes after {n2} cycles; landlord raises rent {percent}%",
  "{ceo}'s new cookbook 'How to Boil Water in Vacuum' enters bestseller list",
  "{port} health inspector closes {n} kitchens, cites 'enthusiastic ingredients'",
  "Galactic fast food chain {company} debuts {commodity} burger, supply chain creaks",
  "{planet} oyster bar reopens after {commodity} shortage; oysters relieved",
  "Chocolate alternatives gain ground in {empire}; cocoa lobby threatens {n} things",
  "Critic visits {port} taqueria, leaves reviewing it as 'a place to be'",
  "{empire} bans synthetic {commodity} cheese in pizza, pizzeria community shrugs",
  "Tasting menu at {planet} restaurant includes {n} courses, {n} apologies",
  "{port} brewery wins prize for ale aged in vacuum, tastes 'mostly like ale'",
  "Vegan butcher opens on {planet}; recipe inspires deep philosophical questions",
  "{empire} food truck on {port} draws {n2} block line, queue creates own micro-economy",
  "Recipe for grandma's {commodity} stew leaks online, grandma issues press release",
  "{port} fine dining scene now requires reservation, ID, blood type, and patience",
  "Regional dish from {planet} declared 'tolerable' by visiting {empire} delegation",
  "Coffee shop on {port} introduces {n}-shot espresso, requires waiver",
  "{ceo}'s pop-up dinner sells out in {n} minutes; tickets resold for {credits}",
  "{empire} bans imitation {commodity} from being labelled real {commodity}",
  "{port} bakery drops bagel from menu; protests escalate to {n2} signatures",
  "{empire} cuisine wins galactic award for 'least frightening texture'",
  "Chef on {planet} accidentally invents new spice; bottles flying off shelves",
];

// ── 14. Real Estate & Megastructures ───────────────────────────
const REALESTATE: string[] = [
  "Megastructure permit issued for orbital ring above {planet}",
  "{port} luxury tower announces residency at {credits} per unit",
  "Asteroid claim on {planet} system goes for record {credits}",
  "{empire} approves construction of {n}-tier arcology on {planet}",
  "{port} home prices climb {percent}% year-over-year, buyers apoplectic",
  "Hyperloop hub at {port} clears final permits; objections filed in triplicate",
  "Vacant {company} office on {planet} sells for {credits}, smells faintly of decisions",
  "Skybridge connecting {port} towers wins design award, fails inspection",
  "{empire} announces new spaceport on {planet}; existing spaceport offended",
  "Co-living scheme on {port} promises {percent}% lower rent, {percent}% more drama",
  "Listing on {port} described as 'cozy'; cozy means structural concerns",
  "{empire} zoning board approves vertical farm overlooking {port} downtown",
  "Repossessed orbital habitat sold at auction for {credits}",
  "{port} building boom pushes hardhat shortage into {n}th cycle",
  "Land developer {ceo} unveils 'eco-friendly' moonbase featuring lawns",
  "{empire} new town charter approves naming rights to {company}",
  "Condo board on {planet} bans noise, joy, hover-pets in single 4 a.m. vote",
  "Skyscraper on {port} fails wind test in vacuum, engineers nod knowingly",
  "{empire} luxury resort breaks ground on {planet}; ground breaks back",
  "{port} mall reopens with new {commodity} kiosks; security buys earplugs",
  "Tycoon {ceo} buys entire moon, says 'collateral'",
  "{empire} reveals {n}-cycle plan to convert asteroid belt to housing",
  "Renters association on {port} formed; first vote, by {n2} margin, demanded snacks",
  "Estate sale on {planet} clears {credits} of antique {commodity}",
  "Penthouse on {port} listed for {credits}, includes {n} ghosts at no extra charge",
];

// ── 15. Travel & Tourism ───────────────────────────────────────
const TRAVEL: string[] = [
  "{planet} resort posts record {percent}% occupancy this cycle",
  "Cruise liner Voidsong delayed {n} cycles after engine 'sneezed'",
  "{empire} tourism ministry launches campaign: 'visit {planet}, eventually'",
  "Backpacker route through {sector} draws {percent}% more travelers year-on-year",
  "{port} spaceport adds direct service to {planet}, three layovers eliminated",
  "Adventure tourism on {planet} now requires {n}-cycle waiver",
  "{empire} hotel chain {company} adds {n2} properties this cycle",
  "Glamping on {planet} canyon rim wins galactic 'serenity, mostly' award",
  "{ceo}'s travel show debuts; first episode mocks {empire} cuisine, again",
  "Visa fees waived between {empire} and {empire2} for {n} cycles",
  "Cruise stranded near {system} after captain forgets fuel; passengers patient",
  "Resort on {planet} closes for renovations, customers asked to bring patience",
  "{port} transit guide now in {n2} languages, none of them spoken by tourists",
  "Backpacker association on {planet} releases tip sheet, mostly about boots",
  "{empire} tour guides unionize, demand {percent}% pay raise and respect",
  "Eco-resort on {planet} rebrands as 'less eco-resort' after audit",
  "Public beach on {port} expanded by {percent}%, sea grumbles politely",
  "Travel insurance claims spike after {commodity} festival on {planet}",
  "Sky lift on {planet} stuck mid-cycle, tourists view ad-supported sunset",
  "{empire} coast guard rescues {n2} from {commodity} festival flotilla",
  "Tourist train through {sector} adds dining car, dining car adds prices",
  "Honeymoon package on {planet} includes {n} sunsets, two suns",
  "{port} airport adds robot bartenders, queue paradoxically longer",
  "Tour group reports being charmed by {planet} customs officer's small talk",
  "Stargazing pad on {planet} listed as 'best place to feel small', exceeds expectations",
];

// ── 16. Fashion & Trends ───────────────────────────────────────
const FASHION: string[] = [
  "Anti-grav heels make comeback on {port} runway week",
  "{empire} fashion editor declares {commodity} the new black, again",
  "{ceo}'s clothing line draws ridicule then sells out in {n} hours",
  "{port} runway show features {adj} biofiber jackets, audience applauds politely",
  "{empire} influencer endorses {commodity} skin treatment, dermatologists groan",
  "Vintage {commodity} jewelry surges in resale, prices up {percent}%",
  "Hoverboot rental services launch on {planet}, ankles relieved",
  "{empire} fashion police actually exist now, fine for poor color coordination",
  "Couture house on {port} debuts collection inspired by {empire2} graveyard art",
  "{ceo} wears same outfit twice, internet briefly malfunctions",
  "{empire} dress code permits casual Friday on Wednesdays now",
  "{commodity} sneakers reissue; collectors line up for {n2} cycles",
  "{planet} street style trend: shoulder pads big enough to land craft on",
  "Wedding dress made of recycled {commodity} ends up on permanent display",
  "Tailor {ceo} sued by {ceo2} over identical capes, settles in cape",
  "{empire} style guide updates after {n2}-cycle hiatus; lapels now legal again",
  "Hatmaker on {planet} debuts hat that doubles as comm device, fall risk noted",
  "{empire} fashion week pushed back {n} cycles after delivery of fabric was lost",
  "Knit jumper trend returns; analysts cite {percent}% rise in 'cozy economy'",
  "{ceo} sells personal wardrobe at auction, raises {credits} for charity",
  "Designer on {planet} apologizes for collection 'mocking gravity'",
  "{commodity} accessory of the cycle: ear-cuff that hums {empire} anthems",
  "Eyewear brand on {port} introduces specs that judge readers softly",
  "{port} streetwear collective declares jeans dead; jeans hold press conference",
  "{empire} ambassador's silk gown praised; {empire2} declares it 'too silky'",
];

// ── 17. Education & Academia ───────────────────────────────────
const ACADEMIA: string[] = [
  "{empire} University paper retracted over fabricated stardata",
  "Galactic ranking puts {empire} top in physics, last in cafeteria food",
  "{port} library acquires {n2} ancient {commodity} scrolls, smell included",
  "Student loans on {planet} now expressed in {commodity}; nobody happy",
  "{empire} professor {ceo} tenured after {n2} cycles, briefly considered leaving anyway",
  "Gap-cycle programs to {planet} surge {percent}% as parents quietly relieved",
  "Academic strike at {empire} system halts research and complaints",
  "{empire} school board approves {commodity} unit; parents petition for less {commodity}",
  "Online course in 'How to Pay Attention' from {planet} institute reaches {n2}M",
  "{ceo}'s honorary doctorate from {empire} university revoked, then awarded again",
  "Spelling bee on {planet} won by AI; medal handed back politely",
  "{empire} university launches debate on whether debate is necessary",
  "Conference on {commodity} draws {percent}% more attendees than presenters",
  "{empire} institute closes department of common sense for budget reasons",
  "Galactic dictionary adds {n2} new words including 'hyperflug' and 'meh'",
  "Student protest at {planet} campus achieves cafeteria reform, world peace tabled",
  "Researcher publishes paper proving paper publishing harms research",
  "{empire} archive digitizes oldest known invoice; still unpaid",
  "{port} school district flips schedule by {percent}% to test theory",
  "Galactic spelling bee finalist eliminated on the word 'finalist'",
  "{empire} education ministry reduces homework by decree, productivity up {percent}%",
  "Robotics fair on {planet} ends in {n} runaway robots; one elected to council",
  "{empire} academy adds {commodity} studies; lab coats not yet stained",
  "{port} chess team disqualified for {percent}% telepathy",
  "Citation index of {ceo} climbs {percent}%, mostly self-citations",
];

// ── 18. Xenobiology ────────────────────────────────────────────
const XENOBIOLOGY: string[] = [
  "Researchers describe new sentient mold on {planet}",
  "{empire} survey logs {n2} new microorganisms in {sector} dust clouds",
  "Mating call of {planet} cave eel decoded; mostly indignation",
  "Conservation effort on {planet} saves {percent}% of last vine snake population",
  "Newly observed {planet} fungus glows in time with the local pulsar",
  "{empire} biologist {ceo} reports moth population recovering on {port}",
  "Translation device for {planet} herd beasts works {percent}% of the time",
  "Endangered list adds {n2} species after {empire} habitat survey",
  "Aquatic life on {planet} found to follow regular meeting schedule",
  "Rogue genetic experiment on {planet} produces friendly hybrid; adopted by lab",
  "{empire} zoo welcomes new {adj} pup, names contest open",
  "Migratory route of {planet} sky whales redirected by {percent}%, theories abound",
  "Insectoid hive on {planet} grants visiting researchers honorary worker status",
  "{empire} botanists isolate {commodity} from {planet} lichens, smells like home",
  "Apex predator on {planet} discovered to be photosynthetic, ecologists shrug",
  "Wildlife corridor through {sector} approved over {empire} agriculture's protests",
  "{port} researchers attach trackers to {n2} sentient slimes; slimes ambivalent",
  "Scientists confirm {planet} eel can pun in three languages",
  "{empire} agency confirms {planet} sky-snail is not, in fact, a meteor",
  "Migration pattern of {planet} song-bats includes {n}-cycle harmonic jam session",
  "Researcher claims {planet} sentient kelp filed grievance with HR",
  "{empire} releases breeding plan for endangered {adj} mammal on {port}",
  "Pet trade on {planet} cracks down on illegal {commodity} ferrets",
  "Marine biologists on {planet} reclassify squid as 'committee'",
  "{ceo}'s pet sentient palm signs autograph, prints sold for {credits}",
];

// ── 19. Obituaries & Tributes ──────────────────────────────────
const OBITUARY: string[] = [
  "Industrialist {ceo} eulogized as 'tireless and largely tolerable'",
  "{empire} statesman {ceo} dies at {n2}, leaves library of {n2}M scrolls",
  "Veteran captain {ceo} of the {company} freight fleet passes after {n2} cycles aloft",
  "Memorial service for {ceo} held at {planet}; attendance overflowed orbit",
  "{empire} cultural figure {ceo} remembered for 'singular, occasional' charm",
  "Professor emeritus {ceo} of {planet} institute dies; chair to be retired",
  "{ceo} pioneer of {commodity} engineering, passes; legacy {n2} patents",
  "Journalist {ceo} known for asking inconvenient questions has died",
  "Composer {ceo}'s final symphony premiered posthumously in {empire} hall",
  "{empire} founding member {ceo} eulogized as 'a complicated old hand'",
  "Athlete {ceo} retired hero, championships {n}, anecdotes uncountable",
  "{ceo} explorer first to map {sector} fringe, has died at {n2}",
  "{empire} ambassador {ceo}, who once thrown shoe at podium, dies at {n2}",
  "Ex-board member of {company} {ceo} passes; obit lists {n2} affiliations",
  "{ceo}, sentient kelp activist, mourned by {percent}% of relevant ecosystems",
  "{empire} actor {ceo}'s farewell tour cut short; tour bus signs petition",
  "{ceo} who patented the breakfast sandwich licenses one final smile",
  "{empire} chess grandmaster {ceo} defeats death after {n2} delays",
  "Engineer {ceo} of the original {planet} mag-rail, has passed",
  "Author of 'Quiet Years on {planet}' has quietly stepped behind the curtain",
  "{ceo}, longtime mayor of {port}, leaves council bench in mourning",
  "{empire} general {ceo}, who once misplaced a fleet, dies at {n2}",
  "{ceo} of {company}'s legendary marketing run laid to rest with last billboard",
  "Holovid critic {ceo} dies; final review described life as 'three stars, one moon'",
  "{empire} historian {ceo}, encyclopedic in life, indexed in death",
];

// ── 20. Sci-Fi Homages ─────────────────────────────────────────
const HOMAGE: string[] = [
  // Hitchhiker's
  "Towel sales up {percent}% on {planet} ahead of Galactic Hitchhiker's Day",
  "Survey finds {percent}% of {empire} citizens consider their planet 'mostly harmless'",
  "{port} authorities remind travelers that, statistically, the answer is 42",
  "Improbability drive prices fluctuated wildly today; analysts blame finite probability",
  "Vogon Constructor Fleet detected near {system}; locals advised to ignore poetry recitals",
  "{company} debuts in-flight beverage 'almost, but not quite, entirely unlike tea'",
  "Babel fish supply rationed on {port} after translator union strike",
  "{ceo} described as 'about as inconspicuous as a brick at a glass convention'",
  // Asimov
  "Psychohistorical model predicts {percent}% chance of {empire} collapse within {n2} centuries",
  "Three Laws Robotics violation reported on {planet}; investigation pending",
  "{empire} Foundation conference debates Seldon Plan revisions over snacks",
  "Mule sighting on {sector} fringe ruled 'almost certainly unrelated'",
  // Dune
  "{commodity} flow disrupted on {planet}; trade guilds concerned",
  "Spice mélange futures trading suspended on {sector} exchange",
  "Sandworm advisory issued for {planet} dunes, again",
  "{empire} herald repeats: he who controls the {commodity} controls the universe",
  // Star Trek
  "Sensors detect unusual readings near {planet}; scientists puzzled",
  "{empire} Prime Directive review committee adjourned indefinitely",
  "Holodeck malfunction on {planet} resolved by reading actual book",
  "Tribble outbreak quarantined on {port}; furry quotient up {percent}%",
  // Star Wars
  "{ceo} dismisses rumors of 'ancient religion' as 'a hokey old myth'",
  "{empire} senate approves emergency powers for {n} cycles, definitely temporarily",
  "Smuggler {ceo} insists Kessel-equivalent run completed in {n} parsecs",
  // Blade Runner
  "{planet} weather forecast: continuous rain. Again",
  "{company} replicant program suspended pending {n2}-question test review",
  "Origami unicorn left at scene of {ceo}'s farewell speech",
  // Alien
  "{company} promises this time the cargo hold is, quote, 'definitely empty'",
  "Hygiene inspectors leaving {planet} bay {n2} early; nobody asked why",
  // Firefly
  "{ceo} insists their cargo is 'just legitimate goods, shiny'",
  "{port} preacher on {planet} reminds congregation: cannot stop the signal",
  // 2001
  "{company} AI module reports it 'cannot do that' for {n} cycles running",
  "Monolith detected near {planet} moon; tourism board orders gift shop",
  // Misc
  "{empire} probe inscribed with greeting in {n2} languages, including snark",
  "Improbable encounter at {port} bar: same captain, three timelines",
  "{ceo} reportedly 'long, dead, and slightly cross about it' after fan event",
  "Galactic survey of meanings of life narrows answer to '42, possibly tea'",
];

// ---------------------------------------------------------------------------
// ANOMALY (25 templates) — Stellaris/MOO2/Trek-style spatial phenomena
// ---------------------------------------------------------------------------
const anomalyTemplates: FlavorTemplate[] = [
  {
    category: "anomaly",
    template:
      "Unexplained gravitational lensing reported near {sector}; civilian traffic advised to detour",
    story: [
      "Survey crews near {sector} are reporting impossible gravitational lensing — stars in the wrong positions, light bending in directions that don't add up. Imperial astronomers caution against speculation but admit the data is, in their words, 'profoundly weird.' Independent observatories in {system} have corroborated the readings, ruling out instrument failure as an explanation. Civilian traffic has been advised to take the long route until the phenomenon resolves or someone, anyone, can explain it.",
    ],
  },
  {
    category: "anomaly",
    template:
      "Class-{n} subspace harmonic detected in {system}; researchers describe it as 'humming'",
    story: [
      "A class-{n} subspace harmonic has been detected resonating through {system}. Researchers stress they have no working theory for what the harmonic represents — only that it is steady, persistent, and described by one xenoacoustic specialist as 'humming, almost on purpose.' The harmonic is audible through ship hulls if engines are cut, a fact which has not helped morale aboard the research station. Empire research stations have been given priority access and the public is being asked, politely, not to come closer.",
    ],
  },
  {
    category: "anomaly",
    template:
      "Probe loses contact with researchers near {planet} — debate continues over whether it returned",
    story: [
      "The survey probe sent to investigate the {planet} anomaly has gone silent — or, as the lead researcher insists on phrasing it, has 'entered a state of unconfirmed presence.' Telemetry data suggests the probe is either destroyed, stationary, or transmitting on a frequency no one has thought to check. The team has requested a replacement probe and also a second opinion from a philosopher.",
    ],
  },
  {
    category: "anomaly",
    template:
      "Anomalous time dilation in {sector} delays mail by {n} cycles, and also by {n} seconds, simultaneously",
    story: [
      "Postal authorities in {sector} are struggling to explain why a batch of priority mail arrived both {n} cycles late and {n} seconds early, as measured by synchronized clocks aboard the delivery vessel. The ship's crew reports they feel fine but 'slightly aware of themselves.' Physicists from {empire} have been dispatched and are reportedly arguing already. The affected mail has been delivered; recipients are asked to sign and date their receipts carefully.",
    ],
  },
  {
    category: "anomaly",
    template:
      "Strange reflective surface forms over {planet}'s pole; visible from neighboring systems",
    story: [
      "A vast reflective formation has materialized over {planet}'s northern pole, visible with the naked eye from adjacent systems. Astronomers confirm it is not ice, not metal, and not any registered material in the {empire} xenological survey database. The locals have named it The Mirror. Tourism inquiries have increased {percent}%.",
    ],
  },
  {
    category: "anomaly",
    template:
      "{company} R&D pulls all assets from {sector} after 'unexplained sensor readings'",
    story: [
      "{company}'s entire R&D division has evacuated {sector} following what internal communications describe only as 'readings inconsistent with baseline physical constants.' The company has declined to elaborate but sources inside the unit describe instruments behaving as if reality in the area 'has a hiccup.' All equipment, samples, and personal effects were removed; notably, the coffee maker was left behind, which colleagues describe as 'telling.' {pundit} has already filed three opinion pieces.",
    ],
  },
  {
    category: "anomaly",
    template:
      "Pulsar near {system} skips a beat; first time in recorded history",
    story: [
      "The pulsar designated GNN-{n} near {system} has skipped a full rotation cycle — an event considered impossible under standard stellar mechanics. The skip lasted precisely {n} milliseconds and then the pulsar resumed its regular cadence as if nothing had happened. {empire}'s observatory has flagged this as a priority observation event and reassigned two deep-survey vessels to monitor the region. Astronomers describe the event as 'deeply unsettling, but very tidy.'",
    ],
  },
  {
    category: "anomaly",
    template:
      "Xenobiologists request quarantine of {planet} pending 'shape-shifting biome' study",
    story: [
      "A xenobiology team has submitted an emergency quarantine request for {planet} after documenting what they describe as a biome that reorganizes its own geography in response to observation. 'The moment we mapped it, it changed,' the lead researcher wrote. 'And then it changed back and looked at us.' {empire} medical authorities are reviewing the paperwork.",
    ],
  },
  {
    category: "anomaly",
    template:
      "Survey records show {sector} appears to be {percent}% larger than last cycle",
    story: [
      "Updated cartographic surveys of {sector} show the region is measurably larger than it was last cycle — by approximately {percent}%. Survey teams have triple-checked their instruments and the instruments agree with each other, which is the problem. The rate of expansion, if consistent, would add another {percent}% within three cycles — a prospect the Bureau of Cartography has declined to comment on publicly. {pundit} has proposed four theories, two of which contradict each other and one of which contradicts itself.",
    ],
  },
  {
    category: "anomaly",
    template:
      "Communication beacon in {sector} reports it does not exist; investigation paused",
    story: [
      "Relay beacon C-{n} in {sector} has been transmitting a single message on loop for six cycles: 'This beacon does not exist. Please disregard.' Attempts to investigate have been complicated by the fact that all instruments confirm the beacon is transmitting but cannot confirm it is there. The bureau has paused the investigation pending 'conceptual clarification.'",
    ],
  },
  {
    category: "anomaly",
    template:
      "A second moon detected over {planet}; locals confirm there had been only one",
    story: [
      "Astronomers cataloguing {planet}'s orbital bodies have confirmed the presence of a second moon — one that all available historical records, every local survey, and three independent orbital mechanics teams agree was not there last cycle. The moon appears stable, geologically inert, and about {percent}% too convenient. {empire} has dispatched a science vessel. The first moon appears unbothered.",
    ],
  },
  {
    category: "anomaly",
    template:
      "{rank} {officer} cancels {empire} fleet exercise after 'incompatible reality readings'",
    story: [
      "{rank} {officer} has suspended a scheduled fleet exercise in {sector} following what the official communiqué describes as 'localized sensor incompatibility with observable reality.' Sources inside the exercise report that three ships simultaneously perceived each other as being somewhere else. Crew members in affected vessels report no physical symptoms, only a persistent sense of 'being slightly off.' The exercise has been rescheduled for when reality becomes available.",
    ],
  },
  {
    category: "anomaly",
    template:
      "Pre-recorded star map of {sector} no longer matches observable star map",
    story: [
      "Navigational charts for {sector} filed only {n} cycles ago now fail to match the observable star positions by a margin that astronomers call 'not measurement error.' Stars have not moved; the charts simply describe a slightly different {sector}. Older charts from {n2} cycles ago match current observation perfectly, which is considered worse. {empire}'s Bureau of Cartography has issued a travel advisory and also a formal expression of concern to the universe.",
    ],
  },
  {
    category: "anomaly",
    template:
      "Unidentified signal source in {sector} appears to read all incoming hails before they arrive",
    story: [
      "Signal analysts monitoring {sector} have identified a source that appears to respond to incoming hails before they are transmitted. Initial logs show the source's reply arriving up to {n} seconds before the hail is sent. Communications officers who have attempted contact describe the experience as 'deeply conversational' and 'very relaxing, somehow.' Investigation ongoing.",
    ],
  },
  {
    category: "anomaly",
    template:
      "Voidcap researchers withdraw paper claiming {planet} 'has feelings'",
    story: [
      "A Voidcap Institute paper arguing that {planet} exhibits 'affective planetary response' has been withdrawn after peer reviewers raised concerns about methodology — specifically, that the researchers appear to have apologized to the planet for a drilling survey, and the seismic readings improved. The lead author insists this is 'not evidence of feelings, just correlation that keeps happening.' Three co-authors have privately requested reassignment to a planet that does not have opinions about them. The withdrawal notice has itself been revised twice, as early drafts were described as 'too apologetic in tone.'",
    ],
  },
  {
    category: "anomaly",
    template:
      "Sentient fog reported drifting through {port} bazaar; cleanup pending",
    story: [
      "Port authorities at {port} received seventeen separate complaints last cycle about a fog that navigated the bazaar with apparent intentionality — avoiding obstacles, pausing near food stalls, and at one point, witnesses claim, browsing. Environmental crews have been dispatched. The fog had dissipated by the time they arrived, leaving behind a smell described as 'wet purpose.'",
    ],
  },
  {
    category: "anomaly",
    template:
      "{empire} astronomy guild splits over whether {system} has eight planets or nine",
    story: [
      "A procedural vote in {empire}'s astronomy guild has collapsed into faction. The dispute: {system} demonstrably has nine planets when observed from one angle and eight when observed from another. Neither instrument error nor observer bias explains the discrepancy. {pundit} has declared this 'the most embarrassing crisis in professional astronomy since the last one.'",
    ],
  },
  {
    category: "anomaly",
    template:
      "Hyperlane network reports a new lane in {sector} with no known endpoints",
    story: [
      "Navigation authorities have flagged a newly charted hyperlane running through {sector} that does not appear to originate from or arrive at any known system. Ships that have entered the lane experimentally report it is navigable, comfortable, and leads 'somewhere that has a smell.' The Bureau of Hyperlane Standards has asked pilots not to enter the lane until they agree on a category for it.",
    ],
  },
  {
    category: "anomaly",
    template:
      "Three colony ships in {sector} report seeing themselves arriving an hour earlier",
    story: [
      "Three colony vessels bound for {sector} reported on approach that they could observe what appeared to be their own ships completing docking procedures — an hour before they arrived. Upon docking, no earlier arrival was logged. Crew members report feeling 'slightly self-conscious.' The event has been classified as a navigational anomaly pending a better classification.",
    ],
  },
  {
    category: "anomaly",
    template:
      "Newly catalogued nebula in {sector} resembles a face; authorities urge calm",
    story: [
      "A nebula documented for the first time in {sector}'s outer rim bears a striking resemblance to a humanoid face in a state of mild surprise. {empire} authorities have released a statement urging the public not to assign meaning to astronomical coincidence. The statement has not worked. Tourism to {sector} is up {percent}% and the nebula has already been given a name.",
    ],
  },
  {
    category: "anomaly",
    template:
      "Xenobiology survey: {percent}% of {planet}'s flora 'should not be possible'",
    story: [
      "A comprehensive survey of {planet}'s native flora has concluded that {percent}% of catalogued plant species 'should not exist under current models of biochemistry.' The survey does not suggest why the plants did not consult the models before growing. Xenobiologists describe the ecosystem as 'aggressively alive' and have requested a research budget extension and a strongly worded letter to the plants.",
    ],
  },
  {
    category: "anomaly",
    template:
      "Astrolab freighter reports unexplained {percent}% mass gain over a single cycle",
    story: [
      "Freighter Ulysses-{n} filed a incident report this cycle noting that its total mass, as measured by three independent systems, increased by {percent}% during transit through {sector}. Cargo manifest is unchanged. Hull is intact. The crew's combined body mass accounts for none of the gain. An engineering team is reviewing the data and has not yet ruled anything out, or in.",
    ],
  },
  {
    category: "anomaly",
    template:
      "Asteroid belt around {planet} arranged into perfect spiral; cause unknown",
    story: [
      "The asteroid belt surrounding {planet} has reorganized itself into a mathematically precise spiral formation, as confirmed by four observatories using different methodologies. The formation is stable, rotating, and accurate to within {percent}% of the golden ratio. Scientists have declined to speculate about cause. {pundit} has not declined and has produced a seventeen-page theory.",
    ],
  },
  {
    category: "anomaly",
    template:
      "{empire} research vessel returns from {sector} with logs corrupted into poetry",
    story: [
      "The {empire} science vessel Meridian has returned from {sector} with all crew healthy but all voyage logs corrupted — specifically, rewritten into structured verse in a language that linguists have identified as 'not known but grammatically coherent.' The vessel's AI has been taken offline for analysis. The poetry, according to one reviewer who read it, is 'technically accomplished and deeply unwell.'",
    ],
  },
  {
    category: "anomaly",
    template:
      "Time on {port} station reportedly running {percent}% faster than reference",
    story: [
      "Chronometric officials have confirmed that clocks aboard {port} station are running {percent}% faster than the galactic reference standard — and have been for an indeterminate period. Residents report they feel fine but describe having 'a lot of extra afternoon.' The discrepancy has not been explained. Delivery schedules have been adjusted, and the station's residents have been asked to eat smaller meals.",
    ],
  },
];

// ---------------------------------------------------------------------------
// MUSIC (25 templates) — galactic artists, concerts, genre wars
// ---------------------------------------------------------------------------
const musicTemplates: FlavorTemplate[] = [
  {
    category: "music",
    template: "{musician} announces galactic tour kicking off at {port}",
    story: [
      "{musician} is taking {album} on the road. The tour opens at {port} next cycle and is expected to draw record crowds across {n} stops. Industry analysts are calling it the biggest {genre} tour of the decade.",
    ],
  },
  {
    category: "music",
    template:
      "{album} debuts at #1 on the galactic chart; {genre} fans rejoice",
    story: [
      "{musician}'s {album} has shattered first-week records, holding the top slot on every major streaming network. Critics are split — some calling it 'the future of {genre}' and others 'a competent disappointment' — but the numbers don't lie. {pundit} weighed in: 'This is what culture looks like when it's still alive.'",
    ],
  },
  {
    category: "music",
    template:
      "{musician} cancels {port} show citing 'creative differences with the gravity'",
    story: [
      "{musician} has canceled their headline appearance at {port}, issuing a statement through management that cites 'an irreconcilable creative divergence with local gravitational conditions.' The venue has offered refunds. Local physicists have declined to comment.",
    ],
  },
  {
    category: "music",
    template: "{musician} feuds publicly with rival; {genre} forums in chaos",
    story: [
      "An interview this cycle in which {musician} described a colleague as 'technically present but spiritually absent' has ignited a full-scale feud across every {genre} media channel. Forum moderators across the sector have gone on strike. {pundit} has taken both sides simultaneously.",
    ],
  },
  {
    category: "music",
    template:
      "{empire} cultural ministry bans {album} for 'subversive frequencies'",
    story: [
      "{empire}'s ministry of cultural standards has prohibited distribution of {album} within its borders, citing 'frequency profiles inconsistent with societal stability.' {musician} has responded by making the album free. Downloads in {empire} territories are up {percent}%.",
    ],
  },
  {
    category: "music",
    template:
      "Underground {genre} club at {port} hits capacity for {n} cycles running",
    story: [
      "The unnamed {genre} venue underneath {port}'s cargo district has been at capacity every cycle for {n} consecutive turns — a streak that has drawn attention from both touring acts and local zoning authorities. Ticket scalpers are reportedly operating from the freight elevator. The club has no official name and three unofficial ones, none of which the regulars will confirm to journalists.",
    ],
  },
  {
    category: "music",
    template:
      "Holovid biopic of {musician} announced; rumored {credits} budget",
    story: [
      "A production house has confirmed a feature-length holovid biography of {musician} is in development, with sources placing the budget at {credits}. Casting has not been announced, though {musician} has reportedly submitted a list of actors they 'would find acceptable.' {musician} has not publicly endorsed the project and has released a statement that is being interpreted as both approval and threat, depending on who is reading it.",
    ],
  },
  {
    category: "music",
    template: "{musician} embroiled in {controversy}; tour sales somehow up",
    story: [
      "{musician} is facing intense coverage of {controversy}, which has dominated entertainment feeds for the past cycle. Management has declined all interview requests. Ticket sales for the upcoming tour are up {percent}%.",
    ],
  },
  {
    category: "music",
    template:
      "{genre} festival on {planet} draws {n2} attendees, sets new record",
    story: [
      "The {planet} {genre} festival closed this cycle having welcomed {n2} attendees — a record that surpasses last cycle's count by {percent}%. Headliners included {musician}, who performed {album} in full. Local accommodation providers have already raised next cycle's prices.",
    ],
  },
  {
    category: "music",
    template: "Critic compares {album} to the void; {musician} thanks them",
    story: [
      "A review in the Galactic Music Quarterly called {album} 'a disciplined descent into the creative void — hollow, cold, and oddly beautiful.' {musician} issued a two-word response: 'Thank you.' The review has since been quoted on all official promotional materials.",
    ],
  },
  {
    category: "music",
    template:
      "Anonymous bidder pays {credits} for original {album} master tapes",
    story: [
      "The original master tapes for {musician}'s debut {album} sold at private auction for {credits}, purchased by an anonymous bidder through three intermediaries. The tapes were believed lost. {pundit} has already published a piece asking whether the buyer is {musician} themselves.",
    ],
  },
  {
    category: "music",
    template:
      "{musician} drops surprise diss track; {genre} community in flames",
    story: [
      "Without announcement, {musician} released a four-minute track this morning targeting a rival. The {genre} community has not recovered. The track has been streamed {n2}M times. The target has not yet responded, which most analysts read as response.",
    ],
  },
  {
    category: "music",
    template:
      "Lawsuit filed: rival claims {musician} stole {album}'s opening hook",
    story: [
      "A competing artist has filed suit claiming the opening four bars of {album} were lifted from a demo registered {n} cycles ago. {musician}'s legal team has called the claim 'fanciful.' Music theorists have been employed by both sides. The hook in question has since been streamed {n2}M additional times.",
    ],
  },
  {
    category: "music",
    template:
      "{musician} awarded {empire}'s highest cultural honor; refuses to attend",
    story: [
      "{empire}'s council of cultural distinction has named {musician} recipient of the Meridian Prize — the empire's highest artistic recognition. {musician} declined to attend the ceremony, citing 'a prior obligation to make music instead.' The prize was accepted by a roadie.",
    ],
  },
  {
    category: "music",
    template:
      "Orchestra at {port} performs {album} arranged for two thousand instruments",
    story: [
      "The {port} Symphonic Collective mounted its most ambitious production this cycle: a full orchestral arrangement of {album} performed simultaneously by {n2} musicians across the main hall, cargo bay, and three adjacent corridors. Audience members were issued maps at the door and encouraged to wander. Critics called it 'technically successful and logistically baffling.' Streaming rights have been acquired and the recording is expected to require six separate audio channels.",
    ],
  },
  {
    category: "music",
    template:
      "{musician}'s livestream concert on {planet} gets {n2}M concurrent viewers",
    story: [
      "{musician}'s live broadcast from {planet} broke streaming records with {n2}M concurrent viewers at peak. The performance included the debut of three unreleased tracks from the follow-up to {album}. Server load in {sector} caused brief comms disruption, which most viewers did not notice.",
    ],
  },
  {
    category: "music",
    template:
      "{genre} purists picket {musician}'s collaboration with {empire} state composers",
    story: [
      "A coalition of {genre} traditionalists gathered outside {port}'s cultural center to protest {musician}'s announced collaboration with {empire}'s official composition bureau. Signs read 'Art Dies in Committees' and 'This Is Why We Have Bad {genre}.' {musician} waved at them through the window.",
    ],
  },
  {
    category: "music",
    template:
      "Bootleg recording of {musician}'s {port} soundcheck sells out in {n} hours",
    story: [
      "A bootleg recording of {musician}'s pre-show soundcheck at {port} — reportedly captured on a maintenance worker's personal device — sold out in {n} hours on grey-market streaming. The recording captures {musician} singing half of {album} in the wrong key and stopping to eat something. Fans have called it 'essential listening.'",
    ],
  },
  {
    category: "music",
    template:
      "Streaming royalties scandal: {company} exec accused of skimming from {genre} artists",
    story: [
      "An internal audit at {company} has surfaced allegations that a senior executive diverted {percent}% of {genre} streaming royalties over {n} cycles. Affected artists have released a joint statement. The executive in question has not commented. Legal proceedings are expected.",
    ],
  },
  {
    category: "music",
    template: "{album} certified platinum on three planets simultaneously",
    story: [
      "{musician}'s {album} has achieved simultaneous platinum certification on {planet}, {empire}'s core worlds, and a third location described in the official certification as 'a planet that prefers not to be named but you know who you are.' Industry analysts note this is the first triple-simultaneous platinum certification in {genre} history. Total certified units now exceed {n2}M, a figure {musician}'s management has declined to celebrate publicly, calling it 'only a beginning.'",
    ],
  },
  {
    category: "music",
    template:
      "Underground {genre} scene at {port} celebrates {n}-cycle anniversary",
    story: [
      "The {genre} collective that formed in {port}'s lower freight district {n} cycles ago held its anniversary festival this week with a three-day lineup of acts. The venue still has no official permits. Attendance was estimated at {n2}. {pundit} called the scene 'the only honest thing happening in {genre} right now.'",
    ],
  },
  {
    category: "music",
    template:
      "{musician}'s remix of {empire} anthem sparks diplomatic incident",
    story: [
      "{musician} released an unauthorized remix of {empire}'s ceremonial anthem at {n} beats per minute with what critics describe as 'inadvisable percussion choices.' {empire}'s cultural ministry has filed a formal protest. The remix has been streamed {n2}M times. {musician} has not apologized.",
    ],
  },
  {
    category: "music",
    template:
      "Holovid talk show ambushes {musician} with footage of old performance",
    story: [
      "{musician} was shown archival footage of an early performance on a live broadcast this cycle and asked to react. {musician} reacted for {n} minutes in a way that no one in the studio expected and that has since been clipped {n2} times. Publicists have called it 'a learning opportunity.'",
    ],
  },
  {
    category: "music",
    template:
      "Music critic {pundit} declares {genre} 'officially over' for the third time this decade",
    story: [
      "{pundit} has published a column declaring that {genre} 'has said everything it has to say and is now simply repeating itself at higher volume.' This is {pundit}'s third such declaration this decade. {genre} streaming numbers are up {percent}% year-on-year. {musician} posted the column with no caption.",
    ],
  },
  {
    category: "music",
    template:
      "{musician} marries fellow artist; tabloid bidding war erupts for exclusive",
    story: [
      "{musician} confirmed a private marriage ceremony this cycle, triggering what media executives are calling 'the most competitive exclusive bidding war in {empire} tabloid history.' Sources report the winning offer reached {credits}. {musician}'s statement said only: 'It was a small ceremony. You weren't there.'",
    ],
  },
];

// ---------------------------------------------------------------------------
// DISCOVERY (25 templates) — exploration finds, archaeology, new species
// ---------------------------------------------------------------------------
const discoveryTemplates: FlavorTemplate[] = [
  {
    category: "discovery",
    template:
      "Pre-empire ruins uncovered on {planet}; {empire} academia in uproar",
    story: [
      "Excavation teams on {planet} have uncovered structures predating any known empire — possibly by tens of thousands of cycles. Carbon-equivalent dating has been disputed, but every independent lab has confirmed the same anomalous result. {pundit} called it 'the find of the century, again.' {empire}'s academia council has scheduled emergency sessions, while three rival empires have already filed competing claims to study the site.",
    ],
  },
  {
    category: "discovery",
    template:
      "New sentient species catalogued on {planet}; rights debates begin immediately",
    story: [
      "A xenobiology survey on {planet} has confirmed the presence of a previously uncatalogued sentient species. The species demonstrates tool use, complex communication, and, according to one team member's field notes, 'a demonstrable sense of humor about the survey crew.' {empire}'s legal department has scheduled its first rights framework session. {pundit} has six opinions and they are all different.",
    ],
  },
  {
    category: "discovery",
    template:
      "Prospector on {planet} finds {commodity} vein {percent}% above galactic average",
    story: [
      "An independent prospector operating without a corporate license in {planet}'s eastern ridge has surfaced a {commodity} deposit testing {percent}% richer than any equivalent claim in the {empire} registry. Initial extraction surveys suggest the vein extends {n} kilometers deeper than the surface sample implies. Three corporations have filed competing ownership petitions. The prospector is understood to be negotiating with all of them and currently residing in an undisclosed location, with very good legal representation.",
    ],
  },
  {
    category: "discovery",
    template:
      "Unmapped system found behind {sector} dust cloud; {empire} claims first survey rights",
    story: [
      "A navigational research vessel has confirmed a complete stellar system hidden behind a dense dust formation at the {sector} periphery. {empire} has claimed prior survey rights by twelve minutes, based on the vessel's approach vector. Three other empires dispute the calculation. The system itself has been observed to contain {n2} bodies and what one astronomer described as 'an extraordinary amount of quiet.'",
    ],
  },
  {
    category: "discovery",
    template:
      "Archaeology team on {planet} unearths object that 'shouldn't exist for another century'",
    story: [
      "Researchers excavating a pre-collapse site on {planet} have recovered an object whose composition and design correspond to manufacturing methods that will not be developed — by current projections — for another hundred cycles. The team has triple-dated the deposit layer. The object works. {pundit} has described the situation as 'technically manageable if everyone stays calm,' which they are not.",
    ],
  },
  {
    category: "discovery",
    template:
      "Bioluminescent lifeforms catalogued in {planet}'s oceans; tourism interest rising",
    story: [
      "A deep-ocean survey of {planet} has documented a colony of bioluminescent organisms capable of producing synchronized light patterns across several kilometers. The patterns repeat on a consistent interval, suggesting either a biological rhythm or coordinated behavior — a distinction the survey team has not resolved. The survey team, in a breach of typical scientific restraint, described the experience as 'genuinely beautiful.' Tourism operators in {empire} have already begun filing route permits, and the survey budget has been renewed without discussion.",
    ],
  },
  {
    category: "discovery",
    template:
      "Lost colony confirmed alive in {sector}; rescue mission departing {port}",
    story: [
      "The {empire} colony ship Esperance, listed as lost {n2} cycles ago, has been confirmed alive in a remote {sector} system after a routine survey detected its beacon signature. Initial contact was established via short-range comms; survivors report all essential systems functional and colony population at {percent}% of original manifest. A rescue and resupply mission is departing {port} within the week. Survivors have reportedly declined to leave until they have finished what they were working on, which they declined to specify.",
    ],
  },
  {
    category: "discovery",
    template:
      "Cargo from derelict in {sector} contains data older than empire records",
    story: [
      "Data cores recovered from a derelict vessel in {sector} contain information predating the oldest {empire} archive by an estimated {n2} cycles. Translation is ongoing and complicated by the fact that the encoding standard is not recognized by any catalogued system. {company} R&D has submitted a formal bid to acquire the cores. The bid has been rejected. They have submitted another.",
    ],
  },
  {
    category: "discovery",
    template:
      "First-contact protocol initiated with {planet}'s indigenous broadcast culture",
    story: [
      "{empire} has formally initiated first-contact protocol with an indigenous civilization on {planet} that has been transmitting coherent radio signals for {n2} cycles without response. Officials describe first contact as 'proceeding carefully.' A xenolinguistics team has been assigned and expects to produce a preliminary translation within {n} cycles. The indigenous civilization's transmissions, according to a preliminary analysis, include what appears to be a question they have been asking for a very long time, and which {empire} has now, technically, begun the process of answering.",
    ],
  },
  {
    category: "discovery",
    template:
      "Unknown alloy recovered from {sector} debris; {company} R&D submits bids",
    story: [
      "Salvage teams in {sector} have recovered hull fragments composed of an alloy that does not match any registered material in the galactic database. The alloy is resistant to all tested cutting methods, maintains temperature across a range considered theoretically impossible, and has a surface texture that one engineer described as 'inexplicably pleasant to touch.' {company} R&D has submitted three separate acquisition bids this cycle.",
    ],
  },
  {
    category: "discovery",
    template:
      "Ancient star map on {planet}'s northern continent matches modern hyperlanes",
    story: [
      "A stone inscription spanning {percent}% of {planet}'s northern continental shelf has been identified as a navigational chart. The chart matches, with {percent}% accuracy, the current hyperlane network — including {n} lanes discovered only in the past decade. The inscription predates hyperlane technology by at least {n2} cycles. {pundit} has called this 'either the most important find in history or a very large coincidence,' then published three more articles on it.",
    ],
  },
  {
    category: "discovery",
    template:
      "Temple complex on {planet} reveals knowledge of orbital mechanics predating local civilization",
    story: [
      "Archaeologists at a newly excavated temple complex on {planet} have confirmed that the site encodes precise orbital data for all bodies in the local system — data that requires technology the civilization possessing the temple demonstrably did not have. The encoding is accurate to within {percent}% of modern measurements, a precision that eliminates coincidence as an explanation. Two separate review panels have confirmed the dating of the site. The find is being described as 'a knowledge inheritance problem' by scientists who are trying very hard not to use the word impossible, with mixed success.",
    ],
  },
  {
    category: "discovery",
    template:
      "Linguist decodes {percent}% of {planet}'s substrate dialect; {pundit} calls it 'urgent'",
    story: [
      "A xenolinguistics team has successfully decoded {percent}% of the primary dialect used in {planet}'s substrate-layer inscription system — a language previously considered untranslatable. The breakthrough came from cross-referencing inscription patterns with {n} newly catalogued cognate languages in the {sector} archive. Preliminary translations contain what the team describes as 'extensive warnings about something' but they are still working out what. {pundit} has already published an analysis of the warnings despite not having seen them, and has been asked to correct the record, which they are considering.",
    ],
  },
  {
    category: "discovery",
    template:
      "Survey crew finds operational generator buried under {planet}'s ice cap",
    story: [
      "A geothermal survey on {planet} has discovered a functioning power generator buried under {n2} meters of ice. The generator is producing power. It has no connection to any surface installation, known cable system, or catalogued infrastructure. It is warm. {empire}'s energy authority has dispatched a team and has asked everyone else, respectfully, to wait.",
    ],
  },
  {
    category: "discovery",
    template: "Floating crystal city catalogued in {sector}; origins unknown",
    story: [
      "A deep-survey vessel in {sector} has documented what can only be described as a city — suspended in open space, composed of crystalline structures, and fully intact. There are no inhabitants, no power signatures, and no orbital mechanics that explain why it does not drift. The vessel's crew has filed the report and requested three weeks of leave.",
    ],
  },
  {
    category: "discovery",
    template:
      "Probe returns with footage of self-replicating geometry near {sector}",
    story: [
      "A research probe sent into the outer margins of {sector} has returned with footage of geometric structures that appear to reproduce themselves on a {n}-hour cycle. The structures are not biological, not mechanical by any registered definition, and are growing. {empire} has dispatched a science vessel. The probe has been placed in quarantine out of an abundance of caution.",
    ],
  },
  {
    category: "discovery",
    template:
      "Microbial life confirmed in {planet}'s upper atmosphere; quarantine protocols updated",
    story: [
      "Atmospheric sampling from {planet}'s upper stratosphere has confirmed the presence of microbial organisms that metabolize radiation — a combination previously considered incompatible with stable life. The organisms appear to have been thriving for at least {n2} cycles, surviving multiple stellar flare events that would have sterilized the upper atmosphere of any registered planet. {empire} medical authorities have updated quarantine protocols for {sector} traffic. The microbes have been named, provisionally, and the naming committee has already disagreed about pronunciation.",
    ],
  },
  {
    category: "discovery",
    template:
      "Recovered logs from {sector} shipwreck rewrite empire founding narrative",
    story: [
      "Expedition teams salvaging a {n2}-cycle-old wreck in {sector} have recovered voyage logs that directly contradict three foundational claims in {empire}'s official founding account. The logs have been authenticated by independent archivists. {empire}'s bureau of historical records has issued a statement describing the logs as 'context-dependent' and asking historians to 'maintain perspective.' Historians have not maintained perspective.",
    ],
  },
  {
    category: "discovery",
    template:
      "Xenobiologist team on {planet} discovers symbiosis chain spanning seven species",
    story: [
      "A field team on {planet} has documented a symbiotic relationship chain involving seven distinct species, each dependent on the next in a closed cycle that none of them could have evolved independently to sustain. The chain has no apparent origin point — every species predates the others in the fossil record, depending on which layer of {planet}'s geology is sampled. Biologists describe the discovery as 'almost designed' and have asked that phrase not be quoted. It has been quoted, extensively, and is now the title of {n} separate academic papers.",
    ],
  },
  {
    category: "discovery",
    template:
      "Pre-translation artifacts surface at {port} black market; {empire} demands return",
    story: [
      "A cache of pre-translation-era artifacts has surfaced on {port}'s black market — objects of the kind typically held under {empire} restricted-cultural-property designation. {empire} has filed formal demands for return and dispatched an attaché. The seller has not been identified. The objects have been authenticated by {n} independent labs, all of whom were then asked not to publish.",
    ],
  },
  {
    category: "discovery",
    template: "Astronomers identify possible megastructure in {sector}",
    story: [
      "A research team at {empire}'s primary observatory has published preliminary findings identifying what may be an artificial megastructure surrounding a star in the outer {sector}. The paper is careful to use the word 'possible' seventeen times. The structure, if confirmed, would be the largest artificial object in recorded history. {pundit} is not being careful with the word 'possible.'",
    ],
  },
  {
    category: "discovery",
    template:
      "Teleportation pad found inside {planet} ruins; output direction unknown",
    story: [
      "Excavation teams on {planet} have uncovered what appears to be a functional teleportation device inside a sealed chamber predating any known civilization by {n2} cycles. The device activates when approached. Its destination is not known. Three researchers have declined to test it. A fourth has agreed and is currently unavailable for comment.",
    ],
  },
  {
    category: "discovery",
    template:
      "Plant species on {planet} performs mathematical calculations through growth patterns",
    story: [
      "Botanists studying growth patterns in {planet}'s highland flora have published findings suggesting a native plant species arranges its branching structure to perform arithmetic calculations in response to environmental inputs. The computations are simple — addition, subtraction — but deliberate. The plants do not know they are doing math. Or they do. The paper does not settle this question.",
    ],
  },
  {
    category: "discovery",
    template: "Survey identifies {n2} previously unmapped objects in {sector}",
    story: [
      "A cartographic pass through the outer margins of {sector} has identified {n2} previously uncatalogued objects — a count that {empire}'s astronomy bureau describes as 'significantly above expected survey yield.' The objects range from standard asteroid-class bodies to three items that the survey report classifies as 'object, type unassigned, pending review.' Review is underway.",
    ],
  },
  {
    category: "discovery",
    template:
      "{empire} expedition recovers fully intact ship from pre-hyperlane era",
    story: [
      "An {empire} deep-space expedition has recovered a pre-hyperlane-era vessel in near-perfect condition, drifting in the outer {sector} at a velocity consistent with a launch date {n2} cycles ago. The ship's logs are intact. The cargo hold is sealed. {empire}'s historical preservation office has claimed jurisdiction. {company} R&D has filed a competing petition and been denied twice.",
    ],
  },
];

// Rich template pools — templates with story bodies for new categories.
const RICH_POOLS: Partial<Record<TickerCategory, FlavorTemplate[]>> = {
  anomaly: anomalyTemplates,
  music: musicTemplates,
  discovery: discoveryTemplates,
};

// ── Registry ──────────────────────────────────────────────────
const TEMPLATE_POOLS: Record<TickerCategory, string[]> = {
  // Structural categories empty here — sourced live by tickerFeed.ts.
  headline: [],
  leader: [],
  stock: [],

  politics: POLITICS,
  corporate: CORPORATE,
  market_mover: MARKET_MOVER,
  crime: CRIME,
  science: SCIENCE,
  sports: SPORTS,
  celebrity: CELEBRITY,
  cosmic_weather: COSMIC_WEATHER,
  local: LOCAL,
  health: HEALTH,
  religion: RELIGION,
  blotter: BLOTTER,
  food: FOOD,
  realestate: REALESTATE,
  travel: TRAVEL,
  fashion: FASHION,
  academia: ACADEMIA,
  xenobiology: XENOBIOLOGY,
  obituary: OBITUARY,
  homage: HOMAGE,

  // 2026-05 expansion — templates added in Tasks 12-13.
  anomaly: [],
  music: [],
  discovery: [],
  gossip: [],
  military: [],
  propaganda: [],
};

/** Templates for one category, in declaration order. Prefers RICH_POOLS over TEMPLATE_POOLS. */
export function getTemplatesForCategory(cat: TickerCategory): FlavorTemplate[] {
  const rich = RICH_POOLS[cat];
  if (rich) return rich;
  return (TEMPLATE_POOLS[cat] ?? []).map<FlavorTemplate>((t) => ({
    category: cat,
    template: t,
  }));
}

/** Flat list of every flavor template, useful for tests and counts. */
export const ALL_FLAVOR_TEMPLATES: FlavorTemplate[] = FLAVOR_CATEGORIES.flatMap(
  (cat) => getTemplatesForCategory(cat),
);

/** Total templates across all flavor pools. */
export function totalFlavorTemplateCount(): number {
  return ALL_FLAVOR_TEMPLATES.length;
}
