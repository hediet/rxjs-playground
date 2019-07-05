import { Point } from "./Point";
import * as React from "react";
import { StandardLonghandProperties, Properties } from "csstype";

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

export interface SvgAttributes<T> extends React.DOMAttributes<T> {
	stroke?: string;
	className?: string;
	style?: Properties;
}

export function SvgText(
	props: {
		position: Point;
		children: any;
		childRef?: React.Ref<SVGTextElement>;
		textAnchor?: "middle" | "end" | "start";
		dominantBaseline?: "central" | "middle";
	} & SvgAttributes<SVGTextElement>
) {
	return (
		<text
			x={props.position.x}
			y={props.position.y}
			ref={props.childRef}
			{...omit(props, ["position", "childRef"])}
		/>
	);
}

export function SvgCircle(
	props: { center: Point; radius: number } & SvgAttributes<SVGCircleElement>
) {
	return (
		<circle
			cx={props.center.x}
			cy={props.center.y}
			r={props.radius}
			{...omit(props, ["center", "radius"])}
		/>
	);
}

export function SvgLine(
	props: { start: Point; end: Point } & SvgAttributes<SVGLineElement>
) {
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

export function SvgRect(
	props: { position: Point; size: Point; fill?: string } & SvgAttributes<
		SVGRectElement
	>
) {
	return (
		<rect
			x={props.position.x}
			y={props.position.y}
			width={props.size.x}
			height={props.size.y}
			{...omit(props, ["position", "size"])}
		/>
	);
}

export function Svg(props: { position: Point } & SvgAttributes<SVGSVGElement>) {
	return (
		<svg
			x={props.position.x}
			y={props.position.y}
			{...omit(props, ["position"])}
		/>
	);
}
