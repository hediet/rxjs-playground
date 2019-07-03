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

export class ObservableHistoryGroups {
	public readonly groups = new Set<ObservableHistoryGroup>();

	public get minTimeDistanceBetweenItems(): number {
		let minDist = Number.MAX_VALUE;
		for (const o of this.groups) {
			minDist = Math.min(minDist, o.minTimeDistanceBetweenItems);
		}
		return minDist;
	}

	public get lastTime(): number {
		let last = 0;
		for (const o of this.groups) {
			last = Math.max(last, o.lastTime);
		}
		return last;
	}

	public getResultingObservableHistory(
		name: string
	): ObservableHistory | undefined {}
}

export abstract class ObservableHistoryGroup {
	abstract get observables(): ReadonlyArray<ObservableHistory>;

	public get minTimeDistanceBetweenItems(): number {
		let minDist = Number.MAX_VALUE;
		for (const o of this.observables) {
			minDist = Math.min(minDist, o.minTimeDistanceBetweenItems);
		}
		return minDist;
	}

	public get lastTime(): number {
		let last = 0;
		for (const o of this.observables) {
			last = Math.max(last, o.last.time);
		}
		return last;
	}

	public get resultingObservableHistory(): ObservableHistory | undefined {
		return this.observables[this.observables.length - 1];
	}
}

export abstract class ObservableHistory {
	public abstract get events(): ReadonlyArray<ObservableEvent>;

	public asObservable(scheduler: SchedulerLike): Observable<unknown> {
		return from(this.events).pipe(
			flatMap(v => of(v).pipe(delay(v.time, scheduler))),
			map(e => e.data)
		);
	}

	public get last(): ObservableEvent {
		return this.events[this.events.length - 1];
	}

	public get first(): ObservableEvent {
		return this.events[0];
	}

	public get minTimeDistanceBetweenItems(): number {
		let minDist = Number.MAX_VALUE;
		for (let i = 1; i < this.events.length; i++) {
			const dist = this.events[i].time - this.events[i - 1].time;
			if (dist != 0) {
				minDist = Math.min(minDist, dist);
			}
		}
		return minDist;
	}
}

export class ObservableEvent {
	constructor(public readonly data: unknown, public readonly time: number) {}
}

export type TrackFn = <T>() => MonoTypeOperatorFunction<T>;

export class TrackingHistoryGroup extends ObservableHistoryGroup {
	@computed
	public get observables(): ObservableHistory[] {
		const scheduler = new VirtualTimeScheduler();
		const observables = new Array<ObservableHistory>();

		const trackFn: TrackFn = <T>() => {
			const history = new TrackingObservableHistory();
			observables.push(history);
			return tap(n => {
				history.trackedEvents.push(
					new ObservableEvent(n, scheduler.now())
				);
			});
		};
		const obs = this.observableCtor(scheduler, trackFn).pipe(trackFn());
		obs.subscribe();

		scheduler.flush();

		return this.observables;
	}

	constructor(
		public readonly observableCtor: (
			scheduler: SchedulerLike,
			track: TrackFn
		) => Observable<unknown>
	) {
		super();
	}
}

export class TrackingObservableHistory extends ObservableHistory {
	public get events(): ReadonlyArray<ObservableEvent> {
		return this.trackedEvents;
	}

	@observable public trackedEvents = new Array<ObservableEvent>();
}
