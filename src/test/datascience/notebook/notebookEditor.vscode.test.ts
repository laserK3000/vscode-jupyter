// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { assert } from 'chai';
import { NotebookCellExecutionState } from 'vscode';
import { ICommandManager, IVSCodeNotebook } from '../../../client/common/application/types';
import { traceInfo } from '../../../client/common/logger';
import { IDisposable } from '../../../client/common/types';
import { Commands } from '../../../client/datascience/constants';
import { hasErrorOutput, NotebookCellStateTracker } from '../../../client/datascience/notebook/helpers/helpers';
import { IExtensionTestApi, waitForCondition } from '../../common';
import { closeActiveWindows, initialize } from '../../initialize';
import {
    closeNotebooksAndCleanUpAfterTests,
    insertCodeCell,
    selectCell,
    startJupyterServer,
    trustAllNotebooks,
    waitForExecutionCompletedSuccessfully,
    createEmptyPythonNotebook,
    runAllCellsInActiveNotebook,
    canRunNotebookTests
} from './helper';

suite('Notebook Editor tests', function () {
    let api: IExtensionTestApi;
    let vscodeNotebook: IVSCodeNotebook;
    let commandManager: ICommandManager;
    const disposables: IDisposable[] = [];
    // On conda these take longer for some reason.
    this.timeout(60_000);

    suiteSetup(async function () {
        api = await initialize();
        if (!(await canRunNotebookTests())) {
            return this.skip();
        }
        await startJupyterServer();
        vscodeNotebook = api.serviceContainer.get<IVSCodeNotebook>(IVSCodeNotebook);
        commandManager = api.serviceContainer.get<ICommandManager>(ICommandManager);
    });

    setup(async function () {
        traceInfo(`Start Test ${this.currentTest?.title}`);
        await startJupyterServer();
        await trustAllNotebooks();
        await closeActiveWindows();
        await createEmptyPythonNotebook(disposables);
        assert.isOk(vscodeNotebook.activeNotebookEditor, 'No active notebook');
        traceInfo(`Start Test Completed ${this.currentTest?.title}`);
    });

    teardown(async function () {
        traceInfo(`End Test ${this.currentTest?.title}`);
        await closeNotebooksAndCleanUpAfterTests(disposables);
        traceInfo(`End Test Completed ${this.currentTest?.title}`);
    });
    suiteTeardown(() => closeNotebooksAndCleanUpAfterTests(disposables));

    test('Toggle selected cells output - O Keybind', async function () {
        // add some cells
        await insertCodeCell('print("0")', { index: 0 });
        await insertCodeCell('print("1")', { index: 1 });
        await insertCodeCell('print("2")', { index: 2 });

        const firstCell = vscodeNotebook.activeNotebookEditor?.document.cellAt(0)!;
        const secondCell = vscodeNotebook.activeNotebookEditor?.document!.cellAt(1)!;
        const thirdCell = vscodeNotebook.activeNotebookEditor?.document!.cellAt(2)!;

        // select second and third cell
        await selectCell(vscodeNotebook.activeNotebookEditor?.document!, 1, 3);

        // run and wait
        await runAllCellsInActiveNotebook();
        await waitForExecutionCompletedSuccessfully(firstCell);
        await waitForExecutionCompletedSuccessfully(secondCell);
        await waitForExecutionCompletedSuccessfully(thirdCell);

        // execute command
        await commandManager.executeCommand(Commands.NotebookEditorToggleOutput);

        // check that the outputs are collapsed
        await waitForCondition(
            async () => secondCell?.metadata.outputCollapsed! && thirdCell?.metadata.outputCollapsed!,
            10000,
            'Outputs were not collapsed'
        );
    });

    test('Run cells above', async function () {
        return this.skip();
        // add some cells
        await insertCodeCell('print("0")', { index: 0 });
        await insertCodeCell('print("1")', { index: 1 });
        await insertCodeCell('print("2")', { index: 2 });

        // select second cell
        await selectCell(vscodeNotebook.activeNotebookEditor?.document!, 1, 1);

        // run command
        await commandManager.executeCommand(
            Commands.NativeNotebookRunAllCellsAbove,
            vscodeNotebook.activeNotebookEditor?.document.cellAt(1)!
        );

        const firstCell = vscodeNotebook.activeNotebookEditor?.document.cellAt(0)!;
        await waitForExecutionCompletedSuccessfully(firstCell);
        const thirdCell = vscodeNotebook.activeNotebookEditor?.document.getCells()![2]!;

        // The first cell should have a runState of Success
        assert.strictEqual(NotebookCellStateTracker.getCellState(firstCell), NotebookCellExecutionState.Idle);
        assert.isFalse(hasErrorOutput(firstCell.outputs));

        // The third cell should have an undefined runState
        assert.strictEqual(NotebookCellStateTracker.getCellState(thirdCell), undefined);
    });

    test('Run cells below', async function () {
        return this.skip();
        // add some cells
        await insertCodeCell('print("0")', { index: 0 });
        await insertCodeCell('print("1")', { index: 1 });
        await insertCodeCell('print("2")', { index: 2 });

        // select second cell
        await selectCell(vscodeNotebook.activeNotebookEditor?.document!, 1, 1);

        // run command
        await commandManager.executeCommand(
            Commands.NativeNotebookRunCellAndAllBelow,
            vscodeNotebook.activeNotebookEditor?.document.cellAt(1)!
        );

        const firstCell = vscodeNotebook.activeNotebookEditor?.document.cellAt(0)!;
        const thirdCell = vscodeNotebook.activeNotebookEditor?.document.getCells()![2]!;
        await waitForExecutionCompletedSuccessfully(thirdCell);

        // The first cell should have an undefined runState
        assert.strictEqual(NotebookCellStateTracker.getCellState(firstCell), undefined);

        // The third cell should have a runState of Success
        assert.strictEqual(NotebookCellStateTracker.getCellState(thirdCell), NotebookCellExecutionState.Idle);
        assert.isFalse(hasErrorOutput(thirdCell.outputs));
    });
});
