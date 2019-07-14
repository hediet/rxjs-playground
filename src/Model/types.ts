import { MonoTypeOperatorFunction, Observable, SchedulerLike } from "rxjs";

export type TrackFn = <T>(name?: string) => MonoTypeOperatorFunction<T>;
export type GetObservableFn<TName extends string = string> = <T>(
	name: TName
) => Observable<T>;

export type ObservableComputer<TName extends string = string> = (
	getObservable: GetObservableFn<TName>,
	scheduler: SchedulerLike,
	track: TrackFn
) => Observable<unknown>;
