import { exec } from 'child_process';
import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {

	const extension = new TestFilesOnSave(context);

	vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
		extension.runTests(document);
	});
}

class TestFilesOnSave {
	private _testCommands: Array<any> = [];
	private _isEnabled: any = false;
	private _languageId: any = "any";
	private _exitCodePass: Set<number> = new Set<number>();
	private _exitCodeFail: Set<number> = new Set<number>();
	private _exitCodeError: Set<number> = new Set<number>();
	private _running: boolean = false;
	private _outputChannel: vscode.OutputChannel;
	private _statusBarIcon: vscode.StatusBarItem;

	constructor(context: vscode.ExtensionContext) {
		// Create a private command to toggle between enabled/disabled. This command is not accessible through the command palette.
		const enableDisableCommandId = 'testFilesOnSave.enableDisable';
		context.subscriptions.push(vscode.commands.registerCommand(enableDisableCommandId, () => {
			this._isEnabled ? this._disable() : this._enable();
		}));
		// The status bar item shows the last test result (if testFilesOnSave is enabled) and can be clicked to toggle between enabled/disabled.
		this._statusBarIcon = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
		this._statusBarIcon.command = enableDisableCommandId;
		context.subscriptions.push(this._statusBarIcon);
		context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => this._readConfiguration()));
		this._outputChannel = vscode.window.createOutputChannel('test-files-on-save');
		this._readConfiguration();
	}

	private _readConfiguration() {
		this._isEnabled = vscode.workspace.getConfiguration('testFilesOnSave').get('enabled');
		let testCommands = vscode.workspace.getConfiguration().get('testFilesOnSave.testCommands', []) as Array<any>;
		if (testCommands && Array.isArray(testCommands)) {
			if (Array.isArray(testCommands)) {
				for (const command of testCommands) {
					const language = Object.keys(command)[0]; // Get the language key (e.g., 'c', 'cpp')
					const cmd = command[language]; // Get the files and command values
					if (cmd === undefined || cmd === null) {
						vscode.window.showErrorMessage('No test command configured for ' + language);
						return;
					}
				}
			};
		}
		this._testCommands = testCommands;
		let languageId = <string>vscode.workspace.getConfiguration('testFilesOnSave').get('languageId');
		this._languageId = languageId.trim();
		this._isEnabled ? this._enable() : this._disable();
		let exitCodePassString = <string>vscode.workspace.getConfiguration('testFilesOnSave').get('exitCodePass');
		this._exitCodePass = this._parseExitCodes(exitCodePassString);
		let exitCodeFailString = <string>vscode.workspace.getConfiguration('testFilesOnSave').get('exitCodeFail');
		this._exitCodeFail = this._parseExitCodes(exitCodeFailString);
		let exitCodeErrorString = <string>vscode.workspace.getConfiguration('testFilesOnSave').get('exitCodeError');
		this._exitCodeError = this._parseExitCodes(exitCodeErrorString);
		console.log(this._exitCodePass);
		console.log(this._exitCodeFail);
		console.log(this._exitCodeError);
	}

	/**
	 * Create a set of all possible exit codes as defined by the exitCodes string.
	 * @param exitCodes - A string representing ranges of exit codes separated by commas.
	 * 					  For example, "0,1,2-4,6-9" would match exit codes 0, 1, 2, 3, 4, 6, 7, 8, 9.	
	 */
	private _parseExitCodes(exitCodes: string): Set<number> {
		const exitCodesSet = new Set<number>();
		if (exitCodes === null || exitCodes === undefined || exitCodes.trim() === "") {
			return exitCodesSet;
		}
		const exitCodesArray = exitCodes.split(',');
		for (const element of exitCodesArray) {
			const exitCodeRange = element.trim().split('-');
			if (exitCodeRange.length === 1) {
				exitCodesSet.add(parseInt(exitCodeRange[0]));
			} else if (exitCodeRange.length === 2) {
				for (let j = parseInt(exitCodeRange[0]); j <= parseInt(exitCodeRange[1]); j++) {
					exitCodesSet.add(j);
				}
			}
		}
		return exitCodesSet;
	}

	private _enable() {
		console.log("Enabling test-files-on-save");
		this._isEnabled = true;
		this._statusUpdate('Autotest Enabled');
	}

	private _disable() {
		console.log("Disabling test-files-on-save");
		this._isEnabled = false;
		this._statusUpdate('Autotest Disabled');
	}

	private _statusUpdate(message: string) {
		this._statusBarIcon.text = message;
		this._statusBarIcon.show();
	}

	private _isRelevantFile(document: vscode.TextDocument): boolean {
		return this._languageId === "any" || document.languageId === this._languageId;
	}

	private _getWorkingDirectory(document: vscode.TextDocument): string | undefined {
		const workspaceFolderUri = vscode.workspace.getWorkspaceFolder(document.uri);
		if (!workspaceFolderUri) {
			console.error("workspaceFolderUri is null");
			return undefined;
		}
		return workspaceFolderUri.uri.fsPath;
	}

	private _getStatusIconForExitCode(exitCode: number): string {
		if (this._exitCodePass.has(exitCode)) {
			return '$(testing-passed-icon)';
		} else if (this._exitCodeFail.has(exitCode)) {
			return '$(testing-failed-icon)';
		} else if (this._exitCodeError.has(exitCode)) {
			return '$(testing-error-icon)';
		} else {
			this._outputChannel.append(`Unknown exit code: ${exitCode} - cannot determine status icon to display.\n`);
			return '$(question)';
		}
	}

	public runTests(document: vscode.TextDocument) {
		if (!this._isEnabled || this._running || !this._isRelevantFile(document)) {
			return;
		}
		const workspaceFolderPath = this._getWorkingDirectory(document);
		if (workspaceFolderPath === undefined) {
			return;
		}
		const workspaceFolderUri = vscode.workspace.getWorkspaceFolder(document.uri);
		const filePath = document.fileName;
		const fileWorkspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath));
		let fileType = document.languageId;
		const fileExtension = filePath.split('.').pop();
		if (fileExtension !== document.languageId) {
			fileType = fileExtension ?? '';
		}
		const cmd = this._testCommands.find(obj => obj.hasOwnProperty(fileType)); // Get the files and command values
		let commandText = cmd[fileType];
		try {
			if (fileWorkspaceFolder) {
				if (commandText.includes('${workspaceFolder}')) {
					commandText = commandText.replace('${workspaceFolder}', workspaceFolderUri?.uri.fsPath ?? '');
				}
				if (commandText.includes('${workspaceFolderBasename}')) {
					commandText = commandText.replace('${workspaceFolderBasename}', workspaceFolderUri?.name ?? '');
				}
				if (commandText.includes('${file}')) {
					commandText = commandText.replace('${file}', document.uri.fsPath);
				}
				if (commandText.includes('${relativeFile}')) {
					commandText = commandText.replace('${relativeFile}', path.relative(fileWorkspaceFolder?.uri.fsPath ?? '', document.uri.fsPath));
				}				
				if (commandText.includes('${fileWorkspaceFolder}')) {
					commandText = commandText.replace('${fileWorkspaceFolder}', fileWorkspaceFolder?.uri.fsPath ?? '');
				}
				if (commandText.includes('${relativeFileDirname}')) {
					commandText = commandText.replace('${relativeFileDirname}', path.relative(fileWorkspaceFolder?.uri.fsPath ?? '', path.dirname(filePath)));
				}
			}
			if (commandText.includes('${fileBasename}')) {
				commandText = commandText.replace('${fileBasename}', vscode.workspace.asRelativePath(filePath));
			}
			if (commandText.includes('${fileBasenameNoExtension}')) {
				commandText = commandText.replace('${fileBasenameNoExtension}', path.basename(filePath, path.extname(filePath)));
			}
			if (commandText.includes('${fileExtname}')) {
				commandText = commandText.replace('${fileExtname}', filePath.split('.').pop());
			}
			if (commandText.includes('${fileDirname}')) {
				commandText = commandText.replace('${fileDirname}', path.dirname(filePath));
			}
			if (commandText.includes('${fileDirnameBasename}')) {
				commandText = commandText.replace('${fileDirnameBasename}', path.basename(path.dirname(filePath)));
			}
			const regex = /\${env:(.*?)}/g;
			const matches = commandText.match(regex);
			if (matches) {
				const resolvedString = matches.reduce((acc: string, match: string) => {
					const variableName = match.slice(6, -1);
					const variableValue = process.env[variableName] ?? '';
					return acc.replace(match, variableValue);
				}, commandText);
				commandText = resolvedString;
			}
			console.log(commandText);
		} catch (error) {
			console.error(error);
		}
		this._outputChannel.clear();
		this._running = true;
		this._statusUpdate("$(loading~spin) Tests");
		let child = exec(commandText, { cwd: workspaceFolderPath });
		if (child.stdout && child.stderr) {
			child.stdout.on('data', data => { this._outputChannel.append(data); });
			child.stderr.on('data', data => { this._outputChannel.append(data); });
		}
		child.on('error', e => {
			this._outputChannel.append("Error while calling test command:\n");
			this._outputChannel.append(e.message);
			this._statusUpdate('$(extensions-warning-message) Tests');
			this._running = false;
		});
		child.on('exit', code => {
			let statusIcon = '$(question)';
			if (code !== null) {
				statusIcon = this._getStatusIconForExitCode(code);
			}
			this._statusUpdate(`${statusIcon} Tests`);
			this._running = false;
		});
	}
}
