import { MonoTypeOperatorFunction, Observable, SchedulerLike } from "rxjs";

export type TrackFn = <T>(name?: string) => MonoTypeOperatorFunction<T>;
export type Observables<TObservables extends Record<string, unknown> = {}> = {
	[TKey in keyof TObservables]: Observable<TObservables[TKey]>
} & {
	get<T>(name: keyof TObservables): Observable<T>;
};

export type ObservableComputer<
	TObservables extends Record<string, unknown> = {}
> = (
	observables: Observables<TObservables>,
	scheduler: SchedulerLike,
	track: TrackFn
) => Observable<unknown>;
