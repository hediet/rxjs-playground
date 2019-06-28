import * as React from "react";
import { Model } from "./Model";
import classnames = require("classnames");
import { observer, disposeOnUnmount } from "mobx-react";
import { SingleObservableHistory, EventHistory } from "./Series";
import { Point } from "./Point";
import { binarySearch } from "./utils";
import { number } from "prop-types";
import { ObservableMap, autorun } from "mobx";

@observer
export class HistoryVisualizer extends React.Component<{
	history: EventHistory;
}> {
	private widths = new ObservableMap<number, number>();

	render() {
		const series = this.props.history;
		const timeScaleFactor = 30 / series.minTimeDistanceBetweenItems;

		function getYOffset(time: number) {
			return time * timeScaleFactor;
		}

		const pointsStart = new Point(80.5, 50);

		const lastTime = series.lastTime;
		const height = pointsStart.y + getYOffset(lastTime) + 50;

		const axisDYRange = [35, 60];
		const axisDTRange = [
			axisDYRange[0] / timeScaleFactor,
			axisDYRange[1] / timeScaleFactor,
		];
		console.log("axitDTRange", axisDTRange);

		function f(k: number) {
			const factors = [1, 2, 2.5, 5];
			return (
				factors[k % factors.length] *
				Math.pow(10, Math.floor(k / factors.length))
			);
		}

		const t = binarySearch(t => f(t) >= axisDTRange[0]);
		const axisDT = f(t);

		return (
			<svg className="series" height={height} width={1200}>
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
					let prevWidth = 0;
					for (let i = 0; i < obsIdx; i++) {
						const w = this.widths.get(i) || 200;
						prevWidth += w;
					}

					return (
						<SingleObservableHistoryVisualizer
							history={obsHistory}
							getYOffset={getYOffset}
							start={pointsStart.plus(new Point(prevWidth, 0))}
							lastTime={lastTime}
							setWidth={w => this.widths.set(obsIdx, w)}
						/>
					);
				})}
			</svg>
		);
	}
}

class SingleObservableHistoryVisualizer extends React.Component<{
	history: SingleObservableHistory;
	getYOffset: (t: number) => number;
	start: Point;
	lastTime: number;
	setWidth: (t: number) => void;
}> {
	private widths = new ObservableMap<number, number>();

	@disposeOnUnmount
	private readonly updateWidth = autorun(() => {
		let max = 20;
		for (const width of this.widths.values()) {
			max = Math.max(max, width);
		}
		this.props.setWidth(max + 20);
	});

	render() {
		const start = this.props.start;

		return (
			<g>
				<SvgLine
					start={start}
					end={start.plus(
						new Point(0, this.props.getYOffset(this.props.lastTime))
					)}
					stroke="black"
				/>
				{this.props.history.items.map((i, idx) => {
					const p = start.plus(
						new Point(0, this.props.getYOffset(i.time))
					);
					return (
						<g key={idx}>
							<SvgCircle center={p} radius={4} stroke="black" />
							<SvgText
								childRef={text => {
									if (!text) return;
									this.widths.set(idx, text.getBBox().width);
								}}
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
	childRef?: React.Ref<SVGTextElement>;
	textAnchor?: "middle" | "end" | "start";
	dominantBaseline?: "central" | "middle";
}) {
	return (
		<text
			x={props.position.x}
			y={props.position.y}
			ref={props.childRef}
			{...omit(props, ["position", "childRef"])}
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
