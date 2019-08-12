import {
	ObservableGroup,
	ObservableHistory,
	ObservableEvent,
	SerializedObservable,
} from "./ObservableGroups";
import { observable, action, computed, autorun, runInAction } from "mobx";
import { sortByNumericKey } from "../std/utils";
import * as monaco from "monaco-editor";
import { Subject } from "rxjs";
import { debounceTime } from "rxjs/operators";

interface Data {
	id: number;
	time: number;
	data: unknown;
}

type MutableObservableData = SerializedObservable<{
	data: Data[];
	end?: number;
}>;

export class MutableObservableGroup extends ObservableGroup {
	public readonly history = new MutableObservableHistory(this);
	public readonly observables = [this.history];

	private mainUri = monaco.Uri.parse(
		`file:///mutableObservableGroup${this.id}.json`
	);
	public readonly model = monaco.editor.createModel(
		this.getJson(),
		"json",
		this.mainUri
	);

	public serialize(): MutableObservableData {
		return {
			type: "mut",
			data: this.data,
			name: this.name,
			end: this.history.endTime,
		};
	}

	@action
	private setData(data: Data[]) {
		this.history.clear();
		for (const item of data) {
			this.history.addEvent(item.time, item.data, item.id);
		}
	}

	@computed
	private get data(): Data[] {
		const data = this.history.events.map(e => ({
			id: e.id,
			time: e.time,
			data: e.data,
		}));
		return data;
	}

	private getJson(): string {
		const data = this.data;
		// we manually do a json serialize
		// to get a more suitable formatting
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

	private setJson(json: string) {
		try {
			const result = JSON.parse(json) as Data[];
			this.setData(result);
		} catch (e) {
			console.error(e);
		}
	}

	private debounceSubject = new Subject<string>();

	constructor(data?: MutableObservableData) {
		super();

		if (data) {
			this.setData(data.data);
			this.name = data.name;
			this.history.endTime = data.end;
		}

		let updating = false;
		autorun(() => {
			const json = this.getJson();
			if (!updating) {
				this.debounceSubject.next(json);
			}
		});

		this.debounceSubject.pipe(debounceTime(100)).forEach(json => {
			if (!updating) {
				updating = true;
				this.model.pushEditOperations(
					[],
					[{ range: this.model.getFullModelRange(), text: json }],
					() => []
				);
				this.model.pushStackElement();
				updating = false;
			}
		});

		this.model.onDidChangeContent(() => {
			if (!updating) {
				updating = true;
				this.setJson(this.model.getValue());
				updating = false;
			}
		});
	}

	public reset(): void {
		this.history.clear();
	}
}

export class MutableObservableHistory<T> extends ObservableHistory {
	constructor(private readonly parent: MutableObservableGroup) {
		super();
	}

	public get name(): string {
		return this.parent.name;
	}

	@observable private _events = new Map<number, MutableObservableEvent>();

	public readonly startTime: number = 0;
	@observable public endTime: number | undefined = undefined;

	@computed
	public get events(): ReadonlyArray<ObservableEvent> {
		return [...this._events.values()].sort(sortByNumericKey(e => e.time));
	}

	@action
	public clear(): void {
		this._events.clear();
	}

	@action
	public addEvent(
		time: number,
		data: T,
		id?: number
	): MutableObservableEvent {
		const e = new MutableObservableEvent(time, data, id);
		if (this._events.has(e.id)) {
			throw new Error(`An event with id "${e.id}" already exists!`);
		}
		this._events.set(e.id, e);
		return e;
	}

	@action
	public removeEvent(event: ObservableEvent): void {
		this._events.delete(event.id);
	}
}

let globalId = 0;

export class MutableObservableEvent implements ObservableEvent {
	@observable public time: number;
	@observable public data: unknown;
	public readonly id = globalId++;

	constructor(time: number, data: unknown, id?: number) {
		this.time = time;
		this.data = data;
		if (id !== undefined) {
			this.id = id;
		}
	}
}
