import {
	ObservableHistoryGroups,
	TrackingHistoryGroup,
} from "./ObservableHistoryGroups";
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
} from "rxjs/operators";

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

function main(groups: ObservableHistoryGroups): TrackingHistoryGroup {
	const h = groups.getResultingObservableHistory("ringings");
	if (!h) throw new Error();

	return new TrackingHistoryGroup((scheduler, track) => {
		interface Ringing {
			r: boolean;
			t: number;
		}

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

		return from(ringings).pipe(
			flatMap(v => of(v).pipe(delay(v.t, scheduler))),
			track(),
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
