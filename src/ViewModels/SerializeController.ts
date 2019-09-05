import { autorun } from "mobx";
import { SerializedObservable } from "../Model/ObservableGroups";
import { MutableObservableGroup } from "../Model/MutableObservableGroup";
import { Subject } from "rxjs";
import { debounceTime } from "rxjs/operators";
import { deserializeGroups } from "../Model/deserializeGroups";
import { TsComputedObservableGroup } from "../Model/TsComputedObservableGroup";
import { Disposable } from "@hediet/std/disposable";
import { PlaygroundViewModel } from "./PlaygroundViewModel";
import * as jsonUrl from "json-url";
import { IDisposable } from "monaco-editor";

export class SerializeController {
	public readonly dispose = Disposable.fn();

	private debounceSubject = new Subject<SerializedObservable[]>();

	constructor(
		private readonly playground: PlaygroundViewModel,
		private readonly store: IStore = new Store()
	) {
		this.init();
		this.dispose.track(store);
	}

	private readonly codec = jsonUrl("lzma");

	private async loadFrom(serializedData: string | undefined): Promise<void> {
		const groups = this.playground.groups;

		if (serializedData) {
			const data: any = await this.codec.decompress(serializedData);
			deserializeGroups(groups, this.playground.typeScriptService, data);
		} else {
			// default data
			groups.clear();
			const g1 = new MutableObservableGroup();
			g1.name = "events";
			g1.history.addEvent(300, 1);
			g1.history.addEvent(500, 2);
			g1.history.addEvent(700, 3);

			groups.addGroup(g1);

			const g2 = new TsComputedObservableGroup(
				this.playground.typeScriptService,
				groups
			);
			g2.name = "computed";
			groups.addGroup(g2);
		}
	}

	private async init() {
		const groups = this.playground.groups;

		const compressedData = this.store.get();
		this.loadFrom(compressedData);

		this.store.registerOnChangeCallback(compressedData => {
			this.loadFrom(compressedData);
		});

		const autorunHandle = autorun(
			() => {
				const serializedData = groups.serialize();
				this.debounceSubject.next(serializedData);
			},
			{ name: "Serialize groups" }
		);

		this.debounceSubject
			.pipe(debounceTime(1000))
			.forEach(async serializedData => {
				const compressedData = await this.codec.compress(
					serializedData
				);
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

interface IStore extends IDisposable {
	get(): string | undefined;
	set(value: string): void;
	registerOnChangeCallback(
		onChange: (value: string | undefined) => void
	): void;
}

class Store implements IStore {
	private lastValue: string | undefined = this.get();
	public readonly dispose = Disposable.fn();

	get(): string | undefined {
		return window.location.hash.substr(1);
	}

	set(value: string): void {
		this.lastValue = value;
		if (window.parent !== window) {
			parent.postMessage(
				{ kind: "setSerializedData", serialized: value },
				"*"
			);
		} else {
			window.location.hash = value;
		}
	}

	registerOnChangeCallback(
		onChange: (value: string | undefined) => void
	): void {
		const fn = () => {
			const next = this.get();
			if (this.lastValue !== next) {
				this.lastValue = next;
				onChange(next);
			}
		};
		window.addEventListener("hashchange", fn);
		this.dispose.track({
			dispose: () => {
				window.removeEventListener("hashchange", fn);
			},
		});
	}
}
