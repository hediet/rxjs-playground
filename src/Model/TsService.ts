import * as monaco from "monaco-editor";
import { LanguageService } from "typescript";
import { Disposable } from "@hediet/std/disposable";

export class TsService {
	private modelId = 0;

	constructor() {
		this.registerDefaultTypes();
	}

	private registerDefaultTypes() {
		const r = (require as any).context(
			"!!raw-loader!rxjs",
			true,
			/.*\.d\.ts/
		);
		for (const key of r.keys()) {
			let content = r(key).default as string;
			const path = `file:///node_modules/rxjs/${key}`;
			content = content.replace(/scheduler\?/g, "scheduler");
			monaco.languages.typescript.typescriptDefaults.addExtraLib(
				content,
				path
			);
		}

		monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
			target: monaco.languages.typescript.ScriptTarget.ES2016,
			allowNonTsExtensions: true,
			moduleResolution:
				monaco.languages.typescript.ModuleResolutionKind.NodeJs,
			module: monaco.languages.typescript.ModuleKind.CommonJS,
			noEmit: false,
			noImplicitUseStrict: true,
		});
	}

	public createTypeScriptModel(initialValue: string): TsModel {
		this.modelId++;
		const uri = this.tsUri(this.modelId);
		return new TsModel(
			monaco.editor.createModel(initialValue, "typescript", uri),
			this.modelId
		);
	}

	private tsUri(id: number) {
		return monaco.Uri.parse(`file:///${id}/main.ts`);
	}
}

export class TsModel {
	public readonly dispose = Disposable.fn();
	private extraLibDisposable: Disposable | undefined = undefined;

	constructor(
		public readonly textModel: monaco.editor.ITextModel,
		private id: number
	) {
		this.dispose.track({
			dispose: () => {
				if (this.extraLibDisposable) {
					this.extraLibDisposable.dispose();
				}
			},
		});
		this.dispose.track(this.textModel);
	}

	public get uri(): monaco.Uri {
		return this.textModel.uri;
	}

	public registerSpecificTypes(
		groupNames: { name: string; eventDataType: string }[],
		extraDeclarations: string
	) {
		const typesContent = require("!!raw-loader!./types.ts").default;

		let observablesType = `{${groupNames
			.map(n => JSON.stringify(n.name) + ":" + n.eventDataType)
			.join(",")}}`;

		this.extraLibDisposable = monaco.languages.typescript.typescriptDefaults.addExtraLib(
			`
${extraDeclarations}
${typesContent}
export function visualize(computer: ObservableComputer<${observablesType}>): void;
`,
			`file:///${this.id}/node_modules/@hediet/rxjs-visualizer/index.d.ts`
		);
	}

	public async compile(): Promise<
		{ kind: "successful"; js: string } | { kind: "error" }
	> {
		const worker: (
			v: monaco.Uri
		) => Promise<
			any
		> = await monaco.languages.typescript.getTypeScriptWorker();
		const proxy: LanguageService = await worker(this.uri);
		const uri = this.uri.toString();
		const syntacticDiagnostics = await proxy.getSyntacticDiagnostics(uri);
		const semanticDiagnostics = await proxy.getSemanticDiagnostics(uri);

		if (semanticDiagnostics.length + syntacticDiagnostics.length > 0) {
			return {
				kind: "error",
			};
		}
		const result = await proxy.getEmitOutput(this.uri.toString());
		return { kind: "successful", js: result.outputFiles[0].text };
	}
}
