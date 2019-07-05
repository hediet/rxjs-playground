import { observer, disposeOnUnmount } from "mobx-react";
import { Point } from "../std/Point";
import { ObservableMap, autorun, observable, runInAction } from "mobx";
import {
	ObservableHistoryGroups,
	ObservableHistoryGroup,
} from "../Model/ObservableHistoryGroups";
import { TimeAxis } from "./TimeAxis";
import React = require("react");
import {
	SvgContext,
	groupDragBehavior,
	sortByNumericKey,
	Scaling,
	eventDragBehavior,
} from "./utils";
import {
	ObservableHistoryGroupComponent,
	GroupWrapper,
} from "./ObservableHistoryGroupComponent";
import { Subject } from "rxjs";
import { debounce, debounceTime } from "rxjs/operators";
import classNames = require("classnames");

@observer
export class ObservableHistoryGroupsComponent extends React.Component<{
	groups: ObservableHistoryGroups;
}> {
	@observable private groups: GroupWrapper[] = [];

	constructor(props: any) {
		super(props);

		autorun(() => {
			this.groups = this.props.groups.groups.map(
				g => new GroupWrapper(g)
			);
		});

		autorun(() => {
			if (groupDragBehavior.activeOperation) {
				groupDragBehavior.activeOperation.onEnd.sub(() => {
					runInAction(() => {
						if (this.lastGroupOrder) {
							this.groups = this.lastGroupOrder;
						}
					});
				});
			}
		});
	}

	private lastGroupOrder: GroupWrapper[] | undefined = undefined;

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
		group: GroupWrapper;
		x: number;
	}[] {
		const repairX = (
			arr: {
				group: GroupWrapper;
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
			.filter(g => !groupDragBehavior.isDataEqualTo(g))
			.map(group => ({ group, x: 0 }));

		repairX(result);

		const op = groupDragBehavior.activeOperation;
		if (op) {
			result.push({
				group: op.data,
				x: 0,
			});

			result.sort(
				sortByNumericKey(r =>
					r.group.dragX !== undefined
						? r.group.dragX
						: r.x + r.group.width / 2
				)
			);

			this.lastGroupOrder = result.map(g => g.group);

			repairX(result);
		}

		result.sort(
			sortByNumericKey(g =>
				groupDragBehavior.activeOrPreviousOperation &&
				groupDragBehavior.activeOrPreviousOperation.data === g.group
					? 100
					: g.group.group.id
			)
		);
		return result;
	}

	private getScaling(): Scaling {
		const groups = this.props.groups;
		groups.minTimeDistanceBetweenItems;

		const timeScaleFactor = Math.max(
			1,
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

	render() {
		const groups = this.props.groups;
		const scaling = this.scaling;

		const pointsStart = new Point(80.5, 50);

		const lastTime = Math.max(1, groups.lastTime);
		const height = pointsStart.y + scaling.getY(lastTime) + 50;

		return (
			<div className="historyVisualizer">
				<svg
					ref={svg => this.initializeContext(svg)}
					height={height}
					style={
						{
							//minWidth: this.widthsSum(groups.groups.length) + 100,
						}
					}
					className={classNames(
						eventDragBehavior.isActive && "draggingEvent"
					)}
				>
					<TimeAxis
						start={pointsStart.sub({ x: 30 })}
						lastTime={lastTime}
						scaling={scaling}
					/>

					{this.layoutGroups().map(({ group, x }) => (
						<ObservableHistoryGroupComponent
							key={group.group.id}
							svgContext={this.svgContext}
							scaling={scaling}
							x={x}
							{...{ group, height }}
						/>
					))}
				</svg>
			</div>
		);
	}
}
