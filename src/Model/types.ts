import { MonoTypeOperatorFunction, Observable, SchedulerLike } from "rxjs";

export type TrackFn = <T>(name?: string) => MonoTypeOperatorFunction<T>;
export type Observables<TName extends string = string> = {
	[TKey in TName]: Observable<unknown>
} & {
	get<T>(name: TName): Observable<T>;
};

export type ObservableComputer<TName extends string = string> = (
	observables: Observables<TName>,
	scheduler: SchedulerLike,
	track: TrackFn
) => Observable<unknown>;
