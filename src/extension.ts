'use strict';

import * as vscode from 'vscode';

function fullDocumentRange(document: vscode.TextDocument): vscode.Range {
    const lastLineId = document.lineCount - 1;
    return new vscode.Range(0, 0, lastLineId, document.lineAt(lastLineId).text.length);
}

function prettify(ionString: string, preserveJson: boolean): string {
    ionString = ionString.split('"').map(function (v, i) {
        return i % 2 ? v : v.replace(/\s/g, "");
    }).join('"');
    let horizontalIndent = 0;
    let prettyIon = '';
    let insideString = false;
    let stringContent = '';
    for (let i = 0; i < ionString.length; i++) {
        if (ionString.charAt(i) == '"') {
            if (i > 0 && ionString.charAt(i - 1) != '\\') {
                if (insideString) {
                    try {
                        if (preserveJson) {
                            throw "Not Parsing";
                        }
                        stringContent = JSON.stringify(JSON.parse(stringContent.substr(1).replace(/\\"/g, '"')), null, 2);
                        stringContent = stringContent.replace(/\n/g, '\n' + ' '.repeat(horizontalIndent));
                        if(stringContent.charAt(0) === '{')
                            prettyIon+= ' ';
                        prettyIon += stringContent;
                    }
                    catch (e) {
                        if (['\n'].includes(prettyIon.charAt(prettyIon.length - 1)))
                            prettyIon += ' '.repeat(horizontalIndent) + stringContent + '"';
                        else
                            prettyIon += ' ' + stringContent + '"';
                    }
                }
                insideString = !insideString;
                stringContent = '';
            }
            if (!insideString)
                continue;
        }
        if (!insideString) {
            if (['{', '['].includes(ionString.charAt(i))) {
                if (ionString.charAt(i - 1) === ':') {
                    prettyIon += ' ';
                }
                prettyIon += ionString.charAt(i) + (' '.repeat(horizontalIndent) + '\n');
                horizontalIndent += 2;
            }
            else if (['}', ']'].includes(ionString.charAt(i))) {
                horizontalIndent -= 2;
                if (ionString.charAt(i - 1) === '"' || /\w/.test(ionString.charAt(i - 1))) {
                    prettyIon += '\n';
                }
                prettyIon += ' '.repeat(horizontalIndent) + ionString.charAt(i);
                if (ionString.charAt(i + 1) !== ',') {
                    prettyIon += '\n';
                }
            }
            else if (ionString.charAt(i) === ',') {
                prettyIon += (ionString.charAt(i) + '\n');
            }
            else {
                if ([',', '{', '[', ']', '}'].includes(ionString.charAt(i - 1))) {
                    prettyIon += ' '.repeat(horizontalIndent);
                }
                prettyIon += ionString.charAt(i);
            }
        }
        else
            stringContent += ionString.charAt(i);
    }
    return prettyIon;
}

vscode.commands.registerCommand('ion.format-strict', () => {
    const { activeTextEditor } = vscode.window;
    if (activeTextEditor && activeTextEditor.document.languageId === 'ion') {
        vscode.commands.executeCommand('editor.action.toggleWordWrap');
        const { document } = activeTextEditor;
        let unformatted = document.getText();
        const formatted = prettify(unformatted, true);
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, fullDocumentRange(document), formatted);
        return vscode.workspace.applyEdit(edit).then(function () {
            vscode.commands.executeCommand('revealLine', { at: 'top', lineNumber: '1' });
            vscode.commands.executeCommand('cursorMove', { to: 'up', by: document.lineCount });
            vscode.commands.executeCommand('editor.action.toggleWordWrap');
        });
    }
});

export function activate(context: vscode.ExtensionContext) {
    // 👍 formatter implemented using API
    vscode.languages.registerDocumentFormattingEditProvider('ion', {
        provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
            vscode.commands.executeCommand('editor.action.toggleWordWrap');
            let unformatted = document.getText();
            const formatted = prettify(unformatted, false);
            vscode.commands.executeCommand('editor.action.toggleWordWrap');
            vscode.commands.executeCommand('revealLine', { at: 'top', lineNumber: '1' });
            vscode.commands.executeCommand('cursorMove', { to: 'up', by: document.lineCount });
            return [vscode.TextEdit.replace(fullDocumentRange(document), formatted)];
        }
    });
}


