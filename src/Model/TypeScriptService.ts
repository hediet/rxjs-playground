import * as monaco from "monaco-editor";
import { LanguageService } from "typescript";

export class TypeScriptService {
	private modelId = 0;

	constructor() {
		this.registerDefaultTypes();
	}

	private tsUri(id: number) {
		return monaco.Uri.parse(`file:///main${id}.ts`);
	}

	public createTypeScriptModel(initialValue: string): Model {
		this.modelId++;
		const uri = this.tsUri(this.modelId);
		return new Model(
			monaco.editor.createModel(initialValue, "typescript", uri)
		);
	}

	private registerDefaultTypes() {
		const r = (require as any).context(
			"!!raw-loader!rxjs",
			true,
			/.*\.d\.ts/
		);
		for (const key of r.keys()) {
			const content = r(key).default;
			const path = `file:///node_modules/rxjs/${key}`;
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

	public registerSpecificTypes(groupNames: string[]) {
		const typesContent = require("!!raw-loader!./../Model/types.ts")
			.default;

		let names = groupNames.map(n => JSON.stringify(n)).join("|");
		if (groupNames.length === 0) {
			names = "never";
		}

		monaco.languages.typescript.typescriptDefaults.addExtraLib(
			`
        ${typesContent}
        export function visualize(computer: ObservableComputer<${names}>): void;
        `,
			"file:///node_modules/@hediet/rxjs-visualizer/index.d.ts"
		);
	}
}

export class TsModel {
	constructor(public readonly textModel: monaco.editor.ITextModel) {}

	public get uri(): monaco.Uri {
		return this.textModel.uri;
	}

	public async compile(): Promise<string> {
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
		console.log(semanticDiagnostics, d2);
		const r = await proxy.getEmitOutput(this.uri.toString());
		return r.outputFiles[0].text;
	}
}
