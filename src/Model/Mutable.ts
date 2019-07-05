import {
	ObservableHistoryGroup,
	ObservableHistory,
	ObservableEvent,
} from "./ObservableHistoryGroups";
import { observable, action, computed } from "mobx";
import { sortByNumericKey } from "../Components/utils";

export class MutableObservableHistoryGroup extends ObservableHistoryGroup {
	public readonly history = new MutableObservableHistory();
	public readonly observables = [this.history];
}

export class MutableObservableHistory<T> extends ObservableHistory {
	@observable private _events = new Array<MutableObservableEvent>();

	@computed
	public get events(): ReadonlyArray<ObservableEvent> {
		return this._events.slice().sort(sortByNumericKey(e => e.time));
	}

	@action
	public addEvent(time: number, data: T): MutableObservableEvent {
		const e = new MutableObservableEvent(time, data);
		this._events.push(e);
		return e;
	}
}

let id = 0;

export class MutableObservableEvent implements ObservableEvent {
	@observable public time: number;
	@observable public data: unknown;
	public readonly id = id++;

	constructor(time: number, data: unknown) {
		this.time = time;
		this.data = data;
	}
}
