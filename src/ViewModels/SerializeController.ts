import { autorun, runInAction, observable } from "mobx";
import { SerializedObservable } from "../Model/ObservableGroups";
import { MutableObservableGroup } from "../Model/MutableObservableGroup";
import { Subject } from "rxjs";
import { debounceTime } from "rxjs/operators";
import { deserializeGroups } from "../Model/deserializeGroups";
import { TsComputedObservableGroup } from "../Model/TsComputedObservableGroup";
import { Disposable } from "@hediet/std/disposable";
import { PlaygroundViewModel } from "./PlaygroundViewModel";
import { IDisposable } from "monaco-editor";
import { encodeData, decodeData } from "../std/lzmaCompressor";

export class SerializeController {
	public readonly dispose = Disposable.fn();

	private debounceSubject = new Subject<SerializedObservable[]>();

	constructor(
		private readonly playground: PlaygroundViewModel,
		private readonly store: StringStore
	) {
		this.init();
		this.dispose.track(store);
	}

	private loadFrom(serializedData: string | undefined): void {
		const groups = this.playground.groups;

		if (serializedData) {
			const data: any = decodeData(serializedData);
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

	private disableUpdate = false;

	private init() {
		const groups = this.playground.groups;

		this.dispose.track({
			dispose: autorun(() => {
				// always trigger dependency to store.value
				const val = this.store.get();
				if (this.disableUpdate) {
					return;
				}
				this.loadFrom(val);
			}),
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
				const compressedData = encodeData(serializedData);
				this.disableUpdate = true;
				this.store.set(compressedData);
				this.disableUpdate = false;
			});

		this.dispose.track(
			Disposable.create(() => {
				autorunHandle();
				this.debounceSubject.complete();
			})
		);
	}
}

export interface StringStore extends IDisposable {
	get(): string | undefined;
	set(value: string): void;
}

export class UrlHashOrPostMessageStore implements StringStore {
	@observable private value: string | undefined = this.get();
	public readonly dispose = Disposable.fn();

	constructor() {
		const fn = () => {
			const next = window.location.hash.substr(1);
			if (this.value !== next) {
				this.value = next;
				runInAction(() => {
					this.value = next;
				});
			}
		};

		fn();

		window.addEventListener("hashchange", fn);
		this.dispose.track({
			dispose: () => {
				window.removeEventListener("hashchange", fn);
			},
		});
	}

	get(): string | undefined {
		return this.value;
	}

	set(value: string): void {
		this.value = value;
		if (window.parent !== window) {
			parent.postMessage(
				{ kind: "setSerializedData", serialized: value },
				"*"
			);
		} else {
			window.location.hash = value;
		}
	}
}
