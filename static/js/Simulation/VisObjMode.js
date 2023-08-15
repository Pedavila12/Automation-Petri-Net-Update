import { delay, shuffle } from "../utils/utils.js";
import { SimulationBaseMode } from "./BaseMode.js";
export class SimulationVisObjMode extends SimulationBaseMode {
    enebledTransitions = [];
    async update() {
        const animations = [];
        for (const trans of this.enebledTransitions) {
            if (trans.checkArcs()) {
                trans.fire();
                animations.push(this.graphics.fireTrans(trans));
            }
        }
        await Promise.all(animations);
        this.enebledTransitions = [];
        this.updateInputValues();
        const transInOrder = this.net.simConfig.priorityMode === "random" ?
            shuffle(this.net.transInOrder) :
            this.net.transInOrder;
        for (const trans of transInOrder) {
            this.updateTrans(trans);
            this.graphics.debugTrans(trans);
            if (this.net.simConfig.guardDebug)
                this.graphics.debugGuard(trans);
            if (trans.isEnable())
                this.enebledTransitions.push(trans);
        }
        if (this.net.simConfig.arcDebug)
            Object.values(this.net.arcs).forEach(this.graphics.debugArc);
        this.updateSimTime();
        await delay(50);
    }
}
