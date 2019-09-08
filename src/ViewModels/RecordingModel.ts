import { observable, action, runInAction } from "mobx";
import { MutableObservableGroup } from "../Model/MutableObservableGroup";

export class RecordingModel {
	@observable currentDate: Date = new Date();
	private startTimes = new Array<number>();
	@observable startTime: number = 0;
	@observable ticksPerSecond: number = 100;
	@observable recordStartDateTime: Date | undefined = undefined;

	public get isRecording(): boolean {
		return !!this.recordStartDateTime;
	}

	public getRecordTime(date: Date): number | undefined {
		if (!this.recordStartDateTime) {
			return undefined;
		}
		const msDiff = date.getTime() - this.recordStartDateTime.getTime();
		return this.startTime + (msDiff * this.ticksPerSecond) / 1000;
	}

	public get currentRecordTime(): number | undefined {
		return this.getRecordTime(this.currentDate);
	}

	public get currentRecordTimeOrStart(): number {
		return this.currentRecordTime || this.startTime;
	}

	private updateCurrentDateLoop() {
		requestAnimationFrame(() => {
			if (!this.recordStartDateTime) {
				return;
			}
			runInAction("Update time", () => {
				this.currentDate = new Date();
			});
			this.updateCurrentDateLoop();
		});
	}

	@action public toggleRecording(): void {
		if (this.isRecording) {
			this.stop();
		} else {
			this.start();
		}
	}

	@action
	public start(): void {
		this.updateCurrentDateLoop();
		this.startTimes.push(this.startTime);
		this.recordStartDateTime = new Date();
	}

	@action
	public stop(): void {
		const t = this.currentRecordTime;
		this.recordStartDateTime = undefined;
		if (t) {
			this.startTime = t;
		}
	}

	@action
	public resetStart(): void {
		if (this.startTimes.length > 0) {
			this.startTime = this.startTimes.pop()!;
		}
	}

	@action
	public reset() {
		this.startTime = 0;
		this.startTimes.length = 0;
		if (this.recordStartDateTime) {
			this.recordStartDateTime = undefined;
		}
	}

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
