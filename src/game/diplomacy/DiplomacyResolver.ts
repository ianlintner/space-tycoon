import type { SeededRNG } from "../../utils/SeededRNG.ts";
import type {
  DiplomacyState,
  GameState,
  QueuedDiplomacyAction,
  StandingTag,
} from "../../data/types.ts";
import { EMPTY_DIPLOMACY_STATE } from "../../data/types.ts";
import { addTag, hasTagOfKind } from "./StandingTags.ts";
import { setCooldown, cooldownKey } from "./Cooldowns.ts";
import { isTierTransition } from "./StandingTiers.ts";

export interface DigestEntry {
  readonly text: string;
}

export interface ModalEntry {
  readonly speakerKind:
    | "empireAmbassador"
    | "empireRuler"
    | "rivalLiaison"
    | "rivalCEO";
  readonly targetId: string;
  readonly headline: string;
  readonly flavor: string;
}

export interface ResolutionOutcome {
  readonly nextState: GameState;
  readonly modalEntries: readonly ModalEntry[];
  readonly digestEntries: readonly DigestEntry[];
  readonly success: boolean;
}

const GIFT_EMPIRE_BASE_DELTA = 8;
const GIFT_RIVAL_BASE_DELTA = 6;
const GIFT_EMPIRE_COOLDOWN = 3;
const GIFT_RIVAL_COOLDOWN = 3;
const GIFT_RECENTLY_GIFTED_TTL = 3;
const GIFT_OWE_FAVOR_TTL = 5;
const GIFT_OWE_FAVOR_CHANCE = 0.3;
const GIFT_EMPIRE_BASE_SUCCESS = 0.7;
const GIFT_RIVAL_SUCCESS = 0.8;
const GIFT_NO_RECENT_BONUS = 0.1;
const DIMINISHING_RETURNS_THRESHOLD = 70;

function dip(state: GameState): DiplomacyState {
  return state.diplomacy ?? EMPTY_DIPLOMACY_STATE;
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function applyStandingDelta(current: number, delta: number): number {
  if (delta <= 0 || current < DIMINISHING_RETURNS_THRESHOLD) {
    return clamp(current + delta);
  }
  const scale = (100 - current) / 30;
  return clamp(current + Math.floor(delta * scale));
}

function anyEmpireRecentlyGifted(state: GameState): boolean {
  return Object.values(dip(state).empireTags).some((tags) =>
    hasTagOfKind(tags, "RecentlyGifted"),
  );
}

function anyRivalRecentlyGifted(state: GameState): boolean {
  return Object.values(dip(state).rivalTags).some((tags) =>
    hasTagOfKind(tags, "RecentlyGifted"),
  );
}

export function resolveGiftEmpire(
  state: GameState,
  action: QueuedDiplomacyAction,
  rng: SeededRNG,
): ResolutionOutcome {
  const { targetId } = action;
  const recentlyGifted = anyEmpireRecentlyGifted(state);
  const dampener = recentlyGifted ? 0.5 : 1.0;
  const successChance =
    GIFT_EMPIRE_BASE_SUCCESS + (recentlyGifted ? 0 : GIFT_NO_RECENT_BONUS);
  const success = rng.chance(successChance);

  const beforeStanding = state.empireReputation?.[targetId] ?? 50;
  let nextStanding = beforeStanding;
  let cashAfter = state.cash - action.cashCost;
  const tagsBefore = dip(state).empireTags[targetId] ?? [];
  let tagsAfter: readonly StandingTag[] = tagsBefore;
  const modal: ModalEntry[] = [];
  const digest: DigestEntry[] = [];

  if (success) {
    const delta = Math.floor(GIFT_EMPIRE_BASE_DELTA * dampener);
    nextStanding = applyStandingDelta(beforeStanding, delta);
    tagsAfter = addTag(tagsAfter, {
      kind: "RecentlyGifted",
      expiresOnTurn: state.turn + GIFT_RECENTLY_GIFTED_TTL,
    });
    if (rng.chance(GIFT_OWE_FAVOR_CHANCE)) {
      tagsAfter = addTag(tagsAfter, {
        kind: "OweFavor",
        expiresOnTurn: state.turn + GIFT_OWE_FAVOR_TTL,
      });
    }
    digest.push({
      text: `Gift to ${targetId} accepted: +${delta} standing.`,
    });
    if (isTierTransition(beforeStanding, nextStanding)) {
      modal.push({
        speakerKind: "empireRuler",
        targetId,
        headline: "Tier shift",
        flavor: "Standing has shifted.",
      });
    }
  } else {
    cashAfter = state.cash - Math.floor(action.cashCost * 0.5);
    modal.push({
      speakerKind: "empireAmbassador",
      targetId,
      headline: "Gift refused",
      flavor: "The ambassador returns your gift unopened.",
    });
  }

  const prevDip = dip(state);
  const nextCooldowns = setCooldown(
    prevDip.cooldowns,
    cooldownKey("giftEmpire", targetId),
    state.turn + GIFT_EMPIRE_COOLDOWN,
  );

  return {
    nextState: {
      ...state,
      cash: cashAfter,
      empireReputation: {
        ...(state.empireReputation ?? {}),
        [targetId]: nextStanding,
      },
      diplomacy: {
        ...prevDip,
        empireTags: {
          ...prevDip.empireTags,
          [targetId]: tagsAfter,
        },
        cooldowns: nextCooldowns,
        actionsResolvedThisTurn: prevDip.actionsResolvedThisTurn + 1,
      },
    },
    modalEntries: modal,
    digestEntries: digest,
    success,
  };
}

export function resolveGiftRival(
  state: GameState,
  action: QueuedDiplomacyAction,
  rng: SeededRNG,
): ResolutionOutcome {
  const { targetId } = action;
  const dampener = anyRivalRecentlyGifted(state) ? 0.5 : 1.0;
  const success = rng.chance(GIFT_RIVAL_SUCCESS);

  const prevDip = dip(state);
  const before = prevDip.rivalStanding[targetId] ?? 50;
  const tagsBefore = prevDip.rivalTags[targetId] ?? [];
  let next = before;
  let tagsAfter: readonly StandingTag[] = tagsBefore;
  let cashAfter = state.cash - action.cashCost;
  const modal: ModalEntry[] = [];
  const digest: DigestEntry[] = [];

  if (success) {
    const delta = Math.floor(GIFT_RIVAL_BASE_DELTA * dampener);
    next = applyStandingDelta(before, delta);
    tagsAfter = addTag(tagsAfter, {
      kind: "RecentlyGifted",
      expiresOnTurn: state.turn + GIFT_RECENTLY_GIFTED_TTL,
    });
    digest.push({ text: `Gift to ${targetId} accepted: +${delta} standing.` });
    if (isTierTransition(before, next)) {
      modal.push({
        speakerKind: "rivalCEO",
        targetId,
        headline: "Tier shift",
        flavor: "Relationship temperature has shifted.",
      });
    }
  } else {
    cashAfter = state.cash - Math.floor(action.cashCost * 0.5);
    modal.push({
      speakerKind: "rivalLiaison",
      targetId,
      headline: "Gift refused",
      flavor: "Their corporate liaison politely declines.",
    });
  }

  return {
    nextState: {
      ...state,
      cash: cashAfter,
      diplomacy: {
        ...prevDip,
        rivalStanding: {
          ...prevDip.rivalStanding,
          [targetId]: next,
        },
        rivalTags: {
          ...prevDip.rivalTags,
          [targetId]: tagsAfter,
        },
        cooldowns: setCooldown(
          prevDip.cooldowns,
          cooldownKey("giftRival", targetId),
          state.turn + GIFT_RIVAL_COOLDOWN,
        ),
        actionsResolvedThisTurn: prevDip.actionsResolvedThisTurn + 1,
      },
    },
    modalEntries: modal,
    digestEntries: digest,
    success,
  };
}
