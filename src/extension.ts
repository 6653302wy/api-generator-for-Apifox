import * as vscode from "vscode";
import { startCreateApi } from "./generator";

export function activate(context: vscode.ExtensionContext) {
  const apiGenerate = vscode.commands.registerCommand(
    "generate-apis",
    (uri) => {
      // 创建api文件
      startCreateApi(uri.fsPath);
    }
  );

  context.subscriptions.push(apiGenerate);
}

// this method is called when your extension is deactivated
export function deactivate() {}
