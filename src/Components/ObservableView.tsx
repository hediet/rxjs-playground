import { observer } from "mobx-react";
import { Point } from "../std/Point";
import { SvgText, SvgLine, SvgCircle, SvgRect } from "../std/SvgElements";
import { PositionTransformation } from "../std/DragBehavior";
import { SvgContext, Scaling } from "./utils";
import React = require("react");
import { ObservableViewModel, PlaygroundViewModel } from "./ViewModels";
import {
	Popover,
	ContextMenuTarget,
	Menu,
	MenuItem,
	ContextMenu,
} from "@blueprintjs/core";
import classNames = require("classnames");
import { observable } from "mobx";
import {
	MutableObservableHistoryGroup,
	MutableObservableHistory,
} from "../Model/Mutable";

function SvgCross({ center }: { center: Point }) {
	return (
		<g>
			<SvgLine
				start={center.add({ x: -5, y: -5 })}
				end={center.add({ x: 5, y: 5 })}
				stroke="black"
				style={{
					strokeWidth: "2px",
				}}
			/>
			<SvgLine
				start={center.add({ x: -5, y: 5 })}
				end={center.add({ x: 5, y: -5 })}
				stroke="black"
				style={{
					strokeWidth: "2px",
				}}
			/>
		</g>
	);
}

@observer
export class ObservableView extends React.Component<{
	observable: ObservableViewModel;
	scaling: Scaling;
	start: Point;
	playground: PlaygroundViewModel;
	svgContext: SvgContext;
}> {
	@observable private selectedEventId: number = -1;

	@observable temporaryEventT: number | undefined = undefined;

	handleMouseDownOnTimedObj(
		e: React.MouseEvent<SVGCircleElement, MouseEvent>,
		data: unknown,
		setTime: (time: number) => void
	): void {
		e.preventDefault();
		e.stopPropagation();
		const zero = this.props.start;
		const op = this.props.playground.timedObjDragBehavior
			.start(
				data,
				new PositionTransformation(p =>
					this.props.svgContext.mouseToSvgCoordinates(p)
				)
					.translate(zero.mul(-1))
					.then(p => new Point(0, this.props.scaling.getTime(p.y)))
			)
			.endOnMouseUp();

		op.onDrag.sub(data => {
			setTime(data.position.y);
		});

		op.onEnd.sub(data => {});
	}

	render() {
		const playground = this.props.playground;

		const zero = this.props.start;
		const o = this.props.observable.observable;
		const s = this.props.scaling;
		const y1 = s.getY(o.startTime);

		const start = zero.add({ y: y1 });
		const y2 = o.endTime ? s.getY(o.endTime) : 10000;

		const last = this.props.observable.observable.last;
		const end = zero.add({
			y: y2,
		});

		return (
			<g>
				<SvgLine
					start={start.add({ x: -5 })}
					end={start.add({ x: 5 })}
					stroke="black"
				/>
				<SvgLine start={start} end={end} stroke="black" />
				<SvgRect
					position={start.sub({ x: 10 })}
					size={new Point(20, 10000)}
					fill="transparent"
					onMouseMove={e => {
						const p = this.props.svgContext
							.mouseToSvgCoordinates(
								new Point(e.clientX, e.clientY)
							)
							.sub(zero);
						this.temporaryEventT = this.props.scaling.getTime(p.y);
					}}
					onMouseLeave={() => {
						this.temporaryEventT = undefined;
					}}
					onClick={e => {
						const t = this.temporaryEventT;
						if (
							!(o instanceof MutableObservableHistory) ||
							t === undefined
						) {
							return;
						}

						e.preventDefault();

						o.addEvent(t, o.events.length + 1);
					}}
					onContextMenu={e => {
						const t = this.temporaryEventT;
						if (
							!(o instanceof MutableObservableHistory) ||
							t === undefined
						) {
							return;
						}
						e.preventDefault();
						ContextMenu.show(
							<Menu>
								<MenuItem
									text="Set End"
									icon="flow-end"
									onClick={() => (o.endTime = t)}
								/>
								<MenuItem
									text="Add"
									icon="add"
									onClick={() =>
										o.addEvent(t, o.events.length + 1)
									}
								/>
							</Menu>,
							{ left: e.clientX, top: e.clientY },
							() => {
								this.selectedEventId = -1;
							}
						);
					}}
				/>
				{this.temporaryEventT && (
					<SvgCircle
						pointerEvents="none"
						className="event-temporary"
						center={zero.add({
							y: this.props.scaling.getY(this.temporaryEventT),
						})}
						radius={4}
						stroke="black"
					/>
				)}

				<SvgCross center={end} />
				{this.props.observable.observable.events.map((evt, idx) => {
					const p = zero.add({
						y: this.props.scaling.getY(evt.time),
					});
					return (
						<g key={evt.id}>
							<SvgCircle
								className={classNames(
									"event",
									(playground.timedObjDragBehavior.isDataEqualTo(
										evt.id
									) ||
										this.selectedEventId === evt.id) &&
										"large"
								)}
								onContextMenu={e => {
									e.preventDefault();
									this.selectedEventId = evt.id;

									ContextMenu.show(
										<Menu>
											<MenuItem
												text="Delete"
												icon="delete"
												onClick={() =>
													this.props.observable.observable.removeEvent(
														evt
													)
												}
											/>
										</Menu>,
										{ left: e.clientX, top: e.clientY },
										() => {
											this.selectedEventId = -1;
										}
									);
								}}
								center={p}
								radius={4}
								stroke="black"
								onMouseDown={e => {
									this.handleMouseDownOnTimedObj(
										e,
										evt.id,
										t => (evt.time = t)
									);
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
