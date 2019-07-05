import { observer } from "mobx-react";
import { Point } from "../std/Point";
import { ObservableMap, observable, autorun, computed } from "mobx";
import { SvgRect, SvgLine } from "../std/SvgElements";
import {
	ObservableHistoryGroup,
	ObservableHistory,
} from "../Model/ObservableHistoryGroups";
import { PositionTransformation } from "../std/DragBehavior";
import { SvgContext, Scaling, groupDragBehavior } from "./utils";
import React = require("react");
import { ObservableHistoryComponent } from "./ObservableHistoryComponent";
import { MutableObservableHistoryGroup } from "../Model/Mutable";

export class GroupWrapper {
	@observable public orderKey: number = 0;
	@observable public dragX: number | undefined = undefined;
	@observable public observables: ObservableWrapper[] = [];

	@computed get width(): number {
		return this.widthSum(this.observables.length);
	}

	widthSum(count: number): number {
		return Math.max(
			10,
			this.observables.slice(0, count).reduce((s, o) => s + o.width, 0)
		);
	}

	constructor(public readonly group: ObservableHistoryGroup) {
		autorun(() => {
			this.observables = group.observables.map(
				o => new ObservableWrapper(o)
			);
		});
	}
}

export class ObservableWrapper {
	@computed get width() {
		let max = 20;
		for (const width of this.textWidths.values()) {
			max = Math.max(max, width + 40);
		}
		return max;
	}

	public textWidths = new ObservableMap<number, number>();

	constructor(public readonly observable: ObservableHistory) {}
}

@observer
export class ObservableHistoryGroupComponent extends React.Component<{
	group: GroupWrapper;
	x: number;
	height: number;
	svgContext: SvgContext;
	scaling: Scaling;
}> {
	constructor(props: any) {
		super(props);
	}

	render(): React.ReactElement {
		const { group, x, height, svgContext, scaling } = this.props;
		const p = new Point(group.dragX !== undefined ? group.dragX : x, 0);
		return (
			<g
				transform={`translate(${p.x} ${p.y})`}
				style={
					groupDragBehavior.testActiveData(d => d === group)
						? {}
						: { transition: "0.4s all" }
				}
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
					onDoubleClick={e => {
						e.preventDefault();
						e.stopPropagation();

						if (
							group.group instanceof MutableObservableHistoryGroup
						) {
							const p = svgContext.mouseToSvgCoordinates(
								new Point(e.clientX, e.clientY)
							);
							const t = scaling.getTime(p.y - 50);
							group.group.history.addEvent(t, true);
						}
					}}
					onMouseDown={e => {
						e.preventDefault();
						e.stopPropagation();

						const op = groupDragBehavior
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

						op.onEnd.sub(data => {
							group.dragX = undefined;
						});
					}}
				/>
				{group.observables.map((observable, idx) => (
					<ObservableHistoryComponent
						key={idx}
						start={
							new Point(10 + this.props.group.widthSum(idx), 50)
						}
						scaling={scaling}
						observable={observable}
						svgContext={svgContext}
					/>
				))}
			</g>
		);
	}
}
