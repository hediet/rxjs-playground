import { observer } from "mobx-react";
import SplitPane from "react-split-pane";
import { DetailsPane } from "./DetailsPane";
import { ObservableGroupsView } from "./ObservableGroupsView";
import React = require("react");
import { PlaygroundViewModel } from "../ViewModels/PlaygroundViewModel";

@observer
export class PlaygroundView extends React.Component<
	{ playground: PlaygroundViewModel },
	{}
> {
	render() {
		const playground = this.props.playground;
		return (
			<div className="component-PlaygroundView">
				<div className="part-visualizer">
					<SplitPane
						split="vertical"
						minSize={200}
						defaultSize={"50%"}
					>
						<div className="part-view">
							<ObservableGroupsView playground={playground} />
						</div>
						<div className="part-details">
							<DetailsPane playground={playground} />
						</div>
					</SplitPane>
				</div>
			</div>
		);
	}
}
