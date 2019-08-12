import { MutableObservableGroup } from "../Model/MutableObservableGroup";
import { Point } from "../std/Point";
import { SvgLine } from "../std/SvgElements";
import {
	TimeOffsetConversion,
	handleMouseDownOnTimedObj,
	SvgContext,
} from "./utils";
import { PlaygroundViewModel } from "../ViewModels/PlaygroundViewModel";
import React = require("react");

export class RecordingMarker extends React.Component<{
	playground: PlaygroundViewModel;
	timeOffsetConversion: TimeOffsetConversion;
	svgContext: SvgContext;
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
					handleMouseDownOnTimedObj(
						e,
						-1,
						t => (recordingModel.startTime = t),
						this.props.playground,
						this.props.svgContext,
						this.props.timeOffsetConversion
					);
				}}
			>
				<SvgLine
					className="visualMarker"
					start={new Point(this.props.x, recordingY)}
					end={new Point(this.props.x + this.props.width, recordingY)}
					stroke="black"
				/>
			</g>
		);
	}
}
