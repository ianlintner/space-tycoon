import * as Phaser from "phaser";
import type { SceneUiDirector } from "@spacebiz/ui";
import { openCommunicationModal } from "../../ui/CommunicationModal.ts";
import { gameStore } from "../../data/GameStore.ts";
import { formatGoalLine } from "../scoring/GoalText.ts";
import { ROUTE_PICK_PROMPT } from "./TutorialDefinitions.ts";
import {
  scanAllRouteOpportunities,
  createRoute,
  calculateDistance,
  addCargoLock,
} from "../routes/RouteManager.ts";
export interface TutorialCallbacks {
  navigateTo: (sceneName: string) => void;
  skipTutorial: () => void;
  showNamedHighlight: (
    region: "endTurn" | "routesNav" | "createRouteBtn" | "routeFirstRow",
  ) => void;
  hideHighlight: () => void;
  showActiveRoutes: () => void;
}

export class TutorialRunner {
  private readonly scene: Phaser.Scene;
  private readonly ui: SceneUiDirector;
  private readonly callbacks: TutorialCallbacks;
  private awaitingRoutePick = false;

  constructor(
    scene: Phaser.Scene,
    ui: SceneUiDirector,
    callbacks: TutorialCallbacks,
  ) {
    this.scene = scene;
    this.ui = ui;
    this.callbacks = callbacks;
  }

  private rexDialogue(
    partial: Omit<
      Parameters<typeof openCommunicationModal>[2],
      "speakerName" | "speakerTitle" | "accentColor" | "portraitTextureKey"
    > & { mood?: "standby" | "success" | "analyzing" | "alert" },
  ): void {
    const { mood = "standby", ...rest } = partial;
    openCommunicationModal(this.scene, this.ui, {
      speakerName: "Rex",
      speakerTitle: "K9-Corp Executive Adviser",
      accentColor: 0x00ff88,
      portraitTextureKey: `rex-portrait-${mood}`,
      ...rest,
    });
  }

  start(): void {
    const state = gameStore.getState();
    const goal = formatGoalLine({
      maxTurns: state.maxTurns,
      companyCount: state.aiCompanies.length + 1,
    });
    this.rexDialogue({
      mood: "success",
      text: `Congratulations on your promotion to CEO! I'm Rex, your K9-Corp Executive Adviser. ${goal}. Ready to walk through the basics of your freight empire? I'll show you how to open your first trade route.`,
      choices: [
        { label: "Let's go!", onClick: () => this.runRoutesTutorial() },
        { label: "Skip intro", onClick: () => this.skip() },
      ],
    });
  }

  private runRoutesTutorial(): void {
    this.callbacks.navigateTo("RoutesScene");
    this.callbacks.showNamedHighlight("routesNav");

    this.scene.time.delayedCall(1250, () => {
      this.callbacks.hideHighlight();
      this.callbacks.showNamedHighlight("routeFirstRow");
      this.awaitingRoutePick = false;
      this.rexDialogue({
        mood: "standby",
        text: ROUTE_PICK_PROMPT,
        choices: [
          { label: "I'll pick one", onClick: () => this.beginRoutePick() },
          { label: "Do it for me", onClick: () => this.createTutorialRoute() },
        ],
      });
    });
  }

  private beginRoutePick(): void {
    this.awaitingRoutePick = true;
    this.callbacks.showNamedHighlight("routeFirstRow");
  }

  /** Called by the HUD when the player creates their first route unaided. */
  handleFirstRoute(): void {
    if (!this.awaitingRoutePick) return;
    this.awaitingRoutePick = false;
    this.callbacks.hideHighlight();
    this.scene.time.delayedCall(600, () => {
      this.showFinalModal(
        "Route opened! Capacity is drawn from your global fleet pools. Hit the End Turn button to run the simulation and see how you stack up against the rivals.",
      );
    });
  }

  private createTutorialRoute(): void {
    this.awaitingRoutePick = false;
    const state = gameStore.getState();

    const opportunities = scanAllRouteOpportunities(
      state.galaxy.planets,
      state.galaxy.systems,
      state.market,
      state.activeRoutes,
      state.cash,
      state,
    );

    if (opportunities.length === 0) {
      this.scene.time.delayedCall(100, () => {
        this.showFinalModal(
          "No routes are available yet — that can happen when all empires are still locked. Once diplomatic access opens up, come back here and tap any row to open your first route.",
        );
      });
      return;
    }

    const opp = opportunities[0];
    const origin = state.galaxy.planets.find(
      (p) => p.id === opp.originPlanetId,
    );
    const dest = state.galaxy.planets.find(
      (p) => p.id === opp.destinationPlanetId,
    );
    if (!origin || !dest) {
      this.complete();
      return;
    }

    const distance = calculateDistance(
      origin,
      dest,
      state.galaxy.systems,
      state.hyperlanes,
      state.borderPorts,
    );

    const route = createRoute(origin.id, dest.id, distance, opp.bestCargoType);
    const routes = [...state.activeRoutes, route];
    const locks = addCargoLock(
      origin.id,
      dest.id,
      opp.bestCargoType,
      route.id,
      state.galaxy.systems,
      state.galaxy.planets,
      state.interEmpireCargoLocks,
    );

    gameStore.update({
      activeRoutes: routes,
      interEmpireCargoLocks: locks,
    });

    this.callbacks.showActiveRoutes();

    this.scene.time.delayedCall(1100, () => {
      this.showFinalModal(
        `Route opened: ${opp.originName} → ${opp.destinationName} (${opp.bestCargoType}). Capacity is drawn from your global fleet pools. Hit the End Turn button to run the simulation!`,
      );
    });
  }

  private showFinalModal(text: string): void {
    this.callbacks.showNamedHighlight("endTurn");
    this.rexDialogue({
      mood: "success",
      text,
      onDismiss: () => {
        this.callbacks.hideHighlight();
        this.complete();
      },
    });
  }

  private complete(): void {
    const state = gameStore.getState();
    if (state.adviser) {
      gameStore.update({
        adviser: { ...state.adviser, tutorialComplete: true },
      });
    }
  }

  private skip(): void {
    this.awaitingRoutePick = false;
    this.callbacks.skipTutorial();
  }
}
