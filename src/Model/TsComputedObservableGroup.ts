import { TrackingObservableGroupBase } from "./Tracking";
import { SchedulerLike, Observable } from "rxjs";
import { observable, computed, autorun, action } from "mobx";
import { ObservableComputer, Observables, TrackFn } from "./types";
import { ObservableGroups, SerializedObservable } from "./ObservableGroups";
import * as ts from "typescript";
import { TsModel, TsService } from "./TsService";

const initialProgram = `import * as rx from "rxjs";
import * as op from "rxjs/operators";
import { visualize } from "@hediet/rxjs-visualizer";

visualize((observables, scheduler, track) => {
	return observables.events.pipe(
		op.map(v => v * 2)
	);
});
`;

export class TsComputedObservableGroup extends TrackingObservableGroupBase {
	@observable src: string = "";

	public serialize(): SerializedObservable<{ src: string }> {
		return {
			type: "comp",
			src: this.src,
			name: this.name,
		};
	}

	public readonly model: TsModel;

	constructor(
		tsService: TsService,
		groups: ObservableGroups,
		data?: SerializedObservable<{ src: string }>
	) {
		super(groups);

		this.src = initialProgram;
		if (data) {
			this.src = data.src;
			this.name = data.name;
		}
		this.model = this.dispose.track(
			tsService.createTypeScriptModel(this.src)
		);

		this.dispose.track({
			dispose: autorun(
				() => {
					if (this.dispose.disposed) {
						throw new Error("Object is disposed");
					}

					const visibleObservables = [
						...this.visibleObservables.values(),
					].map(o => ({
						name: o.name,
						types: o.typescriptType,
					}));

					this.model.registerSpecificTypes(
						visibleObservables.map(o => ({
							name: o.name,
							eventDataType: o.types.type,
						})),
						visibleObservables
							.map(o => o.types.typeDeclarations)
							.join("\n")
					);
				},
				{ name: "Update types that consider visible observables" }
			),
		});

		this.dispose.track(
			this.model.textModel.onDidChangeContent(() => {
				this.src = this.model.textModel.getValue();
				this.compile();
			})
		);

		// don't use monaco to compile for the first time to speed things up
		this.transpiledJs = ts.transpile(this.model.textModel.getValue());
	}

	public reset(): void {
		this.model.textModel.setValue(initialProgram);
	}

	private async compile() {
		const result = await this.model.compile();
		if (result.kind === "successful") {
			this.transpiledJs = result.js;
		}
	}

	@observable transpiledJs: string = "";

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
		observables: Observables,
		scheduler: SchedulerLike,
		track: TrackFn
	): Observable<unknown> | { error: string } {
		const ctorOrError = this.observableCtor;
		if (typeof ctorOrError === "object") {
			return ctorOrError;
		}
		return ctorOrError(observables, scheduler, track);
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
