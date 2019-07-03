import * as React from "react";
import { Model } from "./Model";
import classnames = require("classnames");
import { observer, disposeOnUnmount } from "mobx-react";
import { SingleObservableHistory, EventHistory } from "./Series";
import { Point } from "./Point";
import { binarySearch } from "./utils";
import { number } from "prop-types";
import { ObservableMap, autorun } from "mobx";
import { SvgText, SvgLine, SvgCircle } from "./SvgElements";

@observer
export class HistoryVisualizer extends React.Component<{
	history: EventHistory;
}> {
	private widths = new ObservableMap<number, number>();
	private widthsSum(length: number): number {
		let totalWidth = 0;
		for (let i = 0; i < length; i++) {
			const width = this.widths.get(i) || 200;
			totalWidth += width;
		}
		return totalWidth;
	}

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
			<div className="historyVisualizer">
				<svg
					height={height}
					style={{
						minWidth:
							this.widthsSum(series.observables.length) + 100,
					}}
				>
					<SvgLine
						start={pointsStart.subtract(new Point(30, 0))}
						end={pointsStart
							.subtract(new Point(30, 0))
							.add(new Point(0, getYOffset(lastTime) + 20))}
						stroke="black"
					/>
					{new Array(Math.ceil(lastTime / axisDT + 1))
						.fill(0)
						.map((i, idx) => {
							const y = idx * axisDT;
							const mid = new Point(
								pointsStart.subtract(new Point(30, 0)).x,
								pointsStart.y + getYOffset(y) - 0.5
							);
							return (
								<g key={idx}>
									<SvgText
										position={mid.subtract(
											new Point(10, 0)
										)}
										textAnchor="end"
										dominantBaseline="middle"
									>
										{y.toString()}
									</SvgText>
									<SvgLine
										start={mid.subtract(new Point(5, 0))}
										end={mid.add(new Point(5, 0))}
										stroke="black"
									/>
								</g>
							);
						})}

					{series.observables.map((obsHistory, obsIdx) => {
						const prevWidth = this.widthsSum(obsIdx);

						return (
							<SingleObservableHistoryVisualizer
								history={obsHistory}
								getYOffset={getYOffset}
								start={pointsStart.add(new Point(prevWidth, 0))}
								lastTime={lastTime}
								setWidth={w => this.widths.set(obsIdx, w)}
							/>
						);
					})}
				</svg>
			</div>
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
					end={start.add(
						new Point(0, this.props.getYOffset(this.props.lastTime))
					)}
					stroke="black"
				/>
				{this.props.history.items.map((i, idx) => {
					const p = start.add(
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
								position={p.add(new Point(10, 0))}
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

@observer
export class GUI extends React.Component<{ model: Model }, {}> {
	render() {
		return (
			<div className="gui">
				<h1 className="header">Rxjs Visualizer</h1>
				<div className="visualizer">
					<HistoryVisualizer history={this.props.model.history} />
				</div>
			</div>
		);
	}
}
