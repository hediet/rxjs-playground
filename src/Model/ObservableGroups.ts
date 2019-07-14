import { observable } from "mobx";
import { SchedulerLike, Observable, from, of, NEVER } from "rxjs";
import { flatMap, delay, map, concat } from "rxjs/operators";

export class ObservableGroups {
	@observable private readonly _groups = new Set<ObservableGroup>();
	public get groups(): ReadonlySet<ObservableGroup> {
		return this._groups;
	}

	public addGroup(group: ObservableGroup) {
		this._groups.add(group);
	}

	public removeGroup(group: ObservableGroup) {
		this._groups.delete(group);
	}

	public get minTimeDistanceBetweenItems(): number {
		let minDist = Number.MAX_VALUE;
		for (const o of this._groups) {
			minDist = Math.min(minDist, o.minTimeDistanceBetweenItems);
		}
		return minDist;
	}

	public get lastTime(): number {
		let last = -Infinity;
		for (const o of this._groups) {
			last = Math.max(last, o.lastTime);
		}
		return last;
	}

	public getResultingObservableHistoryOrUndefined(
		name: string
	): ObservableHistory | undefined {
		const group = [...this._groups].find(g => g.name === name);
		if (group) {
			return group.resultingObservableHistory;
		}
		return undefined;
	}

	public getResultingObservableHistory(name: string): ObservableHistory {
		const r = this.getResultingObservableHistoryOrUndefined(name);
		if (!r) {
			throw new Error(`"${name}" does not exist.`);
		}
		return r;
	}

	public getResultingObservable<T>(
		name: string,
		scheduler: SchedulerLike
	): Observable<T> {
		const r = this.getResultingObservableHistory(name);
		if (!r) {
			throw new Error(`"${name}" does not exist.`);
		}
		return r.asObservable<T>(scheduler);
	}
}

let id = 0;

export abstract class ObservableGroup {
	abstract get observables(): ReadonlyArray<ObservableHistory>;

	public readonly id = id++;

	@observable public name: string = `group ${this.id}`;
	@observable public position: number = 0;

	public getPositionSortKey(idx: number) {
		return idx + this.position * 100000;
	}

	constructor() {}

	public get minTimeDistanceBetweenItems(): number {
		let minDist = Number.MAX_VALUE;
		for (const o of this.observables) {
			minDist = Math.min(minDist, o.minTimeDistanceBetweenItems);
		}
		return minDist;
	}

	public get lastTime(): number {
		let last = -Infinity;
		for (const o of this.observables) {
			if (o.last) {
				last = Math.max(last, o.last.time);
			}
		}
		return last;
	}

	public get resultingObservableHistory(): ObservableHistory | undefined {
		return this.observables[this.observables.length - 1];
	}
}

export abstract class ObservableHistory {
	// are always sorted
	public abstract get events(): ReadonlyArray<ObservableEvent>;

	public asObservable<T>(scheduler: SchedulerLike): Observable<T> {
		return from(this.events).pipe(
			flatMap(v => of(v).pipe(delay(v.time, scheduler))),
			map(e => e.data as T),

			concat(NEVER)
		);
	}

	public abstract get name(): string;

	public abstract get startTime(): number;
	public abstract get endTime(): number | undefined;

	public get last(): ObservableEvent | undefined {
		return this.events[this.events.length - 1];
	}

	public get first(): ObservableEvent | undefined {
		return this.events[0];
	}

	public get minTimeDistanceBetweenItems(): number {
		let minDist = Infinity;
		const e = this.events;
		for (let i = 1; i < e.length; i++) {
			const dist = e[i].time - e[i - 1].time;
			if (dist != 0) {
				minDist = Math.min(minDist, dist);
			}
		}
		return minDist;
	}
}

export interface ObservableEvent {
	readonly id: number;
	readonly time: number;
	readonly data: unknown;
}
