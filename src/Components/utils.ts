import { Point } from "../std/Point";
import { PlaygroundViewModel } from "./ViewModels";
import { PositionTransformation } from "../std/DragBehavior";

export interface SvgContext {
	mouseToSvgCoordinates(mousePos: Point): Point;
}

export interface TimeOffsetConversion {
	getOffset(time: number): number;
	getTime(offset: number): number;
	offsetPerTime: number;
}

export function handleMouseDownOnTimedObj(
	e: React.MouseEvent<any, MouseEvent>,
	data: unknown,
	setTime: (time: number) => void,
	playground: PlaygroundViewModel,
	svgContext: SvgContext,
	timeOffsetConversion: TimeOffsetConversion,
	end?: () => void
): void {
	e.preventDefault();
	e.stopPropagation();
	const op = playground.timedObjDragBehavior
		.start(
			data,
			new PositionTransformation(p =>
				svgContext.mouseToSvgCoordinates(p)
			).then(p => new Point(0, timeOffsetConversion.getTime(p.y)))
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
