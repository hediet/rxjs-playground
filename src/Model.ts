import { sampleGroups } from "./example";
import { PlaygroundViewModel } from "./Components/ViewModels";

export class Model {
	public readonly playground = new PlaygroundViewModel(sampleGroups);

	constructor() {}
}
