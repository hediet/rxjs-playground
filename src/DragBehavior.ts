import { observable, computed, autorun } from "mobx";
import { EventEmitter } from "@hediet/std/events";
import { Point } from "./Point";
import { Disposable } from "@hediet/std/disposable";

export class DragBehavior<TData> {
	@observable private activeOperation: DragOperation<TData> | undefined;

	public start(
		data: TData,
		relativeOffset: Point = Point.Zero
	): DragOperation<TData> {
		var op = new DragOperation<TData>(data, relativeOffset);
		op.onEnd.sub(() => (this.activeOperation = undefined));
		this.activeOperation = op;
		return op;
	}

	public isActive(): boolean {
		return this.activeOperation !== undefined;
	}
	public getActiveOperation(): DragOperation<TData> | undefined {
		return this.activeOperation;
	}

	public testActiveData(predicate: (data: TData) => boolean): boolean {
		if (!this.activeOperation) return false;

		return predicate(this.activeOperation.data);
	}
}

export class DragOperation<TData> {
	private readonly dispose = Disposable.fn();
	private lastMousePos: Point | undefined;
	private firstMousePos: Point | undefined = undefined;

	private _onDrag = new EventEmitter<{
		mousePos: Point;
		relativePos: Point;
		data: TData;
	}>();
	public readonly onDrag = this._onDrag.asEvent();

	private _onEnd = new EventEmitter<{
		mousePos: Point;
		relativePos: Point;
		cancelled: boolean;
		data: TData;
	}>();
	public readonly onEnd = this._onEnd.asEvent();

	constructor(
		public readonly data: TData,
		private readonly relativeOffset: Point
	) {
		let f2: any;
		window.addEventListener(
			"mousemove",
			(f2 = (e: MouseEvent) => {
				this.lastMousePos = new Point(e.clientX, e.clientY);
				if (!this.firstMousePos) this.firstMousePos = this.lastMousePos;

				this._onDrag.emit({
					mousePos: this.lastMousePos,
					relativePos: this.lastMousePos
						.sub(this.firstMousePos)
						.add(this.relativeOffset),
					data: this.data,
				});
			})
		);

		this.dispose.track({
			dispose: () => {
				window.removeEventListener("mousemove", f2);
			},
		});
	}

	public endOnMouseUp(button?: number) {
		let f1: any;
		window.addEventListener(
			"mouseup",
			(f1 = (e: MouseEvent) => {
				if (button === undefined || e.button === button) this.end();
			})
		);

		this.dispose.track({
			dispose: () => {
				window.removeEventListener("mouseup", f1);
			},
		});

		return this;
	}

	private endOrCancelled(cancelled: boolean) {
		this.dispose();
		this._onEnd.emit({
			mousePos: this.lastMousePos,
			relativePos: this.lastMousePos
				.sub(this.firstMousePos!)
				.add(this.relativeOffset),
			cancelled: false,
			data: this.data,
		});
	}

	public end(): void {
		this.endOrCancelled(false);
	}

	public cancel(): void {
		this.endOrCancelled(true);
	}
}
