// Wave 1 ships only the config + stub render API. The full Phaser rendering
// (portrait + name + flavor + interactive option buttons) is deferred to wave
// 2 polish; it will be lifted from DilemmaScene's existing render code rather
// than rewritten. DilemmaScene is intentionally left untouched in wave 1.

import * as Phaser from "phaser";
import type { CharacterPortrait, ChoiceOption } from "../data/types.ts";

export interface CharacterDialogProps {
  speaker: { name: string; subtitle: string; portrait: CharacterPortrait };
  speakerTier: "ambassador" | "ruler";
  flavor: string;
  options: readonly ChoiceOption[];
}

export interface CharacterDialogConfig {
  readonly headerColor: number;
  readonly frameStyle: "muted" | "gold";
  readonly portraitSize: number;
  readonly fadeMs: number;
}

const AMB_HEADER = 0xc8a464;
const RULER_HEADER = 0xffd770;

export function buildCharacterDialogConfig(
  props: CharacterDialogProps,
): CharacterDialogConfig {
  if (props.speakerTier === "ruler") {
    return {
      headerColor: RULER_HEADER,
      frameStyle: "gold",
      portraitSize: 220,
      fadeMs: 300,
    };
  }
  return {
    headerColor: AMB_HEADER,
    frameStyle: "muted",
    portraitSize: 160,
    fadeMs: 0,
  };
}

/**
 * Open a character dialog modal. Wave-1 implementation is a stub that resolves
 * immediately with the first option's id; the actual Phaser rendering will be
 * lifted from DilemmaScene in a follow-up task. The API is stable.
 */
export function openCharacterDialog(
  _scene: Phaser.Scene,
  props: CharacterDialogProps,
): Promise<string> {
  return Promise.resolve(props.options[0]?.id ?? "");
}
