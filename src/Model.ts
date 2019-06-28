import { observable, computed } from "mobx";
import "./Series";
import { SingleObservableHistory, sampleHistory } from "./Series";

export class Model {
	public readonly history = sampleHistory;

	constructor() {}
}
