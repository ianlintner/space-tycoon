import * as Phaser from "phaser";
import { getTheme, colorToString } from "../Theme.ts";
import { TextInput } from "./TextInput.ts";
import {
  filterAutocomplete,
  type AutocompleteCandidate,
} from "./autocompleteMatch.ts";

export interface AutocompleteInputConfig<
  T extends AutocompleteCandidate = AutocompleteCandidate,
> {
  x: number;
  y: number;
  width: number;
  height: number;
  placeholder?: string;
  /**
   * Suggestion source. The widget calls this on every keystroke and
   * renders up to `maxSuggestions` items below the textbox.
   *
   * Pass a function rather than a static list so the caller can lazily
   * read from the latest gameStore state without rebuilding the widget.
   */
  getSuggestions: (query: string) => readonly T[];
  /** Default 8. */
  maxSuggestions?: number;
  /** Fires on every keystroke with the raw query string. */
  onChange?: (query: string) => void;
  /**
   * Fires when the user picks a suggestion (click or Enter). Note that
   * `onChange` will still have fired with the typed string just before.
   */
  onSelect?: (item: T) => void;
  /** Fires when the user clears the textbox (empties it / hits Esc). */
  onClear?: () => void;
}

/**
 * Textbox + suggestion list. Reuses TextInput's DOM-overlay trick for the
 * input itself; the dropdown is pure Phaser GameObjects rendered above
 * the textbox so it doesn't fight with other DOM overlays.
 *
 * Keyboard model:
 *   - Up/Down       — move the highlighted row
 *   - Enter         — pick the highlighted row (or the first match)
 *   - Esc           — clear & close
 *   - Anything else — bubbles to the textbox
 */
export class AutocompleteInput<
  T extends AutocompleteCandidate = AutocompleteCandidate,
>
  extends Phaser.GameObjects.Container
{
  private readonly textInput: TextInput;
  private readonly listContainer: Phaser.GameObjects.Container;
  private readonly listBg: Phaser.GameObjects.Rectangle;
  private readonly rowFontSize: number;
  private readonly rowHeight: number;
  private readonly maxSuggestions: number;
  private readonly getSuggestions: (query: string) => readonly T[];
  private readonly onChange?: (query: string) => void;
  private readonly onSelect?: (item: T) => void;
  private readonly onClear?: () => void;

  private rowBgs: Phaser.GameObjects.Rectangle[] = [];
  private rowTexts: Phaser.GameObjects.Text[] = [];
  private currentMatches: T[] = [];
  private highlightedIndex = 0;
  private listVisible = false;

  constructor(scene: Phaser.Scene, config: AutocompleteInputConfig<T>) {
    super(scene, config.x, config.y);
    const theme = getTheme();

    this.maxSuggestions = config.maxSuggestions ?? 8;
    this.getSuggestions = config.getSuggestions;
    this.onChange = config.onChange;
    this.onSelect = config.onSelect;
    this.onClear = config.onClear;
    this.rowFontSize = Math.max(10, theme.fonts.body.size - 1);
    this.rowHeight = this.rowFontSize + 8;

    this.setSize(config.width, config.height);

    this.textInput = new TextInput(scene, {
      x: 0,
      y: 0,
      width: config.width,
      height: config.height,
      placeholder: config.placeholder,
      onChange: (value) => {
        this.onChange?.(value);
        this.refreshMatches(value);
      },
      onSubmit: () => this.commitHighlightedOrFirst(),
    });
    this.add(this.textInput);

    this.listBg = scene.add
      .rectangle(0, config.height + 2, config.width, 0, theme.colors.panelBg)
      .setOrigin(0, 0)
      .setStrokeStyle(1, theme.colors.panelBorder, 0.9)
      .setVisible(false);
    this.listContainer = scene.add.container(0, config.height + 2);
    this.listContainer.setVisible(false);

    this.add([this.listBg, this.listContainer]);
    scene.add.existing(this);

    this.attachKeyboardListeners();

    // Hide list on scene shutdown — TextInput already cleans its own DOM.
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.hideList());
    this.once(Phaser.GameObjects.Events.DESTROY, () => this.hideList());
  }

  /**
   * Wire arrow-key + Esc handlers to the DOM input element. We can't
   * inspect TextInput's private input directly, so we attach a capturing
   * keydown listener at the document level and dispatch only when the
   * focused element is *our* DOM input.
   */
  private attachKeyboardListeners(): void {
    if (typeof document === "undefined") return;

    const handler = (ev: KeyboardEvent) => {
      const active = document.activeElement;
      // Only react when the focused element belongs to this textbox.
      // TextInput appends a single <input> per instance to document.body,
      // and there's no API for fetching it, so we check by-reference via
      // the focused element being an HTMLInputElement whose previous
      // sibling chain places it inside body and our component is mounted.
      if (!(active instanceof HTMLInputElement)) return;
      // Cheap proxy: only listen when this widget's list is visible OR
      // the input value matches what we last saw.
      if (!this.listVisible && active.value !== this.textInput.getValue()) {
        return;
      }
      if (ev.key === "ArrowDown") {
        if (this.currentMatches.length === 0) return;
        ev.preventDefault();
        this.highlight(
          (this.highlightedIndex + 1) % this.currentMatches.length,
        );
      } else if (ev.key === "ArrowUp") {
        if (this.currentMatches.length === 0) return;
        ev.preventDefault();
        this.highlight(
          (this.highlightedIndex - 1 + this.currentMatches.length) %
            this.currentMatches.length,
        );
      } else if (ev.key === "Escape") {
        ev.preventDefault();
        this.textInput.setValue("");
        this.onClear?.();
        this.onChange?.("");
        this.refreshMatches("");
      }
    };

    document.addEventListener("keydown", handler, true);
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      document.removeEventListener("keydown", handler, true);
    });
  }

  private commitHighlightedOrFirst(): void {
    if (this.currentMatches.length === 0) return;
    const pick =
      this.currentMatches[this.highlightedIndex] ?? this.currentMatches[0];
    if (pick) this.pick(pick);
  }

  private pick(item: T): void {
    this.textInput.setValue(item.label);
    this.onChange?.(item.label);
    this.onSelect?.(item);
    this.hideList();
  }

  private refreshMatches(query: string): void {
    if (query.trim() === "") {
      this.currentMatches = [];
      this.hideList();
      return;
    }
    this.currentMatches = filterAutocomplete(
      this.getSuggestions(query),
      query,
      {
        limit: this.maxSuggestions,
      },
    ) as T[];
    this.highlightedIndex = 0;
    this.renderList();
  }

  private renderList(): void {
    // Tear down old rows
    for (const r of this.rowBgs) r.destroy();
    for (const t of this.rowTexts) t.destroy();
    this.rowBgs = [];
    this.rowTexts = [];

    if (this.currentMatches.length === 0) {
      this.hideList();
      return;
    }

    const theme = getTheme();
    const w = this.width;
    const rh = this.rowHeight;

    this.listBg
      .setSize(w, rh * this.currentMatches.length + 4)
      .setVisible(true);

    this.currentMatches.forEach((m, i) => {
      const rowY = 2 + i * rh;
      const bg = this.scene.add
        .rectangle(0, rowY, w, rh, theme.colors.rowHover, 0)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      bg.on("pointerover", () => this.highlight(i));
      bg.on("pointerdown", () => this.pick(m));

      const text = this.scene.add
        .text(8, rowY + rh / 2, m.label, {
          fontSize: `${this.rowFontSize}px`,
          fontFamily: theme.fonts.body.family,
          color: colorToString(theme.colors.text),
        })
        .setOrigin(0, 0.5);

      if (m.sublabel) {
        // Right-aligned dim secondary text. We render it in the same row
        // as a separate Text object to avoid a layout pass.
        const sub = this.scene.add
          .text(w - 8, rowY + rh / 2, m.sublabel, {
            fontSize: `${this.rowFontSize}px`,
            fontFamily: theme.fonts.body.family,
            color: colorToString(theme.colors.textDim),
          })
          .setOrigin(1, 0.5);
        this.listContainer.add(sub);
        this.rowTexts.push(sub);
      }

      this.listContainer.add([bg, text]);
      this.rowBgs.push(bg);
      this.rowTexts.push(text);
    });

    this.listContainer.setVisible(true);
    this.listVisible = true;
    this.highlight(this.highlightedIndex);
  }

  private highlight(i: number): void {
    this.highlightedIndex = Math.max(
      0,
      Math.min(i, this.currentMatches.length - 1),
    );
    const theme = getTheme();
    this.rowBgs.forEach((bg, idx) => {
      bg.setFillStyle(
        theme.colors.rowHover,
        idx === this.highlightedIndex ? 0.9 : 0,
      );
    });
  }

  private hideList(): void {
    this.listBg.setVisible(false);
    this.listContainer.setVisible(false);
    this.listVisible = false;
  }

  /** Programmatically clear the input. */
  clear(): void {
    this.textInput.setValue("");
    this.refreshMatches("");
  }

  getValue(): string {
    return this.textInput.getValue();
  }

  focus(): void {
    this.textInput.focus();
  }
}
