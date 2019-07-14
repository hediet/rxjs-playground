import { Point } from "../std/Point";
import { binarySearch } from "../std/utils";
import { SvgText, SvgLine } from "../std/SvgElements";
import React = require("react");
import { Scaling } from "./utils";

export function TimeAxis(props: {
	start: Point;
	scaling: Scaling;
	height: number;
}): React.ReactElement {
	const { start, scaling, height } = props;

	const factor = scaling.getY(1) - scaling.getY(0);

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
	const axisDT = getNiceFactor(t);

	return (
		<g>
			<SvgLine
				start={start}
				end={start.add({ y: height })}
				stroke="black"
			/>
			{new Array(
				Math.ceil(scaling.getTime(height - start.x - 10) / axisDT)
			)
				.fill(0)
				.map((i, idx) => {
					const t = idx * axisDT;
					const mid = new Point(
						start.x,
						start.y + scaling.getY(t) - 0.5
					);
					return (
						<g key={idx}>
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
				})}
		</g>
	);
}
