import { observable, autorun } from "mobx";

import {
	ObservableGroup,
	ObservableHistory,
	ObservableGroups,
	SerializedObservable,
} from "../Model/ObservableGroups";
import { DragBehavior } from "../std/DragBehavior";
import { TSService } from "../Model/TSService";
import { MutableObservableGroup } from "../Model/MutableObservableGroup";
import { Subject } from "rxjs";
import { debounceTime } from "rxjs/operators";
import * as jsonUrl from "json-url";
import { deserialize } from "../Model/Deserializer";
import { TSComputedObservableGroup } from "../Model/TSComputedObservableGroup";
import { RecordingModel } from "./RecordingModel";
import { ObservableGroupViewModel } from "./ObservableGroupViewModel";
import { ObservableViewModel } from "./ObservableViewModel";

export class PlaygroundViewModel {
	private debounceSubject = new Subject<SerializedObservable[]>();
	public readonly groups = new ObservableGroups();

	constructor() {
		this.init();
	}

	private async init() {
		const codec = jsonUrl("lzma");

		const h = window.location.hash;
		if (h) {
			const data: any = await codec.decompress(h);
			deserialize(this.groups, this.typeScriptService, data);
		} else {
			this.groups.addGroup(new MutableObservableGroup());
			this.groups.addGroup(
				new TSComputedObservableGroup(
					this.typeScriptService,
					this.groups
				)
			);
		}

		autorun(() => {
			const serialized = this.groups.serialize();
			this.debounceSubject.next(serialized);
		});

		this.debounceSubject
			.pipe(debounceTime(1000))
			.forEach(async serialized => {
				const data = await codec.compress(serialized);
				window.location.hash = data;
			});
	}

	public readonly groupDragBehavior = new DragBehavior<
		ObservableGroupViewModel
	>();

	public readonly timedObjDragBehavior = new DragBehavior();

	public readonly typeScriptService = new TSService();

	@observable selectedGroup: ObservableGroup | undefined = undefined;

	public readonly recordingModel = new RecordingModel();
}
