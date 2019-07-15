import { observer, disposeOnUnmount } from "mobx-react";
import { Point } from "../std/Point";
import {
	ObservableMap,
	autorun,
	observable,
	runInAction,
	untracked,
	reaction,
} from "mobx";
import { ObservableGroups, ObservableGroup } from "../Model/ObservableGroups";
import { TimeAxis } from "./TimeAxis";
import React = require("react");
import { SvgContext, Scaling } from "./utils";
import { ObservableGroupView } from "./ObservableGroupView";
import { Subject } from "rxjs";
import { debounce, debounceTime } from "rxjs/operators";
import classNames = require("classnames");
import { ObservableGroupViewModel, PlaygroundViewModel } from "./ViewModels";
import { sortByNumericKey } from "../std/utils";

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
	private initializeContext(svg: SVGSVGElement | null) {
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

	private getScaling(): Scaling {
		const groups = this.props.playground.groups;
		groups.minTimeDistanceBetweenItems;

		const timeScaleFactor = Math.max(
			0.01,
			Math.min(30, 20 / groups.minTimeDistanceBetweenItems)
		);
		return {
			getY(time): number {
				return time * timeScaleFactor;
			},
			getTime(y): number {
				return y / timeScaleFactor;
			},
		};
	}

	private debounceSubject = new Subject();
	@observable private scaling = this.getScaling();

	private foo = this.debounceSubject.pipe(debounceTime(1000)).forEach(() => {
		this.scaling = this.getScaling();
	});

	@disposeOnUnmount r = autorun(() => {
		this.getScaling(); // trigger dependencies
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
	};

	render() {
		const groups = this.props.playground.groups;
		const scaling = this.scaling;

		const pointsStart = new Point(80.5, 30);

		const lastTime = Math.max(1, groups.lastTime);
		const height = Math.max(
			this.minSvgHeight,
			pointsStart.y + scaling.getY(lastTime) + 30
		);

		return (
			<div
				className="historyVisualizer"
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
						this.props.playground.timedObjDragBehavior.isActive &&
							"draggingEvent"
					)}
					onMouseDown={() => {
						this.props.playground.selectedGroup = undefined;
					}}
				>
					<TimeAxis
						start={pointsStart.sub({ x: 30 })}
						height={height}
						scaling={scaling}
					/>

					{this.layoutGroups().map(({ group, x }) => (
						<ObservableGroupView
							playground={this.props.playground}
							key={group.group.id}
							svgContext={this.svgContext}
							scaling={scaling}
							x={x}
							group={group}
							height={height}
						/>
					))}
				</svg>
			</div>
		);
	}
}
