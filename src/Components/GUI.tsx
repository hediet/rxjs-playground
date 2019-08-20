import { observer } from "mobx-react";
import * as React from "react";
import { Model } from "../Model";
import { PlaygroundView } from "./PlaygroundView";

@observer
export class GUI extends React.Component<{ model: Model }, {}> {
	render() {
		return (
			<div className="gui">
				<PlaygroundView playground={this.props.model.playground} />
			</div>
		);
	}
}
