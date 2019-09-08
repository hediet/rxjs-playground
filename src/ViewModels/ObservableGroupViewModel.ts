import { observable, computed, autorun, reaction } from "mobx";
import { ObservableGroup } from "../Model/ObservableGroups";
import { ObservableViewModel } from "./ObservableViewModel";
import { Disposable } from "@hediet/std/disposable";

export class ObservableGroupViewModel {
	@observable public dragX: number | undefined = undefined;
	@observable public observables: ObservableViewModel[] = [];

	@observable public titleWidth: number = 0;

	@computed get width(): number {
		return Math.max(
			this.widthSum(this.observables.length),
			this.titleWidth
		);
	}

	public readonly dispose = Disposable.fn();

	widthSum(count: number): number {
		return Math.max(
			10,
			this.observables.slice(0, count).reduce((s, o) => s + o.width, 0)
		);
	}

	constructor(public readonly group: ObservableGroup) {
		this.dispose.track({
			dispose: reaction(
				() => group.observables.map(o => new ObservableViewModel(o)),
				observables => {
					this.observables = observables;
				},
				{ name: "Update observable view models", fireImmediately: true }
			),
		});
	}
}
