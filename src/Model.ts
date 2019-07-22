import { PlaygroundViewModel } from "./Components/ViewModels";
import { ObservableGroups } from "./Model/ObservableGroups";
import { MutableObservableGroup } from "./Model/MutableObservableGroup";
import { TSComputedObservableGroup } from "./Model/TSComputedObservableGroup";

export class Model {
	public readonly playground = new PlaygroundViewModel(
		new ObservableGroups()
	);

	constructor() {
		this.playground.groups.addGroup(new MutableObservableGroup());
		this.playground.groups.addGroup(
			new TSComputedObservableGroup(
				this.playground.typeScriptService,
				this.playground.groups
			)
		);
	}
}
