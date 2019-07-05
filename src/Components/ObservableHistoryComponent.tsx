import { disposeOnUnmount, observer } from "mobx-react";
import { Point } from "../std/Point";
import { ObservableMap, autorun, observable } from "mobx";
import { SvgText, SvgLine, SvgCircle } from "../std/SvgElements";
import { PositionTransformation } from "../std/DragBehavior";
import { SvgContext, Scaling, eventDragBehavior } from "./utils";
import React = require("react");
import { ObservableWrapper } from "./ObservableHistoryGroupComponent";

@observer
export class ObservableHistoryComponent extends React.Component<{
	observable: ObservableWrapper;
	scaling: Scaling;
	start: Point;
	svgContext: SvgContext;
}> {
	render() {
		const start = this.props.start;

		return (
			<g>
				<SvgLine
					start={start}
					end={start.add({
						y: this.props.scaling.getY(
							this.props.observable.observable.last.time
						),
					})}
					stroke="black"
				/>
				{this.props.observable.observable.events.map((evt, idx) => {
					const p = start.add({
						y: this.props.scaling.getY(evt.time),
					});
					return (
						<g key={evt.id}>
							<SvgCircle
								center={p}
								radius={4}
								stroke="black"
								onMouseDown={e => {
									e.preventDefault();
									e.stopPropagation();
									const op = eventDragBehavior
										.start(
											undefined,
											new PositionTransformation(p =>
												this.props.svgContext.mouseToSvgCoordinates(
													p
												)
											)
												.translate(start.mul(-1))
												.then(
													p =>
														new Point(
															0,
															this.props.scaling.getTime(
																p.y
															)
														)
												)
										)
										.endOnMouseUp();

									op.onDrag.sub(data => {
										evt.time = data.position.y;
									});

									op.onEnd.sub(data => {});
								}}
							/>
							<SvgText
								childRef={text => {
									if (!text) {
										//this.widths.delete(idx);
									} else {
										this.props.observable.textWidths.set(
											idx,
											text.getBBox().width
										);
									}
								}}
								position={p.add(new Point(10, 0))}
								textAnchor="start"
								dominantBaseline="middle"
							>
								{JSON.stringify(evt.data)}
							</SvgText>
						</g>
					);
				})}
			</g>
		);
	}
}
