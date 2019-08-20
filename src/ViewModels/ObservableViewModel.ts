import { computed, ObservableMap, observable } from "mobx";
import { ObservableHistory, ObservableEvent } from "../Model/ObservableGroups";

export class ObservableViewModel {
	get margin(): number {
		return 40;
	}

	@observable selectedEventId: number = -1;
	@observable temporaryEventT: number | undefined = undefined;
	@observable contextMenuT: number | undefined = undefined;
	@observable endSelected = false;

	@computed get width() {
		const margin = this.margin;
		let max = margin;
		for (const width of this.textWidths.values()) {
			max = Math.max(max, width + margin);
		}
		for (const e of this.events) {
			if (e.data instanceof ChildObservableViewModel) {
				max = Math.max(max, e.data.xOffset + e.data.width + margin);
			}
		}
		return max;
	}

	public textWidths = new ObservableMap<number, number>();

	constructor(public readonly observable: ObservableHistory) {}

	@computed get events(): ObservableEvent[] {
		let last: ChildObservableViewModel | undefined;
		return this.observable.events.map(e => {
			if (e.data instanceof ObservableHistory) {
				const o = e.data;
				while (
					last &&
					last.observable.endTime &&
					last.observable.endTime < o.startTime
				) {
					last = last.previous;
				}

				const vm = new ChildObservableViewModel(o, last);
				last = vm;
				return {
					data: vm,
					id: e.id,
					time: e.time,
				} as ObservableEvent;
			}
			return e;
		});
	}
}

export class ChildObservableViewModel extends ObservableViewModel {
	get margin(): number {
		return 20;
	}

	get xOffset(): number {
		return this.previous ? this.previous.xOffset + this.previous.width : 20;
	}

	constructor(
		public readonly observable: ObservableHistory,
		public readonly previous: ChildObservableViewModel | undefined
	) {
		super(observable);
	}
}
