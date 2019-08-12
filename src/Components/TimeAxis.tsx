import { Point, Rectangle, point } from "../std/Point";
import { binarySearch, seq } from "../std/utils";
import { SvgText, SvgLine } from "../std/SvgElements";
import React = require("react");
import { TimeOffsetConversion } from "./utils";
import { computed } from "mobx";
import { observer } from "mobx-react";

@observer
export class TimeAxis extends React.Component<{
	x: number;
	timeOffsetConversion: TimeOffsetConversion;
	height: number;
	visibleRectangle: Rectangle;
}> {
	@computed get axisDT(): number {
		const { timeOffsetConversion } = this.props;
		const factor = timeOffsetConversion.offsetPerTime;
		const axisDYRange = [35, 60];
		const axisDTRange = [axisDYRange[0] / factor, axisDYRange[1] / factor];

		function getNiceFactor(idx: number) {
			const factors = [1, 2, 2.5, 5];
			return (
				factors[idx % factors.length] *
				Math.pow(10, Math.floor(idx / factors.length))
			);
		}

		const t = binarySearch(idx => getNiceFactor(idx) >= axisDTRange[0]);
		return getNiceFactor(t);
	}

	render() {
		const {
			x,
			timeOffsetConversion,
			height,
			visibleRectangle,
		} = this.props;

		const axisDT = this.axisDT;

		function getIdx(offset: number, rounding: "ceil" | "floor"): number {
			return Math[rounding](
				timeOffsetConversion.getTime(offset) / axisDT
			);
		}

		const firstVisibleTime = getIdx(visibleRectangle.topLeft.y, "floor");
		const lastVisibleTime =
			getIdx(visibleRectangle.bottomRight.y, "ceil") + 1;
		const lastTime = getIdx(height - x - 10, "ceil") + 1;

		return (
			<g className="component-TimeAxis">
				<SvgLine
					start={point({ x, y: timeOffsetConversion.getOffset(0) })}
					end={point({ x, y: height })}
					stroke="black"
				/>
				{seq(firstVisibleTime, Math.min(lastVisibleTime, lastTime)).map(
					idx => {
						const t = idx * axisDT;
						const mid = point({
							x,
							y: timeOffsetConversion.getOffset(t) - 0.5,
						});
						return (
							<g key={idx} className="part-TimeLabel">
								<SvgText
									position={mid.sub({ x: 10 })}
									textAnchor="end"
									dominantBaseline="middle"
								>
									{t.toString()}
								</SvgText>
								<SvgLine
									start={mid.sub({ x: 5 })}
									end={mid.add({ x: 5 })}
									stroke="black"
								/>
							</g>
						);
					}
				)}
			</g>
		);
	}
}
