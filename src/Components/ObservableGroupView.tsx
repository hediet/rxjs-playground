import { observer } from "mobx-react";
import { Point } from "../std/Point";
import { ObservableMap, observable, autorun, computed, toJS } from "mobx";
import { SvgRect, SvgLine, SvgText } from "../std/SvgElements";
import { ObservableGroup, ObservableHistory } from "../Model/ObservableGroups";
import { PositionTransformation } from "../std/DragBehavior";
import { SvgContext, Scaling } from "./utils";
import React = require("react");
import { ObservableView } from "./ObservableView";
import { MutableObservableHistoryGroup } from "../Model/Mutable";
import { ObservableGroupViewModel, PlaygroundViewModel } from "./ViewModels";
import { ContextMenu, Menu, MenuItem } from "@blueprintjs/core";
import classnames = require("classnames");

@observer
export class ObservableGroupView extends React.Component<{
	group: ObservableGroupViewModel;
	x: number;
	height: number;
	svgContext: SvgContext;
	scaling: Scaling;
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
			scaling,
			playground,
		} = this.props;
		const p = new Point(group.dragX !== undefined ? group.dragX : x, 0);
		return (
			<g
				className={classnames(
					playground.selectedGroup === group.group && "selectedGroup"
				)}
				transform={`translate(${p.x} ${p.y})`}
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
				<SvgLine
					className="groupBorder"
					start={new Point(0, 0)}
					end={new Point(0, height)}
				/>
				<SvgLine
					className="groupBorder"
					start={new Point(this.props.group.width, 0)}
					end={new Point(this.props.group.width, height)}
				/>
				<SvgRect
					className="groupBackground"
					position={new Point(0, 0)}
					size={new Point(this.props.group.width, height)}
					stroke={"gray"}
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
					className="title"
					style={{ textAnchor: "start" }}
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
						start={new Point(10 + group.widthSum(idx), 30)}
						scaling={scaling}
						observable={observable}
						svgContext={svgContext}
						playground={playground}
					/>
				))}
			</g>
		);
	}
}
