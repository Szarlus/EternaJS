import * as log from 'loglevel';
import {Application, Sprite} from "pixi.js";
import {AppMode} from "../flashbang/core/AppMode";
import {FlashbangApp} from "../flashbang/core/FlashbangApp";
import {HLayoutContainer} from "../flashbang/layout/HLayoutContainer";
import {TextureUtil} from "../flashbang/util/TextureUtil";
import {PoseTestMode} from "./debug/PoseTestMode";
import {Folder} from "./folding/Folder";
import {FolderManager} from "./folding/FolderManager";
import {Vienna} from "./folding/Vienna";
import {BaseAssets} from "./pose2D/BaseAssets";
import {BitmapManager} from "./util/BitmapManager";
import {ColorUtil} from "./util/ColorUtil";
import {Fonts} from "./util/Fonts";

export class EternaApp extends FlashbangApp {
    protected createPixi(): Application {
        return new Application(1024, 768, {backgroundColor: 0x061A34});
    }

    /*override*/
    protected setup(): void {
        Promise.all([this.initFoldingEngines(), Fonts.loadFonts()])
            .then(() => {
                this._modeStack.pushMode(new PoseTestMode());
            });
    }

    private initFoldingEngines(): Promise<void> {
        log.info("Initializing folding engines...");
        return Promise.all([Vienna.create()])
            .then((folders: Folder[]) => {
                log.info("Folding engines intialized");
                for (let folder of folders) {
                    FolderManager.instance.add_folder(folder);
                }
            })
            .catch((e) => log.error("Error loading folding engines: ", e));
    }
}

class LoadingMode extends AppMode {
    protected setup(): void {

    }
}

class TestMode extends AppMode {
    protected setup(): void {
        // this.addObject(new Background(20, false), this.modeSprite);

        TextureUtil.load(BitmapManager.pose2DURLs).then(() => {
            let bitmaps = [
                BaseAssets.draw_circular_barcode(16, 6, 0.5),
                BaseAssets.createSatelliteBitmaps(ColorUtil.colorTransform(1, 1, 1, 1, 0, 0, 0, 0))[0],
                BaseAssets.createSatelliteBitmaps(ColorUtil.colorTransform(1, 1, 1, 0.5, 0, 0, 0, 0))[0],
                BaseAssets.createSatelliteBitmaps(ColorUtil.colorTransform(2, 2, 2, 2, 0, 0, 0, 0))[0],
            ];

            let container: HLayoutContainer = new HLayoutContainer();
            for (let tex of bitmaps) {
                container.addChild(new Sprite(tex));
            }
            container.layout();
            this.modeSprite.addChild(container);
        }).catch((e: any) => log.error(e));
    }
}
