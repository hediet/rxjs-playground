import { autorun } from "mobx";
import { SerializedObservable } from "../Model/ObservableGroups";
import { MutableObservableGroup } from "../Model/MutableObservableGroup";
import { Subject } from "rxjs";
import { debounceTime } from "rxjs/operators";
import { deserialize } from "../Model/Deserializer";
import { TSComputedObservableGroup2 } from "../Model/TSComputedObservableGroup2";
import { Disposable } from "@hediet/std/disposable";
import { PlaygroundViewModel } from "./PlaygroundViewModel";
import * as jsonUrl from "json-url";

export class SerializeController {
	public readonly dispose = Disposable.fn();

	private debounceSubject = new Subject<SerializedObservable[]>();

	constructor(
		private readonly playground: PlaygroundViewModel,
		private readonly store: {
			get(): string | undefined;
			set(value: string): void;
		} = {
			get() {
				return window.location.hash;
			},
			set(value) {
				window.location.hash = value;
			},
		}
	) {
		this.init();
	}

	private async init() {
		const groups = this.playground.groups;
		const codec = jsonUrl("lzma");
		const compressedData = this.store.get();

		if (compressedData) {
			const data: any = await codec.decompress(compressedData);
			deserialize(groups, this.playground.typeScriptService, data);
		} else {
			// default data
			groups.addGroup(new MutableObservableGroup());
			groups.addGroup(
				new TSComputedObservableGroup2(
					this.playground.typeScriptService,
					groups
				)
			);
		}

		const autorunHandle = autorun(() => {
			const serializedData = groups.serialize();
			this.debounceSubject.next(serializedData);
		});

		this.debounceSubject
			.pipe(debounceTime(1000))
			.forEach(async serializedData => {
				const compressedData = await codec.compress(serializedData);
				this.store.set(compressedData);
			});

		this.dispose.track(
			Disposable.create(() => {
				autorunHandle();
				this.debounceSubject.complete();
			})
		);
	}
}
