import { observable, action } from "mobx";
import { from, identity, NEVER, Observable, of, SchedulerLike } from "rxjs";
import { concat, delay, flatMap, map, takeUntil } from "rxjs/operators";

export class ObservableGroups {
	@observable private readonly _groups = new Set<ObservableGroup>();
	public get groups(): ReadonlySet<ObservableGroup> {
		return this._groups;
	}

	public addGroup(group: ObservableGroup) {
		group.position = this.groups.size;
		this._groups.add(group);
	}

	public removeGroup(group: ObservableGroup) {
		group.dispose();
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

	public serialize(): SerializedObservable[] {
		const v = [...this.groups.values()];
		v.sort((a, b) => a.position - b.position);
		return v.map(g => g.serialize());
	}

	@action
	public clear() {
		for (const g of this._groups) {
			g.dispose();
		}
		this._groups.clear();
	}
}

export type SerializedObservable<T = {}> = {
	name: string;
	type: "comp" | "mut";
} & T;

export abstract class ObservableGroup {
	private static id = 1;
	public readonly id = ObservableGroup.id++;

	abstract get observables(): ReadonlyArray<ObservableHistory>;

	public readonly dispose = Disposable.fn();

	@observable public name: string = `obs${this.id}`;
	@observable public position: number = 0;

	public getPositionSortKey(idx: number) {
		return idx + this.position * 100000;
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

	public abstract serialize(): SerializedObservable;

	public get resultingObservableHistory(): ObservableHistory | undefined {
		return this.observables[this.observables.length - 1];
	}

	public abstract reset(): void;
}

import jsonToTs from "json-to-ts";
import { Disposable } from "@hediet/std/disposable";

export abstract class ObservableHistory {
	private static id = 1;
	public readonly id = ObservableHistory.id++;

	// are sorted by time
	public abstract get events(): ReadonlyArray<ObservableEvent>;

	public asObservable<T>(scheduler: SchedulerLike): Observable<T> {
		return from(this.events).pipe(
			flatMap(v => of(v).pipe(delay(v.time, scheduler))),
			map(e => e.data as T),
			concat(NEVER),
			this.endTime
				? takeUntil(from([0]).pipe(delay(this.endTime, scheduler)))
				: identity
		);
	}

	public get typescriptType(): { typeDeclarations: string; type: string } {
		const decls = jsonToTs({ root: this.events.map(e => e.data) });

		return {
			type: `O${this.id}.RootObject["root"][0]`,
			typeDeclarations: `module O${this.id} { ${decls.join("\n")} }`,
		};
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
