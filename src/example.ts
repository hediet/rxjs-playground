import {
	ObservableHistoryGroups,
	ObservableHistoryGroup,
} from "./Model/ObservableHistoryGroups";
import {
	SchedulerLike,
	Observable,
	from,
	of,
	VirtualTimeScheduler,
	race,
	interval,
	NEVER,
	MonoTypeOperatorFunction,
	OperatorFunction,
	Subject,
	PartialObserver,
	zip,
} from "rxjs";
import {
	flatMap,
	delay,
	map,
	filter,
	distinctUntilChanged,
	mergeMap,
	take,
	tap,
	last,
	scan,
	debounce,
	debounceTime,
} from "rxjs/operators";
import { observable } from "mobx";
import { TrackingHistoryGroup } from "./Model/Tracking";
import { MutableObservableHistoryGroup } from "./Model/Mutable";

function mergeFilter<T>(
	predicate: (arg: T) => Observable<boolean>
): MonoTypeOperatorFunction<T> {
	return mergeMap(evt =>
		predicate(evt).pipe(
			take(1),
			filter(e => e),
			map(e => evt)
		)
	);
}

function useSubject<T, O>(
	fn: (o: Observable<T>) => OperatorFunction<T, O>
): OperatorFunction<T, O> {
	return function(input: Observable<T>): Observable<O> {
		const subject = new Subject<T>();
		const observer: PartialObserver<T> = subject;
		return input.pipe(
			tap(observer),
			fn(subject)
		);
	};
}

interface Ringing {
	r: boolean;
	t: number;
}

export const sampleGroups = new ObservableHistoryGroups();
sampleGroups.groups.push(sampleData(sampleGroups, "data1"));
//sampleGroups.groups.push(sampleData(sampleGroups, "data2"));
sampleGroups.groups.push(toggle(sampleGroups));
//sampleGroups.groups.push(toggle(sampleGroups));

function sampleData(
	groups: ObservableHistoryGroups,
	name: string
): ObservableHistoryGroup {
	const group = new MutableObservableHistoryGroup(name);
	const ringings: Ringing[] = [
		{ r: true, t: 0 },
		{ r: false, t: 8 },
		{ r: true, t: 10 },
		{ r: false, t: 35 },
		{ r: true, t: 52 },
		{ r: false, t: 55 },
		{ r: true, t: 60 },
		{ r: false, t: 100 },
	];
	let i = 1;
	for (const r of ringings) {
		group.history.addEvent(r.t, i++);
	}
	return group;
}

function zipped(groups: ObservableHistoryGroups): ObservableHistoryGroup {
	return new TrackingHistoryGroup("zip", (scheduler, track) => {
		return groups
			.getResultingObservable("data1", scheduler)
			.pipe(debounceTime(10, scheduler));
	});
}

function toggle(groups: ObservableHistoryGroups): ObservableHistoryGroup {
	return new TrackingHistoryGroup("bla", (scheduler, track) => {
		return groups.getResultingObservable("data1", scheduler).pipe(
			scan(acc => !acc, false),
			track(),
			map(r => ({ r, t: scheduler.now() })),
			track(),
			debounceTime(10, scheduler)
		);
	});
}

function processedRingings(
	groups: ObservableHistoryGroups
): TrackingHistoryGroup {
	return new TrackingHistoryGroup("processedRingings", (scheduler, track) => {
		const h = groups.getResultingObservableHistory("ringings");
		if (!h) throw new Error();

		return h.asObservable<Ringing>(scheduler).pipe(
			useSubject(futureEvents =>
				mergeFilter(myEvent =>
					race(
						interval(7, scheduler).pipe(map(x => true)),
						myEvent.r
							? NEVER
							: futureEvents.pipe(
									filter(x => x.r),
									map(x => false)
							  )
					)
				)
			),
			track(),
			useSubject(futureEvents =>
				mergeFilter(myEvent =>
					race(
						interval(23, scheduler).pipe(map(x => true)),
						!myEvent.r
							? NEVER
							: futureEvents.pipe(
									filter(x => !x.r),
									map(x => false)
							  )
					)
				)
			),
			track(),
			distinctUntilChanged((r1, r2) => r1.r === r2.r)
		);
	});
}
