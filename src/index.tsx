import * as React from "react";
import * as ReactDOM from "react-dom";
import "./style.scss";
import { Model } from "./Model";
import Components = require("./Components/GUI");
import { runInAction } from "mobx";

const model = runInAction("Create model", () => new Model());

function render(target: HTMLDivElement) {
	const c = require("./Components/GUI") as typeof Components;
	ReactDOM.render(<c.GUI model={model} />, target);
}

const target = document.createElement("div");
target.className = "target";
document.body.appendChild(target);

const destination = document.createElement("div");
destination.id = "destination";
document.body.appendChild(destination);

render(target);

declare var module: {
	hot?: { accept: (componentName: string, callback: () => void) => void };
};
declare var require: (name: string) => any;

if (module.hot) {
	module.hot.accept("./Components/GUI", () => {
		render(target);
	});
}
