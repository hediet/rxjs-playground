import { Point } from "../std/Point";
import { DragBehavior } from "../std/DragBehavior";
import { GroupWrapper } from "./ObservableHistoryGroupComponent";

export function sortByNumericKey<T>(
	keySelector: (item: T) => number
): (a: T, b: T) => number {
	return (a, b) => {
		return keySelector(a) - keySelector(b);
	};
}

export interface SvgContext {
	mouseToSvgCoordinates(mousePos: Point): Point;
}

export interface Scaling {
	getY(time: number): number;
	getTime(y: number): number;
}

export const groupDragBehavior = new DragBehavior<GroupWrapper>();

export const eventDragBehavior = new DragBehavior();
