import { observer } from "mobx-react";
import React = require("react");
import * as monaco from "monaco-editor";

@observer
export class MonacoEditor extends React.Component<{
	model: monaco.editor.ITextModel;
}> {
	private editor: monaco.editor.IStandaloneCodeEditor | undefined;

	componentWillUnmount() {
		if (this.editor) {
			this.editor.dispose();
		}
	}

	private readonly setEditorDiv = (editorDiv: HTMLDivElement) => {
		if (!editorDiv) {
			return;
		}

		this.editor = monaco.editor.create(editorDiv, {
			model: this.props.model,
			automaticLayout: true,
			scrollBeyondLastLine: false,
			minimap: { enabled: false },
			fixedOverflowWidgets: true,
		});
	};

	render() {
		return (
			<div className="component-monaco-editor">
				<div className="part-editor" ref={this.setEditorDiv} />
			</div>
		);
	}
}
