import { Point } from "../std/Point";

export interface SvgContext {
	mouseToSvgCoordinates(mousePos: Point): Point;
}

export interface TimeOffsetConversion {
	getOffset(time: number): number;
	getTime(offset: number): number;
	offsetPerTime: number;
}
