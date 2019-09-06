import { observer } from "mobx-react";
import * as React from "react";
import { Model, Demo } from "../Model";
import { PlaygroundView } from "./PlaygroundView";
import { Button, MenuItem } from "@blueprintjs/core";
import { runInAction } from "mobx";
import { Select, ItemRenderer } from "@blueprintjs/select";

@observer
export class GUI extends React.Component<{ model: Model }, {}> {
	render() {
		const DemoSelect = Select.ofType<Demo>();

		const renderDemo: ItemRenderer<Demo> = (
			demo,
			{ handleClick, modifiers }
		) => {
			if (!modifiers.matchesPredicate) {
				return null;
			}
			return (
				<MenuItem
					key={demo.name}
					active={modifiers.active}
					disabled={modifiers.disabled}
					text={demo.name}
					onClick={handleClick}
				/>
			);
		};

		const model = this.props.model;
		return (
			<div className="gui">
				<DemoSelect
					items={model.demos}
					itemPredicate={(query: string, item: Demo) =>
						item.name.toLowerCase().indexOf(query.toLowerCase()) !==
						-1
					}
					activeItem={model.selectedDemo}
					itemRenderer={renderDemo}
					noResults={<MenuItem disabled={true} text="No results." />}
					onItemSelect={item =>
						runInAction(() => {
							model.setDemo(item);
						})
					}
				>
					<Button
						text={
							model.selectedDemo
								? model.selectedDemo.name
								: "(No Demo selected)"
						}
						rightIcon="double-caret-vertical"
					/>
				</DemoSelect>

				<div
					style={{
						height: 1,
						marginTop: 10,
						marginBottom: 10,
						marginLeft: -10,
						marginRight: -10,
						borderTop: "1px solid #738694",
					}}
				/>

				<PlaygroundView playground={this.props.model.playground} />
			</div>
		);
	}
}
