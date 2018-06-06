import * as log from "loglevel";
import {Point, Rectangle, Sprite, Text, Texture} from "pixi.js";
import {KeyCode} from "../../flashbang/input/KeyCode";
import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {DisplayUtil} from "../../flashbang/util/DisplayUtil";
import {Signal} from "../../signals/Signal";
import {EPars} from "../EPars";
import {ROPWait} from "../rscript/ROPWait";
import {BitmapManager} from "../util/BitmapManager";
import {Fonts} from "../util/Fonts";

type InteractionEvent = PIXI.interaction.InteractionEvent;

export enum PaletteTargetType {
    A = 0, U, G, C, AU, UG, GC
}

export function GetPaletteTargetBaseType(type: PaletteTargetType): number {
    switch (type) {
    case PaletteTargetType.A: return EPars.RNABASE_ADENINE;
    case PaletteTargetType.U: return EPars.RNABASE_URACIL;
    case PaletteTargetType.G: return EPars.RNABASE_GUANINE;
    case PaletteTargetType.C: return EPars.RNABASE_CYTOSINE;
    case PaletteTargetType.AU: return EPars.RNABASE_AU_PAIR;
    case PaletteTargetType.UG: return EPars.RNABASE_GU_PAIR;
    case PaletteTargetType.GC: return EPars.RNABASE_GC_PAIR;
    }
}

/*
 * Nucleotide palette class. Handles the AUCG nucleotides options as well as the pairs.
 * Has the option to turn into a 'no pair' mode.
 */
export class NucleotidePalette extends ContainerObject {
    /** Emitted when a palette target is clicked */
    public readonly targetClicked: Signal<PaletteTargetType> = new Signal();

    public constructor() {
        super();

        this.display.interactive = true;

        this._palette_image = BitmapManager.get_bitmap(BitmapManager.ImgPalette);
        this._palette_image_nopairs = BitmapManager.get_bitmap(BitmapManager.ImgPaletteNoPairs);
        this._select_pair_data = BitmapManager.get_bitmap(BitmapManager.ImgSelectPair);
        this._select_base_data = BitmapManager.get_bitmap(BitmapManager.ImgSelectBase);

        this._selection = new Sprite(this._select_base_data);
        this._palette_display = new Sprite(this._palette_image);
        this.container.addChild(this._palette_display);

        this._num_au = Fonts.arial("", 12).bold().build();
        this.container.addChild(this._num_au);
        this._num_ug = Fonts.arial("", 12).bold().build();
        this.container.addChild(this._num_ug);
        this._num_gc = Fonts.arial("", 12).bold().build();
        this.container.addChild(this._num_gc);

        this._targets = new Array(7);

        this._targets[PaletteTargetType.A] = new PaletteTarget(
            PaletteTargetType.A, "A", false, KeyCode.Digit1,
            [new Rectangle(9, 7, 25, 25)],
            "Mutate to <FONT COLOR='#FFFF33'>A (Adenine)</FONT>. (1)");

        this._targets[PaletteTargetType.U] = new PaletteTarget(
            PaletteTargetType.U, "U", false, KeyCode.Digit2,
            [new Rectangle(58, 7, 25, 25)],
            "Mutate to <FONT COLOR='#7777FF'>U (Uracil)</FONT>. (2)");

        this._targets[PaletteTargetType.G] = new PaletteTarget(
            PaletteTargetType.G, "G", false, KeyCode.Digit3,
            [new Rectangle(107, 7, 25, 25)],
            "Mutate to <FONT COLOR='#FF3333'>G (Guanine)</FONT>. (3)");

        this._targets[PaletteTargetType.C] = new PaletteTarget(
            PaletteTargetType.C, "C", false, KeyCode.Digit4,
            [new Rectangle(156, 7, 25, 25)],
            "Mutate to <FONT COLOR='#33FF33'>C (Cytosine)</FONT>. (4)");

        this._targets[PaletteTargetType.AU] = new PaletteTarget(
            PaletteTargetType.AU, "AU", true, KeyCode.KeyQ,
            [new Rectangle(31, 30, 30, 20), new Rectangle(37, 15, 22, 20)],
            "Mutate to pair (<FONT COLOR='#FFFF33'>A</FONT>, <FONT COLOR='#7777FF'>U</FONT>). (Q)");

        this._targets[PaletteTargetType.UG] = new PaletteTarget(
            PaletteTargetType.UG, "UG", true, KeyCode.KeyW,
            [new Rectangle(80, 30, 30, 20), new Rectangle(87, 15, 22, 20)],
            "Mutate to pair (<FONT COLOR='#FF3333'>G</FONT>, <FONT COLOR='#7777FF'>U</FONT>). (W)");

        this._targets[PaletteTargetType.GC] = new PaletteTarget(
            PaletteTargetType.GC, "GC", true, KeyCode.KeyE,
            [new Rectangle(127, 30, 30, 20), new Rectangle(137, 15, 22, 20)],
            "Mutate to pair (<FONT COLOR='#FF3333'>G</FONT>, <FONT COLOR='#33FF33'>C</FONT>). (E)");

        this._enabled = true;
        this._last_tooltip = null;

        this.regs.add(this.pointerDown.connect((e) => this.on_click(e)));
        this.regs.add(this.pointerMove.connect((e) => this.on_move_mouse(e)));
    }

    public set_override_default(): void {
        this._override_default_mode = true;
        this._override_no_pair_mode = false;
    }

    public set_override_no_pair(): void {
        this._override_no_pair_mode = true;
        this._override_default_mode = false;
    }

    public reset_overrides(): void {
        this._override_default_mode = false;
        this._override_no_pair_mode = false;
    }

    public change_default_mode(): void {
        if (this._override_no_pair_mode) {
            return;
        }
        this._palette_display.texture = this._palette_image;
        this._targets[PaletteTargetType.AU].enabled = true;
        this._targets[PaletteTargetType.UG].enabled = true;
        this._targets[PaletteTargetType.GC].enabled = true;
    }

    public change_no_pair_mode(): void {
        if (this._override_default_mode) {
            return;
        }
        this._palette_display.texture = this._palette_image_nopairs;
        this._targets[PaletteTargetType.AU].enabled = false;
        this._targets[PaletteTargetType.UG].enabled = false;
        this._targets[PaletteTargetType.GC].enabled = false;
    }

    /*override*/
    public set_disabled(is_disabled: boolean): void {
        this.display.alpha = (is_disabled ? 0.5 : 1);
        this._enabled = !is_disabled;
    }

    public get_bar_width(): number {
        return this._palette_display.width;
    }

    /*override*/
    // public on_key_down(key: number, ctrl: boolean, shift: boolean): boolean {
    //     if (key == KeyCode.KEY_1) {
    //         this.click_a();
    //         return true;
    //     } else if (key == KeyCode.KEY_2) {
    //         this.click_u();
    //         return true;
    //     } else if (key == KeyCode.KEY_3) {
    //         this.click_g();
    //         return true;
    //     } else if (key == KeyCode.KEY_4) {
    //         this.click_c();
    //         return true;
    //     } else if (key == KeyCode.KEY_Q) {
    //         this.click_au();
    //         return true;
    //     } else if (key == KeyCode.KEY_W) {
    //         this.click_ug();
    //         return true;
    //     } else if (key == KeyCode.KEY_E) {
    //         this.click_gc();
    //         return true;
    //     }
    //
    //     return super.on_key_down(key, ctrl, shift);
    // }

    public clickTarget(type: PaletteTargetType): void {
        let target: PaletteTarget = this._targets[type];
        if (!target.enabled) {
            return;
        }
        this.show_selection(target.hitboxes[0], target.isPair, true);
        ROPWait.NotifyClickUI(target.name);

        this.targetClicked.emit(type);
    }

    public clear_selection(): void {
        DisplayUtil.removeFromParent(this._selection);
    }

    public set_pair_counts(au: number, ug: number, gc: number): void {
        if (this._targets[PaletteTargetType.AU].enabled) {
            this._num_au.text = au.toString();
            this._num_au.position = new Point(57 - this._num_au.width, 1);
        }
        if (this._targets[PaletteTargetType.UG].enabled) {
            this._num_ug.text = ug.toString();
            this._num_ug.position = new Point(103 - this._num_ug.width, 1);
        }
        if (this._targets[PaletteTargetType.GC].enabled) {
            this._num_gc.text = gc.toString();
            this._num_gc.position = new Point(155 - this._num_gc.width, 1);
        }
    }

    private show_selection(selected_box: Rectangle, is_pair: boolean, do_show: boolean): void {
        if (!selected_box) return;

        if (is_pair) {
            this._selection.texture = this._select_pair_data;
        } else {
            this._selection.texture = this._select_base_data;
        }

        this._selection.position = new Point(selected_box.x, selected_box.y);
        if (do_show) {
            this.container.addChild(this._selection);
        } else {
            this.clear_selection();
        }
    }

    // Handle Click - Need to map position within the gameobject to action
    private on_click(e: InteractionEvent): void {
        if (!this._enabled) {
            return;
        }

        e.data.getLocalPosition(this.display, NucleotidePalette.P);
        let target: PaletteTarget = this.getTargetAt(NucleotidePalette.P.x, NucleotidePalette.P.y);
        if (target != null) {
            this.clickTarget(target.type);
        }
    }

    /** Returns the enabled target whose hitbox contains the given location */
    private getTargetAt(localX: number, localY: number): PaletteTarget | null {
        for (let target of this._targets) {
            if (!target.enabled) {
                continue;
            }

            for (let hitbox of target.hitboxes) {
                if (hitbox.contains(localX, localY)) {
                    return target;
                }
            }
        }

        return null;
    }

    private on_move_mouse(e: InteractionEvent): void {
        if (!this._enabled) {
            return;
        }

        e.data.getLocalPosition(this.display, NucleotidePalette.P);
        let target: PaletteTarget = this.getTargetAt(NucleotidePalette.P.x, NucleotidePalette.P.y);
        let tooltip: string = (target != null ? target.tooltip : null);

        if (tooltip != this._last_tooltip) {
            this._last_tooltip = tooltip;
            log.debug("TODO: show tooltip: " + tooltip);
            // if (tooltip == null) {
            //     this.set_mouse_over_object(null, 1.0);
            // } else {
            //     this.set_mouse_over_object(new TextBalloon(tooltip, 0x0, 0.8), 1.0);
            // }
        }
    }

    private readonly _palette_image: Texture;
    private readonly _palette_image_nopairs: Texture;
    private readonly _select_base_data: Texture;
    private readonly _select_pair_data: Texture;

    private readonly _palette_display: Sprite;
    private readonly _selection: Sprite;

    private readonly _num_au: Text;
    private readonly _num_ug: Text;
    private readonly _num_gc: Text;

    private _enabled: boolean;
    private _override_default_mode: boolean = false;
    private _override_no_pair_mode: boolean = false;
    private _last_tooltip: string;

    private readonly _targets: PaletteTarget[];

    private static readonly P: Point = new Point();
}

class PaletteTarget {
    public readonly type: PaletteTargetType;
    public readonly name: string;
    public readonly isPair: boolean;
    public readonly keyCode: string;
    public readonly hitboxes: Rectangle[];
    public readonly tooltip: string;
    public enabled: boolean = true;

    public constructor(type: PaletteTargetType, name: string, isPair: boolean, keyCode: string, hitboxes: Rectangle[], tooltip: string) {
        this.type = type;
        this.name = name;
        this.isPair = isPair;
        this.keyCode = keyCode;
        this.hitboxes = hitboxes;
        this.tooltip = tooltip;
    }
}