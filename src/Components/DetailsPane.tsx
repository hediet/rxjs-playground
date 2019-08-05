import { observer } from "mobx-react";
import {
	Button,
	Popover,
	Position,
	Menu,
	MenuItem,
	FormGroup,
	InputGroup,
	ButtonGroup,
	NumericInput,
	Label,
} from "@blueprintjs/core";
import { MutableObservableGroup } from "../Model/MutableObservableGroup";
import React = require("react");
import { TSComputedObservableGroup } from "../Model/TSComputedObservableGroup";
import { PlaygroundViewModel } from "../ViewModels/PlaygroundViewModel";
import { ObservableGroup } from "../Model/ObservableGroups";
import { MonacoEditor } from "./MonacoEditor";
import { action } from "mobx";

@observer
export class DetailsPane extends React.Component<{
	playground: PlaygroundViewModel;
}> {
	render() {
		const selectedGroup = this.props.playground.selectedGroup;
		const playground = this.props.playground;

		return (
			<div className="component-details-pane">
				<div className="part-menu">
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
												new MutableObservableGroup()
											)
										}
									/>
									<MenuItem
										icon="add"
										text="Computed Observable"
										onClick={() =>
											playground.groups.addGroup(
												new TSComputedObservableGroup(
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
							onClick={() => {
								selectedGroup!.reset();
								playground.recordingModel.resetStart();
							}}
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
					<div className="part-config">
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
			<div className="component-config">
				{group instanceof TSComputedObservableGroup && (
					<div className="part-editor">
						<MonacoEditor
							key={group.id}
							model={group.model.textModel}
						/>
					</div>
				)}
				{group instanceof MutableObservableGroup && (
					<MutableOptionsComponent
						playground={this.props.playground}
						group={group}
					/>
				)}
			</div>
		);
	}
}

@observer
class MutableOptionsComponent extends React.Component<{
	playground: PlaygroundViewModel;
	group: MutableObservableGroup;
}> {
	@action.bound
	private emitKey(e: React.KeyboardEvent<HTMLButtonElement>): void {
		const r = this.props.playground.recordingModel;
		if (e.key === " ") {
			// space triggers the button itself
			return;
		}

		r.emitIfRecording(this.props.group, { value: e.key });
	}

	render() {
		const group = this.props.group;
		const playground = this.props.playground;
		const recordingModel = playground.recordingModel;
		return (
			<>
				<div className="part-recording">
					<div className="part-options">
						<ButtonGroup>
							<Button
								icon="record"
								children="Record"
								active={recordingModel.isRecording}
								onClick={() => recordingModel.toggle()}
								onKeyDown={this.emitKey}
							/>
							<Button
								icon="pulse"
								children="Emit"
								disabled={!recordingModel.isRecording}
								onClick={() =>
									recordingModel.emitIfRecording(group)
								}
								onKeyDown={this.emitKey}
							/>
							<Button
								icon="pulse"
								children="Emit Edges"
								disabled={!recordingModel.isRecording}
								onMouseDown={() =>
									recordingModel.emitIfRecording(group, {
										value: { pressed: true },
									})
								}
								onMouseUp={() =>
									recordingModel.emitIfRecording(group, {
										value: { pressed: false },
									})
								}
								onKeyDown={this.emitKey}
							/>
							<Button
								icon="step-backward"
								children="Reset Start"
								disabled={recordingModel.isRecording}
								onClick={() => recordingModel.resetStart()}
							/>
						</ButtonGroup>
						<div className="part-numeric-inputs">
							<FormGroup
								labelFor="text-input"
								helperText="Recording Start"
								inline
							>
								<NumericInput
									leftIcon="time"
									style={{ maxWidth: 80 }}
									value={recordingModel.startTime}
									onValueChange={e =>
										(recordingModel.startTime = e)
									}
								/>
							</FormGroup>
							<FormGroup
								labelFor="text-input"
								helperText="Ticks per Second"
								inline
							>
								<NumericInput
									leftIcon="delta"
									style={{ maxWidth: 80 }}
									value={recordingModel.ticksPerSecond}
									onValueChange={e =>
										(recordingModel.ticksPerSecond = e)
									}
								/>
							</FormGroup>
						</div>
					</div>
					<div className="part-text">
						<Label>
							Press any alphanumeric key to emit an event while
							any record button is focused.
						</Label>
					</div>
				</div>
				<div className="part-editor">
					<MonacoEditor key={group.id} model={group.model} />
				</div>
			</>
		);
	}
}
