import { observable, computed, autorun, ObservableMap } from "mobx";

import {
	ObservableGroup,
	ObservableHistory,
	ObservableGroups,
} from "../Model/ObservableGroups";
import { DragBehavior } from "../std/DragBehavior";
import { TypeScriptService } from "../Model/TypeScriptService";

export class PlaygroundViewModel {
	constructor(public readonly groups: ObservableGroups) {}

	public readonly groupDragBehavior = new DragBehavior<
		ObservableGroupViewModel
	>();

	public readonly timedObjDragBehavior = new DragBehavior();

	public readonly typeScriptService = new TypeScriptService();

	@observable selectedGroup: ObservableGroup | undefined = undefined;

	@observable recording: boolean = false;
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
