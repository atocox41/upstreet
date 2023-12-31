import { MotionManagerOptions } from '../cubism-common';
import { ExpressionManager } from '../cubism-common/ExpressionManager';
import { Cubism4ModelSettings } from '../cubism4/Cubism4ModelSettings';
import { CubismSpec } from '../../cubism/src/CubismSpec';
import { CubismModel } from '../../cubism/src/model/cubismmodel';
import { CubismExpressionMotion } from '../../cubism/src/motion/cubismexpressionmotion';
import { CubismMotionQueueManager } from '../../cubism/src/motion/cubismmotionqueuemanager';

export class Cubism4ExpressionManager extends ExpressionManager<CubismExpressionMotion, CubismSpec.Expression> {
    readonly queueManager = new CubismMotionQueueManager();

    readonly definitions: CubismSpec.Expression[];

    constructor(settings: Cubism4ModelSettings, options?: MotionManagerOptions) {
        super(settings, options);

        this.definitions = settings.expressions ?? [];

        this.init();
    }

    isFinished(): boolean {
        return this.queueManager.isFinished();
    }

    getExpressionIndex(name: string): number {
        return this.definitions.findIndex(def => def.Name === name);
    }

    getExpressionFile(definition: CubismSpec.Expression): string {
        return definition.File;
    }

    createExpression(data: object, definition: CubismSpec.Expression | undefined) {
        return CubismExpressionMotion.create(data as unknown as CubismSpec.ExpressionJSON);
    }

    protected _setExpression(motion: CubismExpressionMotion): number {
        return this.queueManager.startMotion(motion, false, performance.now());
    }

    protected stopAllExpressions(): void {
        this.queueManager.stopAllMotions();
    }

    protected updateParameters(model: CubismModel, now: DOMHighResTimeStamp): boolean {
        return this.queueManager.doUpdateMotion(model, now);
    }
}
