import * as React from "react";
import { Model } from "../Model";
import classnames = require("classnames");
import { observer } from "mobx-react";
import { ObservableHistoryGroupsComponent } from "./ObservableHistoryGroupsComponent";

@observer
export class GUI extends React.Component<{ model: Model }, {}> {
	render() {
		return (
			<div className="gui">
				<h1 className="header">Rxjs Visualizer</h1>
				<div className="visualizer">
					<ObservableHistoryGroupsComponent
						groups={this.props.model.groups}
					/>
				</div>
			</div>
		);
	}
}
