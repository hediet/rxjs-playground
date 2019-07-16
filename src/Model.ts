import { PlaygroundViewModel } from "./Components/ViewModels";
import { ObservableGroups } from "./Model/ObservableGroups";
import { MutableObservableHistoryGroup } from "./Model/Mutable";
import { TypeScriptTrackingObservableGroup } from "./Model/TypeScriptTrackingObservableGroup";

export class Model {
	public readonly playground = new PlaygroundViewModel(
		new ObservableGroups()
	);

	constructor() {
		this.playground.groups.addGroup(new MutableObservableHistoryGroup());
		this.playground.groups.addGroup(
			new TypeScriptTrackingObservableGroup(
				this.playground.typeScriptService,
				this.playground.groups
			)
		);
	}
}
