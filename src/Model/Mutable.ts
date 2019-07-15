import {
	ObservableGroup,
	ObservableHistory,
	ObservableEvent,
} from "./ObservableGroups";
import { observable, action, computed } from "mobx";
import { sortByNumericKey } from "../std/utils";

export class MutableObservableHistoryGroup extends ObservableGroup {
	public readonly history = new MutableObservableHistory(this);
	public readonly observables = [this.history];

	public getAsJson(): string {
		const data = this.history.events.map(e => ({
			id: e.id,
			time: e.time,
			data: e.data,
		}));

		let result = `[\n`;
		let i = 0;
		for (const event of data) {
			i++;
			result += `    ${JSON.stringify(event)}`;
			if (i < data.length) {
				result += ",";
			}
			result += "\n";
		}
		result += `]`;
		return result;
	}

	public setJson(json: string) {
		//JSON.parse(json);
	}
}

export class MutableObservableHistory<T> extends ObservableHistory {
	constructor(private readonly parent: MutableObservableHistoryGroup) {
		super();
	}

	public get name(): string {
		return this.parent.name;
	}

	@observable private _events = new Array<MutableObservableEvent>();

	public readonly startTime: number = 0;
	@observable public endTime: number | undefined = undefined;

	@computed
	public get events(): ReadonlyArray<ObservableEvent> {
		return this._events.slice().sort(sortByNumericKey(e => e.time));
	}

	@action
	public clear(): void {
		this._events.length = 0;
	}

	@action
	public addEvent(time: number, data: T): MutableObservableEvent {
		const e = new MutableObservableEvent(time, data);
		this._events.push(e);
		return e;
	}

	@action
	public removeEvent(event: ObservableEvent): void {
		const idx = this._events.indexOf(event);
		this._events.splice(idx, 1);
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
