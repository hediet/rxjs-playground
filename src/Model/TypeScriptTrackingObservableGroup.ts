import { TrackingObservableGroupBase } from "./Tracking";
import { SchedulerLike, Observable } from "rxjs";
import { observable, computed, autorun, action } from "mobx";
import { ObservableComputer, GetObservableFn, TrackFn } from "./types";
import { ObservableGroups } from "./ObservableGroups";
import * as ts from "typescript";

export class TypeScriptTrackingObservableGroup extends TrackingObservableGroupBase {
	@observable private _typescriptSrc: string = `
import * as rx from "rxjs";
import * as op from "rxjs/operators";
import { visualize } from "@hediet/rxjs-visualizer";

visualize((getObservable, scheduler, track) => {
	return rx
		.from([1, 2, 3])
		.pipe(
			op.delayWhen<number>(v =>
				rx.interval(v * 10, scheduler)
			)
		);
});`;

	public get typescriptSrc(): string {
		return this._typescriptSrc;
	}

	@action
	public setTypescriptSrc(value: string) {
		this._typescriptSrc = value;

		const src = this.typescriptSrc;
		let result = ts.transpileModule(src, {
			compilerOptions: {
				module: ts.ModuleKind.CommonJS,
				noImplicitUseStrict: true,
			},
		});

		this.transpiledJs = result.outputText;
	}

	@observable transpiledJs: string | undefined = undefined;

	@computed private get observableCtor(): ObservableComputer | undefined {
		const transpiledJs = this.transpiledJs;
		if (!transpiledJs) {
			return undefined;
		}

		return this.evalObservable(transpiledJs);
	}

	private evalObservable(js: string): ObservableComputer | undefined {
		let result: ObservableComputer | undefined = undefined;
		try {
			const mods: Record<string, unknown> = {
				rxjs: require("rxjs"),
				"rxjs/operators": require("rxjs/operators"),
				"@hediet/rxjs-visualizer": {
					visualize(c: ObservableComputer) {
						result = c;
					},
				},
			};

			(function() {
				eval("var require = this.require; var exports = {}; " + js);
			}.apply({
				require(module: string): unknown {
					return mods[module];
				},
			}));
		} catch (e) {
			console.error(e);
		}
		return result;
	}

	protected getObservable(
		getObservable: GetObservableFn,
		scheduler: SchedulerLike,
		track: TrackFn
	): Observable<unknown> {
		if (!this.observableCtor) {
			throw new Error();
		}

		return this.observableCtor(getObservable, scheduler, track);
	}

	constructor(groups: ObservableGroups) {
		super(groups);
	}
}
