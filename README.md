# file-tests-runner (TDD)

file-tests-runner extension runs shell scripts on any document type on save (TDD)

## Features: 

* supports subset of predefined variables `${workspaceFolder}` [variables-reference](https://code.visualstudio.com/docs/editor/variables-reference)
* supports environment variables `${env:APPDATA}`
* supports status bar icon visualization
* supports exit codes customization
* supports all type of [language identifiers](https://code.visualstudio.com/docs/languages/identifiers) and custom `any` type.
* uses background thread execution

```json
    ".enabled": true,testFilesOnSave
    "testFilesOnSave.languageId": "any",
    "testFilesOnSave.testCommands": [
        {
          "c": "echo .c file saved"
        },
        {
          "h": "echo .h file saved"
        }
    ]
```

## Requirements

file-tests-runner runs on VScode 1.80.0 and above.

## Predefined Variables in test commands:

The following predefined variables are supported:
- ${workspaceFolder} - the path of the folder opened in VS Code
- ${workspaceFolderBasename} - the name of the folder opened in VS Code without any slashes (/)
- ${file} - the current opened file
- ${fileWorkspaceFolder} - the current opened file's workspace folder
- ${relativeFile} - the current opened file relative to workspaceFolder
- ${relativeFileDirname} - the current opened file's dirname relative to workspaceFolder
- ${fileBasename} - the current opened file's basename
- ${fileBasenameNoExtension} - the current opened file's basename with no file extension
- ${fileExtname} - the current opened file's extension
- ${fileDirname} - the current opened file's folder path
- ${fileDirnameBasename} - the current opened file's folder name
- ${env:NAME} - reference environment variables through the ${env:Name} syntax

## Extension Settings

This extension contributes the following settings:

* `testFilesOnSave.enabled`: Enable/disable this extension
* `testFilesOnSave.testCommands`: Commands to run tests on file type. Any non-zero exit code is treated as failing tests.
* `testFilesOnSave.languageId`: Only trigger tests when a file of this language is saved. Set to "any" to always run tests after saving.
* `testFilesOnSave.exitCodePass`: Exit code(s) that are considered as a passing test suite. Defaults to 0.
* `testFilesOnSave.exitCodeFail`: Exit code(s) that are considered as a failing test suite. Defaults to non-zero.
* `testFilesOnSave.exitCodeError`: Exit code(s) that are considered as errors when running the tests. Not used by default.

```json
        "title": "file-tests-runner",
        "properties": {
          "testFilesOnSave.enabled": {
            "type": "boolean",
            "description": "Run tests automatically when saving a file",
            "default": false
          },
          "testFilesOnSave.testCommands": {
            "type": "array",
            "description": "Commands to execute tests",
            "default": null,
            "properties": {
              "languageId": {
                "type": "string"
              },
              "testCommand": {
                "type": "string"
              }
            }
          },
          "testFilesOnSave.languageId": {
            "type": "string",
            "description": "Only files with this language id trigger the test command. Use 'any' to trigger independent of the language.",
            "default": "any"
          },
          "testFilesOnSave.exitCodePass": {
            "type": "string",
            "description": "Exit code(s) that are considered as a passing test suite. Defaults to 0. Separate multiple exit codes by comma. You can also use ranges. Example: '0,1,2-4'",
            "default": "0"
          },
          "testFilesOnSave.exitCodeFail": {
            "type": "string",
            "description": "Exit code(s) that are considered as a failing test suite. Defaults to 0-999. Separate multiple exit codes by comma. You can also use ranges. Example: '0,1,2-4'",
            "default": "0-999"
          },
          "testFilesOnSave.exitCodeError": {
            "type": "string",
            "description": "Exit code(s) that are considered as errors when running the tests. Not used by default. Separate multiple exit codes by comma. You can also use ranges. Example: '0,1,2-4'",
            "default": null
          }
        }
      }
```
## Known Issues

No issues so far

## Release Notes

No release notes

## Attributions

* Icons taken from [icon8.com](https://icons8.com/icons/set/test)
* file-tests-runner derived from the extension [andifin.testonsave](https://marketplace.visualstudio.com/items/andifin.testonsave)
