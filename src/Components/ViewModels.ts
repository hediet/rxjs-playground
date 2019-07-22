import {
	observable,
	computed,
	autorun,
	ObservableMap,
	action,
	runInAction,
} from "mobx";

import {
	ObservableGroup,
	ObservableHistory,
	ObservableGroups,
} from "../Model/ObservableGroups";
import { DragBehavior } from "../std/DragBehavior";
import { TSService } from "../Model/TSService";
import { EventTimer } from "@hediet/std/timer";

export class PlaygroundViewModel {
	constructor(public readonly groups: ObservableGroups) {}

	public readonly groupDragBehavior = new DragBehavior<
		ObservableGroupViewModel
	>();

	public readonly timedObjDragBehavior = new DragBehavior();

	public readonly typeScriptService = new TSService();

	@observable selectedGroup: ObservableGroup | undefined = undefined;

	public readonly recordingModel = new RecordingModel();
}

export class RecordingModel {
	private readonly timer = new EventTimer(20, "stopped");

	constructor() {
		//this.timer.onTick.sub(() => {

		//});
		this.update();
	}

	private update() {
		requestAnimationFrame(() => {
			runInAction("Update time", () => {
				this.currentDate = new Date();
			});
			this.update();
		});
	}

	@observable currentDate: Date = new Date();

	@action toggle(): void {
		if (this.isRecording) {
			this.stop();
		} else {
			this.start();
		}
	}

	@action
	public stop(): void {
		const t = this.currentRecordTime;
		this.recordStartDateTime = undefined;
		this.timer.stop();
		if (t) {
			this.startTime = t;
		}
	}

	private startTimes = new Array<number>();

	@action
	public start(): void {
		this.startTimes.push(this.startTime);
		this.timer.startImmediate();
		this.recordStartDateTime = new Date();
	}

	@action
	public resetStart(): void {
		if (this.startTimes.length > 0) {
			this.startTime = this.startTimes.pop()!;
		}
	}

	public get isRecording(): boolean {
		return !!this.recordStartDateTime;
	}

	@observable recordStartDateTime: Date | undefined = undefined;
	getRecordTime(date: Date): number | undefined {
		if (!this.recordStartDateTime) {
			return undefined;
		}
		const msDiff = date.getTime() - this.recordStartDateTime.getTime();
		return this.startTime + (msDiff * this.ticksPerSecond) / 1000;
	}

	get currentRecordTime(): number | undefined {
		return this.getRecordTime(this.currentDate);
	}

	get currentRecordTimeOrStart(): number {
		return this.currentRecordTime || this.startTime;
	}

	@observable startTime: number = 0;
	@observable ticksPerSecond: number = 100;
}

export class ObservableGroupViewModel {
	@observable public orderKey: number = 0;
	@observable public dragX: number | undefined = undefined;
	@observable public observables: ObservableViewModel[] = [];

	@observable public titleWidth: number = 0;

	@computed get width(): number {
		return Math.max(
			this.widthSum(this.observables.length),
			this.titleWidth
		);
	}

	widthSum(count: number): number {
		return Math.max(
			10,
			this.observables.slice(0, count).reduce((s, o) => s + o.width, 0)
		);
	}

	constructor(public readonly group: ObservableGroup) {
		autorun(() => {
			this.observables = group.observables.map(
				o => new ObservableViewModel(o)
			);
		});
	}
}

export class ObservableViewModel {
	@computed get width() {
		let max = 40;
		for (const width of this.textWidths.values()) {
			max = Math.max(max, width + 40);
		}
		return max;
	}

	public textWidths = new ObservableMap<number, number>();

	constructor(public readonly observable: ObservableHistory) {}
}
