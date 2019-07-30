import { observer } from "mobx-react";
import SplitPane from "react-split-pane";
import { Model } from "../Model";
import { DetailsPane } from "./DetailsPane";
import { ObservableGroupsView } from "./ObservableGroupsView";
import React = require("react");

@observer
export class PlaygroundView extends React.Component<{ model: Model }, {}> {
	render() {
		return (
			<div className="component-PlaygroundView">
				<div className="part-visualizer">
					<SplitPane
						split="vertical"
						minSize={200}
						defaultSize={"50%"}
					>
						<div className="part-view">
							<ObservableGroupsView
								playground={this.props.model.playground}
							/>
						</div>
						<div className="part-details">
							<DetailsPane
								playground={this.props.model.playground}
							/>
						</div>
					</SplitPane>
				</div>
			</div>
		);
	}
}
