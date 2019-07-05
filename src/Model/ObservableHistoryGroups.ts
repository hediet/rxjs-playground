import { observable, computed } from "mobx";
import {
	SchedulerLike,
	Observable,
	VirtualTimeScheduler,
	MonoTypeOperatorFunction,
	from,
	of,
} from "rxjs";
import { tap, flatMap, delay, map } from "rxjs/operators";
import { sortByNumericKey } from "../Components/utils";

export class ObservableHistoryGroups {
	public readonly groups = new Array<ObservableHistoryGroup>();

	public get minTimeDistanceBetweenItems(): number {
		let minDist = Number.MAX_VALUE;
		for (const o of this.groups) {
			minDist = Math.min(minDist, o.minTimeDistanceBetweenItems);
		}
		return minDist;
	}

	public get lastTime(): number {
		let last = -Infinity;
		for (const o of this.groups) {
			last = Math.max(last, o.lastTime);
		}
		return last;
	}

	public getResultingObservableHistoryOrUndefined(
		name: string
	): ObservableHistory | undefined {
		const group = this.groups.find(g => g.name === name);
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

export abstract class ObservableHistoryGroup {
	abstract get observables(): ReadonlyArray<ObservableHistory>;

	@observable public name: string;

	public readonly id = id++;

	constructor(name: string) {
		this.name = name;
	}

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
			map(e => e.data as T)
		);
	}

	public get last(): ObservableEvent {
		return this.events[this.events.length - 1];
	}

	public get first(): ObservableEvent {
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
