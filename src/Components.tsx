import * as React from "react";
import { Model } from "./Model";
import classnames = require("classnames");
import { observer, disposeOnUnmount } from "mobx-react";
import { ObservableHistory, EventHistory } from "./Series";
import { Point } from "./Point";

export class HistoryVisualizer extends React.Component<{
	history: EventHistory;
}> {
	render() {
		const series = this.props.history;
		const timeScaleFactor = 30 / series.minTimeDistanceBetweenItems;

		function getYOffset(time: number) {
			return time * timeScaleFactor;
		}

		const pointsStart = new Point(80.5, 50);

		const lastTime = series.lastTime;
		const height = pointsStart.y + getYOffset(lastTime) + 50;

		const axisDYRange = [5, 50];
		const axitDTRange = [
			axisDYRange[0] / timeScaleFactor,
			axisDYRange[1] / timeScaleFactor,
		];
		console.log("axitDTRange", axitDTRange);
		const axisDT = 2;

		// 1
		// 5
		// 10
		// 20
		// 100

		return (
			<svg className="series" height={height} width={800}>
				<SvgLine
					start={pointsStart.minus(new Point(20, 0))}
					end={pointsStart
						.minus(new Point(20, 0))
						.plus(new Point(0, getYOffset(lastTime) + 20))}
					stroke="black"
				/>
				{new Array(Math.ceil(lastTime / axisDT + 1))
					.fill(0)
					.map((i, idx) => {
						const y = idx * axisDT;
						const mid = new Point(
							pointsStart.minus(new Point(20, 0)).x,
							pointsStart.y + getYOffset(y) - 0.5
						);
						return (
							<g key={idx}>
								<SvgText
									position={mid.minus(new Point(10, 0))}
									textAnchor="end"
									dominantBaseline="middle"
								>
									{y.toString()}
								</SvgText>
								<SvgLine
									start={mid.minus(new Point(5, 0))}
									end={mid.plus(new Point(5, 0))}
									stroke="black"
								/>
							</g>
						);
					})}

				{series.observables.map((obsHistory, obsIdx) => {
					const pointsStart2 = pointsStart.plus(
						new Point(obsIdx * 200, 0)
					);

					return (
						<g>
							<SvgLine
								start={pointsStart2}
								end={pointsStart2.plus(
									new Point(0, getYOffset(lastTime))
								)}
								stroke="black"
							/>
							{obsHistory.items.map((i, idx) => {
								const p = pointsStart2.plus(
									new Point(0, getYOffset(i.time))
								);
								return (
									<g key={idx}>
										<SvgCircle
											center={p}
											radius={4}
											stroke="black"
										/>
										<SvgText
											position={p.plus(new Point(10, 0))}
											textAnchor="start"
											dominantBaseline="middle"
										>
											{JSON.stringify(i.data)}
										</SvgText>
									</g>
								);
							})}
						</g>
					);
				})}
			</svg>
		);
	}
}

type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

function omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
	const newObj: Omit<T, K> = {} as any;
	for (const [key, val] of Object.entries(obj)) {
		if (!keys.includes(key as K)) {
			(newObj as any)[key] = val;
		}
	}

	return newObj;
}

interface SvgAttributes {
	stroke: string;
}

function SvgText(props: {
	position: Point;
	children: string;
	textAnchor?: "middle" | "end" | "start";
	dominantBaseline?: "central" | "middle";
}) {
	return (
		<text
			x={props.position.x}
			y={props.position.y}
			{...omit(props, ["position"])}
		/>
	);
}

function SvgCircle(props: { center: Point; radius: number } & SvgAttributes) {
	return (
		<circle
			cx={props.center.x}
			cy={props.center.y}
			r={props.radius}
			{...omit(props, ["center", "radius"])}
		/>
	);
}

function SvgLine(props: { start: Point; end: Point } & SvgAttributes) {
	return (
		<line
			x1={props.start.x}
			y1={props.start.y}
			x2={props.end.x}
			y2={props.end.y}
			{...omit(props, ["end", "start"])}
		/>
	);
}

@observer
export class GUI extends React.Component<{ model: Model }, {}> {
	render() {
		return (
			<div>
				<HistoryVisualizer history={this.props.model.history} />
			</div>
		);
	}
}
