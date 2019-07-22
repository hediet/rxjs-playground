import { autorun, observable, reaction, runInAction, computed } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import { Subject } from "rxjs";
import { debounceTime } from "rxjs/operators";
import { MutableObservableGroup } from "../Model/MutableObservableGroup";
import { Point, Rectangle } from "../std/Point";
import { SvgLine } from "../std/SvgElements";
import { sortByNumericKey } from "../std/utils";
import { ObservableGroupView } from "./ObservableGroupView";
import { TimeAxis } from "./TimeAxis";
import { SvgContext, TimeOffsetConversion } from "./utils";
import { ObservableGroupViewModel, PlaygroundViewModel } from "./ViewModels";
import React = require("react");
import classNames = require("classnames");

@observer
export class ObservableGroupsView extends React.Component<{
	playground: PlaygroundViewModel;
}> {
	@observable private groups: ObservableGroupViewModel[] = [];

	constructor(props: any) {
		super(props);

		reaction(
			() => [...this.props.playground.groups.groups],
			groups => {
				this.groups = groups.map(
					g =>
						this.groups.find(w => w.group === g) ||
						new ObservableGroupViewModel(g)
				);
			},
			{ fireImmediately: true }
		);

		autorun(() => {
			if (this.props.playground.groupDragBehavior.activeOperation) {
				this.props.playground.groupDragBehavior.activeOperation.onEnd.sub(
					() => {
						runInAction(() => {
							if (this.lastGroupOrderWhileDragging) {
								let i = -10000000;
								for (const g of this
									.lastGroupOrderWhileDragging) {
									g.group.position = i;
									i++;
								}
							}
						});
					}
				);
			}
		});
	}

	private lastGroupOrderWhileDragging:
		| ObservableGroupViewModel[]
		| undefined = undefined;

	private svgContext: SvgContext = { mouseToSvgCoordinates: undefined! };
	private svgElement: SVGSVGElement | null = null;
	private initializeContext(svg: SVGSVGElement | null) {
		this.svgElement = svg;
		if (!svg) {
			this.svgContext.mouseToSvgCoordinates = undefined!;
			return;
		}

		const pt = svg.createSVGPoint();

		this.svgContext.mouseToSvgCoordinates = (point: Point) => {
			pt.x = point.x;
			pt.y = point.y;
			var r = pt.matrixTransform(svg.getScreenCTM()!.inverse());
			return new Point(r.x, r.y);
		};
	}

	layoutGroups(): {
		group: ObservableGroupViewModel;
		x: number;
	}[] {
		const repairX = (
			arr: {
				group: ObservableGroupViewModel;
				x: number;
			}[]
		) => {
			let x = 100;
			for (const r of arr) {
				r.x = x;
				x += r.group.width + 20;
			}
		};

		const result = this.groups
			.filter(
				g => !this.props.playground.groupDragBehavior.isDataEqualTo(g)
			)
			.map((group, idx) => ({ group, x: 0, idx }));

		result.sort(
			sortByNumericKey(r => r.group.group.getPositionSortKey(r.idx))
		);

		repairX(result);

		const op = this.props.playground.groupDragBehavior.activeOperation;
		if (op) {
			result.push({
				group: op.data,
				x: 0,
				idx: -1,
			});

			result.sort(
				sortByNumericKey(r =>
					r.group.dragX !== undefined
						? r.group.dragX
						: r.x + r.group.width / 2
				)
			);

			this.lastGroupOrderWhileDragging = result.map(g => g.group);

			repairX(result);
		}

		result.sort(
			sortByNumericKey(g =>
				this.props.playground.groupDragBehavior
					.activeOrPreviousOperation &&
				this.props.playground.groupDragBehavior
					.activeOrPreviousOperation.data === g.group
					? 100
					: g.group.group.id
			)
		);
		return result;
	}

	private getTimeOffsetConversion(): TimeOffsetConversion {
		const groups = this.props.playground.groups;

		const timeScaleFactor = Math.max(
			0.01,
			Math.min(30, 20 / groups.minTimeDistanceBetweenItems)
		);
		return {
			getOffset(time): number {
				return time * timeScaleFactor + 30;
			},
			getTime(y): number {
				return (y - 30) / timeScaleFactor;
			},
			offsetPerTime: timeScaleFactor,
		};
	}

	private debounceSubject = new Subject();
	@observable private timeOffsetConversion = this.getTimeOffsetConversion();

	private _disposable = this.debounceSubject
		.pipe(debounceTime(1000))
		.forEach(() => {
			this.timeOffsetConversion = this.getTimeOffsetConversion();
		});

	@disposeOnUnmount r = autorun(() => {
		this.getTimeOffsetConversion(); // trigger dependencies
		this.debounceSubject.next();
	});

	private div: HTMLDivElement | undefined = undefined;
	@observable private minSvgHeight: number = 0;

	private x = setInterval(() => {
		if (this.div) {
			this.minSvgHeight = this.div.clientHeight - 1;
		}
	}, 100);

	private readonly setHistoryVisualizerDiv = (div: HTMLDivElement) => {
		this.div = div;
		if (div) {
			div.addEventListener("scroll", () => {
				this.scroll++;
			});
		}
	};

	@observable private scroll = 0;

	@computed get width(): number {
		return (
			this.groups.reduce((v, g) => v + g.width, 0) +
			Math.max(0, this.groups.length - 1) * 20
		);
	}

	render() {
		this.scroll;
		const groups = this.props.playground.groups;

		const lastTime = Math.max(
			1,
			groups.lastTime,
			this.props.playground.recordingModel.currentRecordTimeOrStart
		);
		const height = Math.max(
			this.minSvgHeight,
			this.timeOffsetConversion.getOffset(lastTime) + 30
		);

		if (this.div && this.props.playground.recordingModel.isRecording) {
			this.div.scrollTo(0, height);
		}

		const svgRect = this.svgElement
			? this.svgElement.getBoundingClientRect()
			: { left: 0, top: 0, width: 0, height: 0 };
		const divRect = this.div
			? this.div.getBoundingClientRect()
			: { left: 0, top: 0, width: 0, height: 0 };

		const visibleTopLeft = new Point(
			divRect.left - svgRect.left,
			divRect.top - svgRect.top
		).sub({ y: 300 });

		const visibleRectangle = new Rectangle(
			visibleTopLeft,
			visibleTopLeft.add({ x: divRect.width, y: divRect.height + 600 })
		);

		const playground = this.props.playground;

		const layout = this.layoutGroups();
		return (
			<div
				className="component-ObservableGroupsView"
				ref={this.setHistoryVisualizerDiv}
			>
				<svg
					ref={svg => this.initializeContext(svg)}
					height={height}
					style={
						{
							//minWidth: this.widthsSum(groups.groups.length) + 100,
						}
					}
					className={classNames(
						playground.timedObjDragBehavior.isActive &&
							"draggingEvent"
					)}
					onMouseDown={() => {
						playground.selectedGroup = undefined;
					}}
				>
					<TimeAxis
						x={60}
						height={height}
						timeOffsetConversion={this.timeOffsetConversion}
						visibleRectangle={visibleRectangle}
					/>

					{layout.map(({ group, x }) => (
						<ObservableGroupView
							playground={playground}
							key={group.group.id}
							svgContext={this.svgContext}
							timeOffsetConversion={this.timeOffsetConversion}
							x={x}
							group={group}
							height={height}
						/>
					))}

					<RecordingMarker
						x={100 - 20}
						playground={playground}
						timeOffsetConversion={this.timeOffsetConversion}
						width={this.width + 40}
					/>
				</svg>
			</div>
		);
	}
}

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
