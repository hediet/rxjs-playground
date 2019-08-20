import { TsService } from "./TsService";
import {
	SerializedObservable,
	ObservableGroup,
	ObservableGroups,
} from "./ObservableGroups";
import { TsComputedObservableGroup } from "./TsComputedObservableGroup";
import { MutableObservableGroup } from "./MutableObservableGroup";
import { runInAction } from "mobx";

export function deserializeGroups(
	groups: ObservableGroups,
	tsService: TsService,
	serialized: SerializedObservable[]
) {
	runInAction("Deserialize", () => {
		groups.clear();
		for (const s of serialized) {
			let o: ObservableGroup;
			if (s.type === "comp") {
				o = new TsComputedObservableGroup(tsService, groups, s as any);
			} else {
				o = new MutableObservableGroup(s as any);
			}
			groups.addGroup(o);
		}
	});
}
