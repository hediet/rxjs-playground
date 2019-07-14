import { Point } from "../std/Point";
import { DragBehavior } from "../std/DragBehavior";
import { ObservableGroupViewModel } from "./ViewModels";

export interface SvgContext {
	mouseToSvgCoordinates(mousePos: Point): Point;
}

export interface Scaling {
	getY(time: number): number;
	getTime(y: number): number;
}

export const groupDragBehavior = new DragBehavior<ObservableGroupViewModel>();

export const eventDragBehavior = new DragBehavior();
