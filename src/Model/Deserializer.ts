import { TSService } from "./TSService";
import {
	SerializedObservable,
	ObservableGroup,
	ObservableGroups,
} from "./ObservableGroups";
import { TSComputedObservableGroup } from "./TSComputedObservableGroup";
import { MutableObservableGroup } from "./MutableObservableGroup";
import { runInAction } from "mobx";

export function deserialize(
	groups: ObservableGroups,
	tsService: TSService,
	serialized: SerializedObservable[]
) {
	runInAction("Deserialize", () => {
		groups.clear();
		for (const s of serialized) {
			let o: ObservableGroup;
			if (s.type === "comp") {
				o = new TSComputedObservableGroup(tsService, groups, s as any);
			} else {
				o = new MutableObservableGroup(s as any);
			}
			groups.addGroup(o);
		}
	});
}
