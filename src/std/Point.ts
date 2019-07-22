function sqr(a: number) {
	return a * a;
}

export type PointLike =
	| Point
	| { x?: number; y: number }
	| { x: number; y?: number };

export function point(data: PointLike) {
	if (data instanceof Point) {
		return data;
	}
	return new Point(data.x || 0, data.y || 0);
}

export class Point {
	public static readonly Zero = new Point(0, 0);

	constructor(public readonly x: number, public readonly y: number) {}

	public distance(other: PointLike = Point.Zero): number {
		const d = this.sub(other);
		return Math.sqrt(sqr(d.x) + sqr(d.y));
	}

	public sub(other: PointLike): Point {
		const o = point(other);
		return new Point(this.x - o.x, this.y - o.y);
	}

	public add(other: PointLike): Point {
		const o = point(other);
		return new Point(this.x + o.x, this.y + o.y);
	}

	public mul(scalar: number): Point {
		return new Point(this.x * scalar, this.y * scalar);
	}

	public div(scalar: number): Point {
		return new Point(this.x / scalar, this.y / scalar);
	}

	public equals(other: PointLike) {
		const o = point(other);
		return this.x === o.x && this.y === o.y;
	}

	public getPointCloserTo(dest: PointLike, dist: number): Point {
		if (this.equals(dest)) return this;

		var p = point(dest).sub(this);
		const angle = Math.atan2(p.x, p.y);

		var result = new Point(
			this.x + Math.sin(angle) * dist,
			this.y + Math.cos(angle) * dist
		);
		return result;
	}
}

function turn(p1: Point, p2: Point, p3: Point): number {
	const a = p1.x;
	const b = p1.y;
	const c = p2.x;
	const d = p2.y;
	const e = p3.x;
	const f = p3.y;
	const A = (f - b) * (c - a);
	const B = (d - b) * (e - a);
	return A > B + Number.MIN_VALUE ? 1 : A + Number.MIN_VALUE < B ? -1 : 0;
}

export function isIntersect(
	aStart: Point,
	aEnd: Point,
	bStart: Point,
	bEnd: Point
): boolean {
	return (
		turn(aStart, bStart, bEnd) != turn(aEnd, bStart, bEnd) &&
		turn(aStart, aEnd, bStart) != turn(aStart, aEnd, bEnd)
	);
}

// first zoom then translate
export function scale(
	clientOffset: Point,
	clientSize: Point,
	viewSize: Point
): { clientZoom: number; clientOffset: Point } {
	const clientRatio = clientSize.x / clientSize.y;
	const viewRatio = viewSize.x / viewSize.y;

	let zoom = 1;

	if (clientRatio < viewRatio) zoom = viewSize.y / clientSize.y;
	else zoom = viewSize.x / clientSize.x;

	const clientMid = clientOffset.mul(zoom).add(clientSize.mul(zoom / 2));
	const viewMid = viewSize.div(2);

	const clientOffset2 = viewMid.sub(clientMid);

	return { clientOffset: clientOffset2, clientZoom: zoom };
}

export class Rectangle {
	public static ofSize(position: Point, size: Point): Rectangle {
		return new Rectangle(position, position.add(size));
	}

	constructor(
		public readonly topLeft: Point,
		public readonly bottomRight: Point
	) {}

	get size(): Point {
		return this.bottomRight.sub(this.topLeft);
	}

	get topRight(): Point {
		return new Point(this.bottomRight.x, this.topLeft.y);
	}

	get bottomLeft(): Point {
		return new Point(this.topLeft.x, this.bottomRight.y);
	}
}
