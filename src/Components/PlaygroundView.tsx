import { Model } from "../Model";
import { observer, disposeOnUnmount } from "mobx-react";
import { ObservableGroupsView } from "./ObservableGroupsView";
import {
	Button,
	FormGroup,
	ButtonGroup,
	Label,
	NumericInput,
} from "@blueprintjs/core";
import { MutableObservableGroup } from "../Model/MutableObservableGroup";
import React = require("react");
import { autorun, observable } from "mobx";
import { TSComputedObservableGroup } from "../Model/TSComputedObservableGroup";
import { PlaygroundViewModel } from "./ViewModels";
import { ObservableGroup } from "../Model/ObservableGroups";
import SplitPane from "react-split-pane";
import { MonacoEditor } from "./MonacoEditor";
import { DetailsPane } from "./DetailsPane";

@observer
export class PlaygroundView extends React.Component<{ model: Model }, {}> {
	render() {
		return (
			<div className="component-playground">
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
