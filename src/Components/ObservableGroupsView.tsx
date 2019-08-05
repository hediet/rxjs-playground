import { autorun, observable, reaction, runInAction, computed } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import { Subject } from "rxjs";
import { debounceTime } from "rxjs/operators";
import { Point, Rectangle } from "../std/Point";
import { sortByNumericKey } from "../std/utils";
import { ObservableGroupView } from "./ObservableGroupView";
import { TimeAxis } from "./TimeAxis";
import { SvgContext, TimeOffsetConversion } from "./utils";
import { PlaygroundViewModel } from "../ViewModels/PlaygroundViewModel";
import { ObservableGroupViewModel } from "../ViewModels/ObservableGroupViewModel";
import React = require("react");
import classNames = require("classnames");
import { RecordingMarker } from "./RecordingMarker";

@observer
export class ObservableGroupsView extends React.Component<{
	playground: PlaygroundViewModel;
}> {
	@observable private groups: ObservableGroupViewModel[] = [];

	@disposeOnUnmount
	private readonly _updateGroupViewModelsReaction = reaction(
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

	@disposeOnUnmount
	private readonly _setGroupOrderAfterDragging = autorun(() => {
		if (this.props.playground.groupDragBehavior.activeOperation) {
			this.props.playground.groupDragBehavior.activeOperation.onEnd.sub(
				() => {
					runInAction("Set group order after dragging", () => {
						if (this.lastGroupOrderWhileDragging) {
							this.lastGroupOrderWhileDragging.forEach(
								(val, idx) => (val.group.position = idx)
							);
						}
					});
				}
			);
		}
	});

	private lastGroupOrderWhileDragging:
		| ObservableGroupViewModel[]
		| undefined = undefined;

	private svgContext: SvgContext = { mouseToSvgCoordinates: undefined! };
	private svgElement: SVGSVGElement | null = null;
	private setSvg(svg: SVGSVGElement | null) {
		this.svgElement = svg;
		if (!svg) {
			this.svgContext.mouseToSvgCoordinates = undefined!;
		} else {
			const pt = svg.createSVGPoint();
			this.svgContext.mouseToSvgCoordinates = (point: Point) => {
				pt.x = point.x;
				pt.y = point.y;
				var r = pt.matrixTransform(svg.getScreenCTM()!.inverse());
				return new Point(r.x, r.y);
			};
		}
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

	@disposeOnUnmount
	r = autorun(() => {
		this.getTimeOffsetConversion(); // trigger dependencies
		this.debounceSubject.next();
	});

	private div: HTMLDivElement | undefined = undefined;
	@observable private minSvgHeight: number = 0;

	private x = setInterval(() => {
		if (this.div) {
			this.minSvgHeight = this.div.clientHeight - 1;
		}
	}, 200);

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

		const recordingModel = this.props.playground.recordingModel;

		const lastTime = Math.max(
			1,
			groups.lastTime,
			recordingModel.currentRecordTimeOrStart
		);
		const height = Math.max(
			this.minSvgHeight,
			this.timeOffsetConversion.getOffset(lastTime) + 30
		);

		const svgRect = this.svgElement
			? this.svgElement.getBoundingClientRect()
			: { left: 0, top: 0, width: 0, height: 0 };
		const divRect = this.div
			? this.div.getBoundingClientRect()
			: { left: 0, top: 0, width: 0, height: 0 };

		const visibleTopLeft = new Point(
			divRect.left - svgRect.left,
			divRect.top - svgRect.top
		);

		const visibleRectangle = new Rectangle(
			visibleTopLeft,
			visibleTopLeft.add({ x: divRect.width, y: divRect.height })
		);

		if (this.div && recordingModel.isRecording) {
			const recordMarkerY = this.timeOffsetConversion.getOffset(
				recordingModel.getRecordTime(new Date())!
			);
			if (
				recordMarkerY + 100 > visibleRectangle.bottomLeft.y ||
				recordMarkerY < visibleRectangle.topLeft.y
			) {
				this.div.scrollTo(
					0,
					recordMarkerY - visibleRectangle.size.y + 100
				);
			}
		}

		const renderRectangle = new Rectangle(
			visibleRectangle.topLeft.sub({ y: 300 }),
			visibleRectangle.bottomRight.add({ y: 300 })
		);

		const playground = this.props.playground;

		const layout = this.layoutGroups();
		return (
			<div
				className="component-ObservableGroupsView"
				ref={this.setHistoryVisualizerDiv}
			>
				<svg
					ref={svg => this.setSvg(svg)}
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
						visibleRectangle={renderRectangle}
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
						svgContext={this.svgContext}
						width={this.width + 40}
					/>
				</svg>
			</div>
		);
	}
}
