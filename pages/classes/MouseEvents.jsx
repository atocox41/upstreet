export class MouseEvents {
    /**
     * 
     * @param {EventTarget} target 
     * @param {Function} callback 
     */
    constructor(target, callback) {
        // super();
        this.target = target;
        this.callback = callback;
        this.isHeld = false;
        this.activeHoldTimeoutId = null;

        ["mousedown", "touchstart"].forEach(type => {
            this.target.addEventListener(type, this._onHoldStart.bind(this))
        });

        ["mouseup", "mouseleave", "mouseout", "touchend", "touchcancel"].forEach(type => {
            this.target.addEventListener(type, this._onHoldStart.bind(this))
        });
    }

    _onHoldStart() {
        this.isHeld = true;

        this.activeHoldTimeoutId = setTimeout(() => {
            if(this.isHeld) {
                this.callback();
            }
        }, 1000);
    }

    _onHoldEnd() {
        this.isHeld = false;
        clearTimeout(this.activeHoldTimeoutId)
    }
}