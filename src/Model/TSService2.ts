import * as monaco from "monaco-editor";
import { LanguageService } from "typescript";

export class TSService2 {
	private modelId = 0;

	constructor() {
		this.registerDefaultTypes();
	}

	private tsUri(id: number) {
		return monaco.Uri.parse(`file:///${id}/main.ts`);
	}

	public createTypeScriptModel(initialValue: string): TsModel {
		this.modelId++;
		const uri = this.tsUri(this.modelId);
		return new TsModel(
			monaco.editor.createModel(initialValue, "typescript", uri),
			this.modelId
		);
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
}

export class TsModel {
	constructor(
		public readonly textModel: monaco.editor.ITextModel,
		private id: number
	) {}

	public get uri(): monaco.Uri {
		return this.textModel.uri;
	}

	public registerSpecificTypes(groupNames: string[]) {
		const typesContent = require("!!raw-loader!./types.ts").default;

		let names = groupNames.map(n => JSON.stringify(n)).join("|");
		if (groupNames.length === 0) {
			names = "never";
		}

		monaco.languages.typescript.typescriptDefaults.addExtraLib(
			`
${typesContent}
export function visualize(computer: ObservableComputer<${names}>): void;
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
		const semanticDiagnostics = await proxy.getSemanticDiagnostics(
			this.uri.toString()
		);
		const d2 = await proxy.getSyntacticDiagnostics(this.uri.toString());

		if (semanticDiagnostics.length + d2.length > 0) {
			return {
				kind: "error",
			};
		}
		const r = await proxy.getEmitOutput(this.uri.toString());
		return { kind: "successful", js: r.outputFiles[0].text };
	}
}
