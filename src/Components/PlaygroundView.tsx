import { Model } from "../Model";
import { observer, disposeOnUnmount } from "mobx-react";
import { ObservableGroupsView } from "./ObservableGroupsView";
import {
	Button,
	Popover,
	Position,
	Menu,
	MenuItem,
	FormGroup,
	InputGroup,
	ButtonGroup,
} from "@blueprintjs/core";
import { MutableObservableHistoryGroup } from "../Model/Mutable";
import React = require("react");
import * as monaco from "monaco-editor";
import { autorun, observable } from "mobx";
import { TypeScriptTrackingObservableGroup } from "../Model/TypeScriptTrackingObservableGroup";
import { PlaygroundViewModel } from "./ViewModels";
import { ObservableGroup } from "../Model/ObservableGroups";
import { LanguageService } from "typescript";
import { Subject } from "rxjs";
import { debounceTime, throttleTime } from "rxjs/operators";

@observer
export class PlaygroundView extends React.Component<{ model: Model }, {}> {
	render() {
		return (
			<div className="playground">
				<div className="visualizer">
					<div className="view">
						<ObservableGroupsView
							playground={this.props.model.playground}
						/>
					</div>
					<div className="details">
						<DetailsPane playground={this.props.model.playground} />
					</div>
				</div>
			</div>
		);
	}
}

@observer
export class DetailsPane extends React.Component<{
	playground: PlaygroundViewModel;
}> {
	render() {
		const selectedGroup = this.props.playground.selectedGroup;
		const playground = this.props.playground;

		return (
			<div className="detailsPane">
				<div
					className="menu"
					style={{
						paddingBottom: "10px",
						display: "flex",
						alignContent: "center",
						alignItems: "flex-start",
					}}
				>
					<ButtonGroup>
						<Popover
							position={Position.BOTTOM_LEFT}
							content={
								<Menu>
									<MenuItem
										icon="add"
										text="Editable Observable"
										onClick={() =>
											playground.groups.addGroup(
												new MutableObservableHistoryGroup()
											)
										}
									/>
									<MenuItem
										icon="add"
										text="Computed Observable"
										onClick={() =>
											playground.groups.addGroup(
												new TypeScriptTrackingObservableGroup(
													playground.groups
												)
											)
										}
									/>
								</Menu>
							}
						>
							<Button
								icon="add"
								rightIcon="caret-down"
								children="Add"
							/>
						</Popover>
						<Button
							icon="delete"
							children="Delete"
							disabled={!selectedGroup}
							onClick={() => {
								playground.selectedGroup = undefined;
								playground.groups.removeGroup(selectedGroup!);
							}}
						/>
						<Button
							icon="reset"
							children="Reset"
							disabled={!selectedGroup}
							onClick={() => {}}
						/>
					</ButtonGroup>
					<div style={{ marginLeft: "20px" }}>
						<FormGroup
							label="Name"
							labelFor="text-input"
							inline
							disabled={!selectedGroup}
						>
							<InputGroup
								disabled={!selectedGroup}
								id="text-input"
								placeholder="Name of the Observable"
								value={selectedGroup ? selectedGroup.name : ""}
								onChange={(
									e: React.ChangeEvent<HTMLInputElement>
								) => {
									if (selectedGroup) {
										selectedGroup.name = e.target.value;
									}
								}}
							/>
						</FormGroup>
					</div>
				</div>

				{selectedGroup && (
					<div className="config">
						<ConfigComponent
							playground={playground}
							selectedGroup={selectedGroup}
						/>
					</div>
				)}
			</div>
		);
	}
}

@observer
export class ConfigComponent extends React.Component<{
	playground: PlaygroundViewModel;
	selectedGroup: ObservableGroup;
}> {
	render() {
		const group = this.props.selectedGroup;
		return (
			<div className="configComponent">
				{group instanceof TypeScriptTrackingObservableGroup && (
					<TypeScriptEditorComponent key={group.id} group={group} />
				)}
				{group instanceof MutableObservableHistoryGroup && (
					<JsonEditorComponent key={group.id} group={group} />
				)}
			</div>
		);
	}
}

@observer
class JsonEditorComponent extends React.Component<{
	group: MutableObservableHistoryGroup;
}> {
	@observable private editor: monaco.editor.IStandaloneCodeEditor | undefined;

	private readonly setEditorDiv = (editorDiv: HTMLDivElement) => {
		if (!editorDiv) {
			return;
		}

		const editor = monaco.editor.create(editorDiv, {
			model: this.model,
			automaticLayout: true,
			scrollBeyondLastLine: false,
			minimap: { enabled: false },
		});
		this.editor = editor;
	};

	private mainUri = monaco.Uri.parse("file:///main.json");
	private model: monaco.editor.ITextModel | undefined = undefined;

	componentWillMount() {
		this.model = monaco.editor.createModel("", "json", this.mainUri);
		this.model.onDidChangeContent(async e => {
			//this.props.group.setTypescriptSrc(this.model!.getValue());
		});
	}

	componentWillUnmount() {
		if (this.model) {
			this.model.dispose();
		}
	}

	private debounceSubject = new Subject();
	private foo = this.debounceSubject.pipe(debounceTime(100)).forEach(() => {
		const json = this.props.group.getAsJson();
		//if (this.editor.getValue() !== json) {
		this.model!.setValue(json);
		//}
	});

	@disposeOnUnmount
	private readonly d = autorun(() => {
		if (this.editor) {
			const json = this.props.group.getAsJson();
			this.debounceSubject.next();
		}
	});

	render() {
		return <div className="editor" ref={this.setEditorDiv} />;
	}
}

function registerDefaultTypes() {
	const r = (require as any).context("!!raw-loader!rxjs", true, /.*\.d\.ts/);
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
		noEmit: true,
		noImplicitUseStrict: true,
	});
}

function registerSpecificTypes(groupNames: string[]) {
	const typesContent = require("!!raw-loader!./../Model/types.ts").default;

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

@observer
class TypeScriptEditorComponent extends React.Component<{
	group: TypeScriptTrackingObservableGroup;
}> {
	@observable private editor: monaco.editor.IStandaloneCodeEditor | undefined;

	private readonly setEditorDiv = (editorDiv: HTMLDivElement) => {
		if (!editorDiv) {
			return;
		}

		const editor = monaco.editor.create(editorDiv, {
			model: this.model,
			automaticLayout: true,
			scrollBeyondLastLine: false,
			minimap: { enabled: false },
		});
		this.editor = editor;
	};

	private mainUri = monaco.Uri.parse("file:///main.tsx");
	private model: monaco.editor.ITextModel | undefined = undefined;

	@disposeOnUnmount
	private readonly s = autorun(() => {
		registerSpecificTypes([...this.props.group.visibleObservables.keys()]);
	});

	componentWillMount() {
		registerDefaultTypes();

		this.model = monaco.editor.createModel("", "typescript", this.mainUri);
		this.model.onDidChangeContent(async e => {
			this.props.group.setTypescriptSrc(this.model!.getValue());
		});
	}

	componentWillUnmount() {
		if (this.model) {
			this.model.dispose();
		}
	}

	private readonly d = autorun(() => {
		if (this.editor) {
			if (this.editor.getValue() !== this.props.group.typescriptSrc) {
				this.editor.setValue(this.props.group.typescriptSrc);
			}
		}
	});

	render() {
		return <div className="editor" ref={this.setEditorDiv} />;
	}
}
