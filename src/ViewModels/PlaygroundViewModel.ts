import { observable } from "mobx";

import { ObservableGroup, ObservableGroups } from "../Model/ObservableGroups";
import { DragBehavior } from "../std/DragBehavior";
import { TSService2 } from "../Model/TSService2";
import { RecordingModel } from "./RecordingModel";
import { ObservableGroupViewModel } from "./ObservableGroupViewModel";

export class PlaygroundViewModel {
	public readonly groups = new ObservableGroups();

	public readonly groupDragBehavior = new DragBehavior<
		ObservableGroupViewModel
	>();

	public readonly timedObjDragBehavior = new DragBehavior();

	public readonly typeScriptService = new TSService2();

	@observable selectedGroup: ObservableGroup | undefined = undefined;

	public readonly recordingModel = new RecordingModel();
}
