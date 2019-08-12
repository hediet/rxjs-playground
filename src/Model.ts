import { PlaygroundViewModel } from "./ViewModels/PlaygroundViewModel";
import { SerializeController } from "./ViewModels/SerializeController";

export class Model {
	public readonly playground = new PlaygroundViewModel();

	constructor() {
		new SerializeController(this.playground);
	}
}
