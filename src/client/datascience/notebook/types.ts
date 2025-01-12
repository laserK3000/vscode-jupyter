// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Event, NotebookDocument, NotebookEditor, Uri } from 'vscode';
import { VSCodeNotebookController } from './vscodeNotebookController';

export const INotebookContentProvider = Symbol('INotebookContentProvider');

export const INotebookKernelResolver = Symbol('INotebookKernelResolver');

export const INotebookControllerManager = Symbol('INotebookControllerManager');
export interface INotebookControllerManager {
    readonly onNotebookControllerSelected: Event<{ notebook: NotebookDocument; controller: VSCodeNotebookController }>;
    getSelectedNotebookController(document: NotebookDocument): VSCodeNotebookController | undefined;
    getNotebookControllers(): Promise<VSCodeNotebookController[] | undefined>;
}
export enum CellOutputMimeTypes {
    error = 'application/x.notebook.error-traceback',
    stderr = 'application/x.notebook.stderr',
    stdout = 'application/x.notebook.stdout'
}

/**
 * Handles communications between the WebView (used to render oututs in Notebooks) & extension host.
 */
export interface INotebookCommunication {
    readonly editor: NotebookEditor;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly onDidReceiveMessage: Event<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    postMessage(message: any): Thenable<boolean>;
    asWebviewUri(localResource: Uri): Uri;
}
