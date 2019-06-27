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
} from "rxjs/operators";

interface Ringing {
	ringing: boolean;
	time: number;
}

const ringings: Ringing[] = [
	{ ringing: true, time: 0 },
	{ ringing: false, time: 8 },
	{ ringing: true, time: 10 },
	{ ringing: false, time: 15 },
	{ ringing: true, time: 52 },
	{ ringing: false, time: 55 },
];

function rawRingingFaker(scheduler: SchedulerLike): Observable<Ringing> {
	return from(ringings).pipe(
		flatMap(v => of(v).pipe(delay(v.time, scheduler)))
	);
}

export class EventHistory {
	public readonly observables: ObservableHistory[] = [];

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
		const history = new ObservableHistory();
		this.observables.push(history);
		return tap(n => {
			history.items.push(new HistoryEntry(n, scheduler.now()));
		});
	}
}

export class ObservableHistory {
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
			minDist = Math.min(minDist, dist);
		}
		return minDist;
	}
}

export class HistoryEntry {
	constructor(public readonly data: unknown, public readonly time: number) {}
}

export const sampleHistory = new EventHistory();
const s = new VirtualTimeScheduler();
const src = rawRingingFaker(s).pipe(
	sampleHistory.trackObservable(s),
	debounce(v => (v.ringing ? empty() : interval(10, s))),
	sampleHistory.trackObservable(s),
	distinctUntilChanged((r1, r2) => r1.ringing === r2.ringing),
	sampleHistory.trackObservable(s)
);
src.subscribe();
s.flush();
