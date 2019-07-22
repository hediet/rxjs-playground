import { observer } from "mobx-react";
import { Point, Rectangle } from "../std/Point";
import { ObservableMap, observable, autorun, computed, toJS } from "mobx";
import { SvgRect, SvgLine, SvgText } from "../std/SvgElements";
import { ObservableGroup, ObservableHistory } from "../Model/ObservableGroups";
import { PositionTransformation } from "../std/DragBehavior";
import { SvgContext, TimeOffsetConversion } from "./utils";
import React = require("react");
import { ObservableView } from "./ObservableView";
import { MutableObservableGroup } from "../Model/MutableObservableGroup";
import { ObservableGroupViewModel, PlaygroundViewModel } from "./ViewModels";
import { ContextMenu, Menu, MenuItem } from "@blueprintjs/core";
import classnames = require("classnames");

@observer
export class ObservableGroupView extends React.Component<{
	group: ObservableGroupViewModel;
	x: number;
	height: number;
	svgContext: SvgContext;
	timeOffsetConversion: TimeOffsetConversion;
	playground: PlaygroundViewModel;
}> {
	constructor(props: any) {
		super(props);
	}

	render(): React.ReactElement {
		const {
			group,
			x,
			height,
			svgContext,
			timeOffsetConversion,
			playground,
		} = this.props;
		const position = new Point(
			group.dragX !== undefined ? group.dragX : x,
			0
		);
		const rectangle = new Rectangle(
			new Point(0, 1),
			new Point(this.props.group.width, height + 20)
		);
		return (
			<g
				className={classnames(
					"component-ObservableGroupView",
					playground.selectedGroup === group.group && "selectedGroup"
				)}
				transform={`translate(${position.x} ${position.y})`}
				style={
					playground.groupDragBehavior.testActiveData(
						d => d === group
					)
						? {}
						: { transition: "0.4s all" }
				}
				onMouseDown={e => {
					e.preventDefault();
					e.stopPropagation();
					playground.selectedGroup = this.props.group.group;
				}}
			>
				<SvgRect
					className="part-groupBackground"
					rectangle={rectangle}
					onMouseDown={e => {
						e.preventDefault();
						e.stopPropagation();
						playground.selectedGroup = this.props.group.group;

						const op = playground.groupDragBehavior
							.start(
								group,
								new PositionTransformation(p =>
									svgContext.mouseToSvgCoordinates(p)
								)
									.relative()
									.translate({ x })
							)
							.endOnMouseUp();

						op.onDrag.sub(data => {
							group.dragX = data.position.x;
						});
						op.handleMouseEvent(e.nativeEvent);

						op.onEnd.sub(data => {
							group.dragX = undefined;
						});
					}}
				/>
				<SvgText
					className="part-title"
					position={
						new Point(
							group.widthSum(group.observables.length - 1),
							15
						)
					}
					children={group.group.name}
					childRef={txt => {
						if (txt) {
							group.titleWidth = txt.getBBox().width + 20;
						}
					}}
				/>
				{group.observables.map((observable, idx) => (
					<ObservableView
						key={idx}
						x={10 + group.widthSum(idx)}
						height={height}
						timeOffsetConversion={timeOffsetConversion}
						observable={observable}
						svgContext={svgContext}
						playground={playground}
					/>
				))}
			</g>
		);
	}
}
