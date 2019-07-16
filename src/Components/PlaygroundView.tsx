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
import { TypeScriptService } from "../Model/TypeScriptService";

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
													playground.typeScriptService,
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
					<TypeScriptEditorComponent
						key={group.id}
						group={group}
						typeScriptService={
							this.props.playground.typeScriptService
						}
					/>
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
			model: this.props.group.model,
			automaticLayout: true,
			scrollBeyondLastLine: false,
			minimap: { enabled: false },
		});
		this.editor = editor;
	};

	render() {
		return <div className="editor" ref={this.setEditorDiv} />;
	}
}

@observer
class TypeScriptEditorComponent extends React.Component<{
	group: TypeScriptTrackingObservableGroup;
	typeScriptService: TypeScriptService;
}> {
	@observable private editor: monaco.editor.IStandaloneCodeEditor | undefined;

	private readonly setEditorDiv = (editorDiv: HTMLDivElement) => {
		if (!editorDiv) {
			return;
		}

		const editor = monaco.editor.create(editorDiv, {
			model: this.props.group.model.textModel,
			automaticLayout: true,
			scrollBeyondLastLine: false,
			minimap: { enabled: false },
		});
		this.editor = editor;
	};

	@disposeOnUnmount
	private readonly s = autorun(() => {
		if (this.editor) {
			this.editor.setModel(this.props.group.model.textModel);
		}
	});

	render() {
		return <div className="editor" ref={this.setEditorDiv} />;
	}
}
