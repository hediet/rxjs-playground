import {
	MonoTypeOperatorFunction,
	VirtualTimeScheduler,
	SchedulerLike,
	Observable,
	defer,
} from "rxjs";
import {
	ObservableGroup,
	ObservableHistory,
	ObservableEvent,
	ObservableGroups,
} from "./ObservableGroups";
import { computed, observable, autorun } from "mobx";
import { tap } from "rxjs/operators";
import { ObservableComputer } from "./types";
import { sortByNumericKey } from "../std/utils";
import { string } from "prop-types";

export type TrackFn = <T>(name?: string) => MonoTypeOperatorFunction<T>;
export type GetObservableFn = <T>(name: string) => Observable<T>;

let id = 0;

export class TrackingEvent implements ObservableEvent {
	public readonly id = id++;

	constructor(public readonly time: number, public readonly data: unknown) {}
}

export abstract class TrackingObservableGroupBase extends ObservableGroup {
	@computed
	public get visibleObservables(): Map<string, ObservableHistory> {
		const groups = [...this.groups.groups]
			.map((g, idx) => ({ g, idx }))
			.sort(sortByNumericKey(g => g.g.getPositionSortKey(g.idx)));

		const observables = new Map<string, ObservableHistory>();

		for (const g of groups) {
			if (g.g === this) {
				break;
			}
			if (g.g.resultingObservableHistory) {
				observables.set(g.g.name, g.g.resultingObservableHistory);
			}
		}
		return observables;
	}

	@computed
	public get observables(): ObservableHistory[] {
		const scheduler = new VirtualTimeScheduler();
		const observables = new Array<ObservableHistory>();

		const trackFn = (name?: string | (() => string)) => {
			const n =
				typeof name === "string"
					? () => name
					: typeof name === "function"
					? name
					: () => "";

			return <T>(source: Observable<T>) => {
				return defer(() => {
					const history = new TrackingObservableHistory(n);

					observables.unshift(history);
					history.startTime = scheduler.now();
					return source.pipe(
						tap({
							next: n => {
								history.trackedEvents.push(
									new TrackingEvent(scheduler.now(), n)
								);
							},
							complete: () => {
								history.endTime = scheduler.now();
							},
						})
					);
				});
			};
		};

		const getObservable: GetObservableFn = <T>(name: string) => {
			const o = this.visibleObservables.get(name);
			if (!o) {
				throw new Error(
					`There is no visible observable with name "${name}"!`
				);
			}
			return o.asObservable<T>(scheduler);
		};

		try {
			const obsOrError = this.getObservable(
				getObservable,
				scheduler,
				trackFn
			);
			if (typeof obsOrError === "object" && "error" in obsOrError) {
				console.error(obsOrError.error);
			} else {
				obsOrError.pipe(trackFn(() => this.name)).subscribe();
				scheduler.flush();
				console.log(observables, obsOrError);
			}
		} catch (e) {
			console.error(e);
			return [];
		}

		return observables;
	}

	protected abstract getObservable(
		getObservable: GetObservableFn,
		scheduler: SchedulerLike,
		track: TrackFn
	): Observable<unknown> | { error: string };

	constructor(private readonly groups: ObservableGroups) {
		super();
	}
}

export class TrackingObservableGroup extends TrackingObservableGroupBase {
	@observable public observableCtor: ObservableComputer;

	protected getObservable(
		getObservable: GetObservableFn,
		scheduler: SchedulerLike,
		track: TrackFn
	) {
		return this.observableCtor(getObservable, scheduler, track);
	}

	constructor(groups: ObservableGroups, observableCtor: ObservableComputer) {
		super(groups);
		this.observableCtor = observableCtor;
	}
}

export class TrackingObservableHistory extends ObservableHistory {
	constructor(private readonly nameFn: () => string) {
		super();
	}

	public get name() {
		return this.nameFn();
	}

	public get events(): ReadonlyArray<ObservableEvent> {
		return this.trackedEvents;
	}

	@observable public startTime: number = 0;
	@observable public endTime: number | undefined = undefined;

	@observable public trackedEvents = new Array<ObservableEvent>();
}
