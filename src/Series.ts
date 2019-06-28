import {
	Observable,
	SchedulerLike,
	VirtualTimeScheduler,
	Subscription,
	Subject,
	empty,
	interval,
	from,
	of,
	pipe,
	race,
	MonoTypeOperatorFunction,
	OperatorFunction,
	PartialObserver,
	NEVER,
} from "rxjs";
import {
	debounce,
	debounceTime,
	tap,
	delay,
	map,
	mergeMap,
	ignoreElements,
	timeout,
	take,
	switchMap,
	takeLast,
	concatMap,
	flatMap,
	distinctUntilChanged,
	delayWhen,
	filter,
} from "rxjs/operators";

export class EventHistory {
	public readonly observables: SingleObservableHistory[] = [];

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

	public trackObservable<T>(
		scheduler: SchedulerLike
	): (o: Observable<T>) => Observable<T> {
		const history = new SingleObservableHistory();
		this.observables.push(history);
		return tap(n => {
			history.items.push(new HistoryEntry(n, scheduler.now()));
		});
	}
}

export class SingleObservableHistory {
	public readonly items: HistoryEntry[] = [];

	public get last(): HistoryEntry {
		return this.items[this.items.length - 1];
	}

	public get first(): HistoryEntry {
		return this.items[0];
	}

	public get minTimeDistanceBetweenItems(): number {
		let minDist = Number.MAX_VALUE;
		for (let i = 1; i < this.items.length; i++) {
			const dist = this.items[i].time - this.items[i - 1].time;
			if (dist != 0) {
				minDist = Math.min(minDist, dist);
			}
		}
		return minDist;
	}
}

export class HistoryEntry {
	constructor(public readonly data: unknown, public readonly time: number) {}
}

interface Ringing {
	ringing: boolean;
	time: number;
}

const ringings: Ringing[] = [
	{ ringing: true, time: 0 },
	{ ringing: false, time: 8 },
	{ ringing: true, time: 10 },
	{ ringing: false, time: 35 },
	{ ringing: true, time: 52 },
	{ ringing: false, time: 55 },
	{ ringing: false, time: 100 },
];

function rawRingingFaker(scheduler: SchedulerLike): Observable<Ringing> {
	return from(ringings).pipe(
		flatMap(v => of(v).pipe(delay(v.time, scheduler)))
	);
}

// dontEmitIfFutureHas()

export const sampleHistory = new EventHistory();
const track = <T>() => sampleHistory.trackObservable<T>(s);
const s = new VirtualTimeScheduler();
const src = rawRingingFaker(s).pipe(
	track(),
	useSubject(futureEvents =>
		mergeFilter(myEvent =>
			race(
				interval(7, s).pipe(map(x => true)),
				myEvent.ringing
					? NEVER
					: futureEvents.pipe(
							filter(x => x.ringing),
							map(x => false)
					  )
			)
		)
	),
	track(),
	useSubject(futureEvents =>
		mergeFilter(myEvent =>
			race(
				interval(23, s).pipe(map(x => true)),
				!myEvent.ringing
					? NEVER
					: futureEvents.pipe(
							filter(x => !x.ringing),
							map(x => false)
					  )
			)
		)
	),
	track(),
	distinctUntilChanged((r1, r2) => r1.ringing === r2.ringing),
	track()
);

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

src.subscribe();
s.flush();
console.log(sampleHistory);
