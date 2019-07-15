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
	}

	@computed
	get transpiledJs(): string | { error: string } {
		const src = this.typescriptSrc;
		let result = ts.transpileModule(src, {
			compilerOptions: {
				module: ts.ModuleKind.CommonJS,
				noImplicitUseStrict: true,
			},
		});
		if (result.diagnostics) {
			if (result.diagnostics.length > 0) {
				// This only includes syntactic diagnostics.
				return { error: "Syntax Error" };
			}
		}
		return result.outputText;
	}

	@computed private get observableCtor():
		| ObservableComputer
		| { error: string } {
		const transpiledJs = this.transpiledJs;
		if (typeof transpiledJs === "object") {
			return transpiledJs;
		}

		return evalObservable(transpiledJs);
	}

	protected getObservable(
		getObservable: GetObservableFn,
		scheduler: SchedulerLike,
		track: TrackFn
	): Observable<unknown> | { error: string } {
		const ctor = this.observableCtor;
		if (typeof ctor === "object") {
			return ctor;
		}
		return ctor(getObservable, scheduler, track);
	}
}

function evalObservable(js: string): ObservableComputer | { error: string } {
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
		return { error: e.toString() };
	}

	if (!result) {
		return {
			error: "No observable exported.",
		};
	}

	return result;
}
