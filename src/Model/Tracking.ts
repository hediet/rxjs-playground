import {
	MonoTypeOperatorFunction,
	VirtualTimeScheduler,
	SchedulerLike,
	Observable,
} from "rxjs";
import {
	ObservableHistoryGroup,
	ObservableHistory,
	ObservableEvent,
} from "./ObservableHistoryGroups";
import { computed, observable } from "mobx";
import { tap } from "rxjs/operators";

export type TrackFn = <T>() => MonoTypeOperatorFunction<T>;

let id = 0;

export class TrackingEvent implements ObservableEvent {
	public readonly id = id++;

	constructor(public readonly time: number, public readonly data: unknown) {}
}

export class TrackingHistoryGroup extends ObservableHistoryGroup {
	@computed
	public get observables(): ObservableHistory[] {
		const scheduler = new VirtualTimeScheduler();
		const observables = new Array<ObservableHistory>();

		const trackFn: TrackFn = () => {
			const history = new TrackingObservableHistory();
			observables.push(history);
			return tap(n => {
				history.trackedEvents.push(
					new TrackingEvent(scheduler.now(), n)
				);
			});
		};
		const obs = this.observableCtor(scheduler, trackFn).pipe(trackFn());
		obs.subscribe();

		scheduler.flush();

		return observables;
	}

	constructor(
		name: string,
		public readonly observableCtor: (
			scheduler: SchedulerLike,
			track: TrackFn
		) => Observable<unknown>
	) {
		super(name);
	}
}

export class TrackingObservableHistory extends ObservableHistory {
	public get events(): ReadonlyArray<ObservableEvent> {
		return this.trackedEvents;
	}

	@observable public trackedEvents = new Array<ObservableEvent>();
}
