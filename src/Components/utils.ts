import { Point } from "../std/Point";
import { DragBehavior } from "../std/DragBehavior";
import { ObservableGroupViewModel } from "./ViewModels";

export interface SvgContext {
	mouseToSvgCoordinates(mousePos: Point): Point;
}

export interface TimeOffsetConversion {
	getOffset(time: number): number;
	getTime(offset: number): number;
	offsetPerTime: number;
}
