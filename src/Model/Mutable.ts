import {
	ObservableGroup,
	ObservableHistory,
	ObservableEvent,
} from "./ObservableGroups";
import { observable, action, computed, autorun, runInAction } from "mobx";
import { sortByNumericKey } from "../std/utils";
import * as monaco from "monaco-editor";
import { Subject } from "rxjs";
import { debounceTime } from "rxjs/operators";
import { disposeOnUnmount } from "mobx-react";

export class MutableObservableHistoryGroup extends ObservableGroup {
	public readonly history = new MutableObservableHistory(this);
	public readonly observables = [this.history];

	private mainUri = monaco.Uri.parse(
		`file:///mutableObservableGroup${this.id}.json`
	);
	public readonly model = monaco.editor.createModel(
		this.getAsJson(),
		"json",
		this.mainUri
	);

	private getAsJson(): string {
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

	private setJson(json: string) {
		try {
			const result = JSON.parse(json) as {
				id: number;
				time: number;
				data: unknown;
			}[];
			runInAction("Update history", () => {
				this.history.clear();
				for (const item of result) {
					this.history.addEvent(item.time, item.data, item.id);
				}
			});
		} catch (e) {
			console.error(e);
		}
	}

	private debounceSubject = new Subject<string>();

	constructor() {
		super();

		let updating = false;
		autorun(() => {
			const json = this.getAsJson();
			if (!updating) {
				this.debounceSubject.next(json);
			}
		});

		this.debounceSubject.pipe(debounceTime(100)).forEach(json => {
			if (!updating) {
				updating = true;
				this.model.setValue(json);
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
}

export class MutableObservableHistory<T> extends ObservableHistory {
	constructor(private readonly parent: MutableObservableHistoryGroup) {
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
		if (id) {
			this.id = id;
		}
	}
}
