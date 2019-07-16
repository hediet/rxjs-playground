import {
	MonoTypeOperatorFunction,
	Observable,
	OperatorFunction,
	PartialObserver,
	Subject,
	interval,
} from "rxjs";
import {
	debounceTime,
	filter,
	groupBy,
	map,
	mergeMap,
	take,
	tap,
	toArray,
	scan,
	withLatestFrom,
	takeUntil,
} from "rxjs/operators";
import { MutableObservableHistoryGroup } from "./Model/Mutable";
import { ObservableGroup, ObservableGroups } from "./Model/ObservableGroups";
import { TrackingObservableGroup } from "./Model/Tracking";
import { TypeScriptTrackingObservableGroup } from "./Model/TypeScriptTrackingObservableGroup";
import { ObservableComputer } from "./Model/types";

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

//export const sampleGroups = new ObservableGroups();

//sampleGroups.addGroup(sampleData(sampleGroups, "data2"));

function sampleData(groups: ObservableGroups, name: string): ObservableGroup {
	const group = new MutableObservableHistoryGroup();
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

function zipped(groups: ObservableGroups): ObservableGroup {
	return new TrackingObservableGroup(
		groups,
		(getObservable, scheduler, track) => {
			return groups
				.getResultingObservable("data1", scheduler)
				.pipe(debounceTime(10, scheduler));
		}
	);
}

/*

import * as rx from "rxjs";
import * as op from "rxjs/operators";
import { visualize } from "@hediet/rxjs-visualizer";

visualize((getObservable, scheduler, track) => {
	const source = rx.interval(1000, scheduler).pipe(track("source"));
	//is number even?
	const isEven = (val: number) => val % 2 === 0;
	//only allow values that are even
	const evenSource = source.pipe(
		op.filter(isEven),
		track("evenSource")
	);
	//keep a running total of the number of even numbers out
	const evenNumberCount = evenSource.pipe(
		op.scan((acc, _) => acc + 1, 0),
		track("evenNumberCount")
	);
	//do not emit until 5 even numbers have been emitted
	const fiveEvenNumbers = evenNumberCount.pipe(
		op.filter(val => val > 5),
		track("fiveEvenNumbers")
	);

	const example = evenSource.pipe(
		//also give me the current even number count for display
		op.withLatestFrom(evenNumberCount),
		track(),
		op.map(([val, count]) => `Even number (${count}) : ${val}`),
		track(),
		//when five even numbers have been emitted, complete source observable
		op.takeUntil(fiveEvenNumbers)
	);

	return example;
});
*/

//sampleGroups.addGroup(new TrackingObservableGroup(sampleGroups, groupByDemo));

/*
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
*/
