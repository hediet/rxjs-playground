import { observable, action, runInAction } from "mobx";
import { MutableObservableGroup } from "../Model/MutableObservableGroup";

export class RecordingModel {
	constructor() {
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
		if (t) {
			this.startTime = t;
		}
	}

	private startTimes = new Array<number>();

	@action
	public start(): void {
		this.startTimes.push(this.startTime);
		this.recordStartDateTime = new Date();
	}

	@action
	public resetStart(): void {
		if (this.startTimes.length > 0) {
			this.startTime = this.startTimes.pop()!;
		}
	}

	@action
	reset() {
		this.startTime = 0;
		this.startTimes.length = 0;
		if (this.recordStartDateTime) {
			this.recordStartDateTime = undefined;
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

	@action
	public emitIfRecording(
		to: MutableObservableGroup,
		what?: { value: unknown }
	) {
		const t = this.currentRecordTime;
		if (t) {
			let value: unknown = to.history.events.length + 1;
			if (what) {
				value = what.value;
			}
			to.history.addEvent(t, value);
		}
	}
}
