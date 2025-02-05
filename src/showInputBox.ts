import * as vscode from "vscode";

export const showInputBox = (
  prompt: string,
  acceptCb: (result: string) => void,
  placeHolderStr?: string
) => {
  const inputBox = vscode.window.createInputBox();
  inputBox.prompt = prompt;
  inputBox.placeholder = placeHolderStr || "";

  inputBox.onDidAccept(() => {
    const val = inputBox.value;
    // console.log("输入的内容====", val);
    inputBox.hide();
    acceptCb(val);
  });

  inputBox.onDidHide(() => {
    inputBox.dispose();
  });

  inputBox.show();
};

export interface Option {
  label: string;
  description: string;
}
export const showPickBox = (
  titleStr: string,
  optionItem: Option[],
  acceptCb: (result: string) => void
) => {
  let selectItem: vscode.QuickPickItem;

  const pickBox = vscode.window.createQuickPick();
  pickBox.title = titleStr;
  pickBox.items = optionItem;
  pickBox.onDidChangeActive((items) => {
    if (items[0]) {
      selectItem = items[0];
    }
  });
  pickBox.onDidAccept(() => {
    if (selectItem) {
      acceptCb(selectItem.label);
      pickBox.hide();
    }
  });
  pickBox.onDidHide(() => {
    pickBox.dispose();
  });

  pickBox.show();
};
