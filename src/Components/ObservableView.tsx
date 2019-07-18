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
	MutableObservableEvent,
} from "../Model/Mutable";
import { ObservableEvent } from "../Model/ObservableGroups";

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
	@observable contextMenuT: number | undefined = undefined;
	@observable endSelected = false;

	handleMouseDownOnTimedObj(
		e: React.MouseEvent<any, MouseEvent>,
		data: unknown,
		setTime: (time: number) => void,
		end?: () => void
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

		op.onEnd.sub(data => {
			if (end) {
				end();
			}
		});
	}

	render() {
		const playground = this.props.playground;

		const zero = this.props.start;
		const o = this.props.observable.observable;
		const s = this.props.scaling;
		const y1 = s.getY(o.startTime);

		const start = zero.add({ y: y1 });
		const y2 = o.endTime ? s.getY(o.endTime) : 10000;

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

						if (o instanceof MutableObservableHistory) {
							this.temporaryEventT = this.props.scaling.getTime(
								p.y
							);
						}
					}}
					onMouseLeave={() => {
						this.temporaryEventT = undefined;
					}}
					onClick={e => {
						const t = this.temporaryEventT;
						if (
							o instanceof MutableObservableHistory &&
							t !== undefined
						) {
							e.preventDefault();
							o.addEvent(t, o.events.length + 1);
						}
					}}
					onContextMenu={e => {
						const t = this.temporaryEventT;
						if (
							o instanceof MutableObservableHistory &&
							t !== undefined
						) {
							e.preventDefault();
							this.showContextMenu(o, t, e);
						}
					}}
				/>
				{(this.temporaryEventT || this.contextMenuT) && (
					<SvgCircle
						pointerEvents="none"
						className="event-temporary"
						center={zero.add({
							y: this.props.scaling.getY(
								this.temporaryEventT || this.contextMenuT!
							),
						})}
						radius={4}
						stroke="black"
					/>
				)}

				{this.renderCross({ center: end })}

				{this.props.observable.observable.events.map((evt, idx) => {
					return this.renderEvent(evt, playground, idx);
				})}
			</g>
		);
	}

	private showContextMenu(
		o: MutableObservableHistory<any>,
		t: number,
		e: React.MouseEvent<SVGRectElement, MouseEvent>
	) {
		this.contextMenuT = t;
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
					onClick={() => o.addEvent(t, o.events.length + 1)}
				/>
			</Menu>,
			{ left: e.clientX, top: e.clientY },
			() => {
				this.contextMenuT = undefined;
				this.selectedEventId = -1;
			}
		);
	}

	private renderEvent(
		evt: ObservableEvent,
		playground: PlaygroundViewModel,
		idx: number
	): JSX.Element {
		const p = this.props.start.add({
			y: this.props.scaling.getY(evt.time),
		});
		const o = this.props.observable.observable;

		const isLarge =
			playground.timedObjDragBehavior.isDataEqualTo(evt.id) ||
			this.selectedEventId === evt.id;

		return (
			<g key={evt.id}>
				<SvgCircle
					className={classNames(
						"event",
						o instanceof MutableObservableHistory && "mutable",
						isLarge && "large"
					)}
					onContextMenu={e => {
						if (o instanceof MutableObservableHistory) {
							e.preventDefault();
							this.selectedEventId = evt.id;
							this.showEventContextMenu(o, evt, e);
						}
					}}
					center={p}
					radius={4}
					stroke="black"
					onMouseDown={e => {
						if (evt instanceof MutableObservableEvent) {
							this.handleMouseDownOnTimedObj(
								e,
								evt.id,
								t => (evt.time = t)
							);
						}
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
	}

	private showEventContextMenu(
		o: MutableObservableHistory<any>,
		evt: ObservableEvent,
		e: React.MouseEvent<SVGCircleElement, MouseEvent>
	) {
		ContextMenu.show(
			<Menu>
				<MenuItem
					text="Delete"
					icon="delete"
					onClick={() => o.removeEvent(evt)}
				/>
			</Menu>,
			{ left: e.clientX, top: e.clientY },
			() => {
				this.selectedEventId = -1;
			}
		);
	}

	private renderCross({ center }: { center: Point }) {
		const o = this.props.observable.observable;

		return (
			<g
				className={classNames(
					"end",
					o instanceof MutableObservableHistory && "mutable",
					this.endSelected && "selected"
				)}
				onMouseDown={e => {
					if (o instanceof MutableObservableHistory) {
						this.endSelected = true;
						this.handleMouseDownOnTimedObj(
							e,
							-1,
							t => (o.endTime = t),
							() => (this.endSelected = false)
						);
					}
				}}
				onContextMenu={e => {
					if (o instanceof MutableObservableHistory) {
						e.preventDefault();
						this.endSelected = true;
						ContextMenu.show(
							<Menu>
								<MenuItem
									text="Remove End"
									icon="delete"
									onClick={() => (o.endTime = undefined)}
								/>
							</Menu>,
							{ left: e.clientX, top: e.clientY },
							() => {
								this.endSelected = false;
							}
						);
					}
				}}
			>
				<SvgCircle className="dragHandle" center={center} radius={5} />
				<SvgLine
					start={center.add({ x: -5, y: -5 })}
					end={center.add({ x: 5, y: 5 })}
					stroke="black"
				/>
				<SvgLine
					start={center.add({ x: -5, y: 5 })}
					end={center.add({ x: 5, y: -5 })}
					stroke="black"
				/>
			</g>
		);
	}
}
