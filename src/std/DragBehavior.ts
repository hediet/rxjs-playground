import { observable } from "mobx";
import { EventEmitter } from "@hediet/std/events";
import { Point, PointLike } from "./Point";
import { Disposable } from "@hediet/std/disposable";

export class PositionTransformation {
	constructor(public readonly transform: (position: Point) => Point) {}

	public then(
		nextTransform: (position: Point) => Point
	): PositionTransformation {
		return new PositionTransformation(p => {
			const p2 = this.transform(p);
			return nextTransform(p2);
		});
	}

	public relative(): PositionTransformation {
		let first: Point | undefined = undefined;
		return this.then(p => {
			if (!first) {
				first = p;
			}
			return p.sub(first);
		});
	}

	public translate(offset: PointLike): PositionTransformation {
		return this.then(p => p.add(offset));
	}
}

export const identity = new PositionTransformation(p => p);

export class DragBehavior<TData> {
	@observable private _activeOperation: DragOperation<TData> | undefined;
	@observable private _previousOperation: DragOperation<TData> | undefined;

	public start(
		data: TData,
		mousePositionTransformation = identity
	): DragOperation<TData> {
		var op = new DragOperation<TData>(data, mousePositionTransformation);
		op.onEnd.sub(() => {
			this._previousOperation = this._activeOperation;
			this._activeOperation = undefined;
		});
		this._activeOperation = op;
		return op;
	}

	public get isActive(): boolean {
		return this._activeOperation !== undefined;
	}
	public get activeOperation(): DragOperation<TData> | undefined {
		return this._activeOperation;
	}
	public get previousOperation(): DragOperation<TData> | undefined {
		return this._previousOperation;
	}
	public get activeOrPreviousOperation(): DragOperation<TData> | undefined {
		return this.activeOperation || this.previousOperation;
	}

	public testActiveData(predicate: (data: TData) => boolean): boolean {
		if (!this._activeOperation) return false;

		return predicate(this._activeOperation.data);
	}

	public isDataEqualTo(data: TData): boolean {
		return this.testActiveData(d => d === data);
	}
}

export class DragOperation<TData> {
	private readonly dispose = Disposable.fn();
	private lastPosition: Point | undefined;

	private _onDrag = new EventEmitter<{
		position: Point;
		data: TData;
	}>();
	public readonly onDrag = this._onDrag.asEvent();

	private _onEnd = new EventEmitter<{
		position: Point;
		cancelled: boolean;
		data: TData;
	}>();
	public readonly onEnd = this._onEnd.asEvent();

	public readonly handleMouseEvent = (e: MouseEvent) => {
		this.lastPosition = this.mousePositionTransformation.transform(
			new Point(e.clientX, e.clientY)
		);

		this._onDrag.emit({
			position: this.lastPosition!,
			data: this.data,
		});
	};

	constructor(
		public readonly data: TData,
		private readonly mousePositionTransformation: PositionTransformation
	) {
		window.addEventListener("mousemove", this.handleMouseEvent);

		this.dispose.track({
			dispose: () => {
				window.removeEventListener("mousemove", this.handleMouseEvent);
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
			position: this.lastPosition!,
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
