import { TSService2 } from "./TSService2";
import {
	SerializedObservable,
	ObservableGroup,
	ObservableGroups,
} from "./ObservableGroups";
import { TSComputedObservableGroup2 } from "./TSComputedObservableGroup2";
import { MutableObservableGroup } from "./MutableObservableGroup";
import { runInAction } from "mobx";

export function deserialize(
	groups: ObservableGroups,
	tsService: TSService2,
	serialized: SerializedObservable[]
) {
	runInAction("Deserialize", () => {
		groups.clear();
		for (const s of serialized) {
			let o: ObservableGroup;
			if (s.type === "comp") {
				o = new TSComputedObservableGroup2(tsService, groups, s as any);
			} else {
				o = new MutableObservableGroup(s as any);
			}
			groups.addGroup(o);
		}
	});
}
