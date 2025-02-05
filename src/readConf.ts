import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

const CONFIG_FILE = ".apigenerator.json";

function getConfigFilePath(): string {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage("请打开一个工作区以使用配置文件。");
    return "";
  }
  return path.join(workspaceFolders[0].uri.fsPath, CONFIG_FILE);
}

// 读取插件配置
export function readConfig() {
  const filePath = getConfigFilePath();
  if (!filePath) {
    return null;
  }

  if (!fs.existsSync(filePath)) {
    vscode.window.showWarningMessage(
      `配置文件 ${CONFIG_FILE} 不存在，将使用默认值。`
    );
    return {};
  }

  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(fileContent);
  } catch (error) {
    vscode.window.showErrorMessage(`读取配置文件失败: ${error}`);
    return {};
  }
}
