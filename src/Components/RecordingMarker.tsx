import { MutableObservableGroup } from "../Model/MutableObservableGroup";
import { Point } from "../std/Point";
import { SvgLine } from "../std/SvgElements";
import { TimeOffsetConversion } from "./utils";
import { PlaygroundViewModel } from "./ViewModels";
import React = require("react");

export class RecordingMarker extends React.Component<{
	playground: PlaygroundViewModel;
	timeOffsetConversion: TimeOffsetConversion;
	x: number;
	width: number;
}> {
	render() {
		if (
			!(
				this.props.playground.selectedGroup instanceof
				MutableObservableGroup
			)
		) {
			return <></>;
		}

		const recordingModel = this.props.playground.recordingModel;

		const recordingY = this.props.timeOffsetConversion.getOffset(
			recordingModel.currentRecordTime || recordingModel.startTime
		);

		return (
			<g
				className="component-RecordingMarker"
				onMouseDown={e => {
					/*if (o instanceof MutableObservableHistory) {
				this.handleMouseDownOnTimedObj(
					e,
					-1,
					t =>
						(playground.recordingModel.startTime = t),
					() => {}
				);
			}*/
				}}
			>
				<SvgLine
					className="visualMarker"
					start={new Point(this.props.x, recordingY)}
					end={new Point(this.props.x + this.props.width, recordingY)}
					stroke="black"
				/>
				{/*<SvgLine
			className="nonVisualMarker"
			start={start.add({ x: -15, y: recordingY })}
			end={start.add({ x: 15, y: recordingY })}
			stroke="transparent"
		/>*/}
			</g>
		);
	}
}
