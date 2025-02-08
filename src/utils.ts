import * as fs from "fs";
import * as vscode from "vscode";
import * as https from "https";

/**
 * 新建文件
 * @param fileName 文件名路径
 * @param content 文件内容
 */
export const saveTextFile = async (fileName: string, content: string) => {
  return new Promise<void>((resolve) => {
    if (fs.existsSync(fileName)) {
      //清空文件
      try {
        fs.truncateSync(fileName, 0);
      } catch (error) {
        console.error(error);
      }
    }
    fs.writeFileSync(fileName, content, "utf-8");
    resolve();
  });
};

/**
 * 首字母大写
 * */
export const firstUpperCase = (str: string) => {
  return str.replace(/( |^)[a-z]/g, (l) => l.toUpperCase());
};

/**
 * 获取对象中的值
 * @param obj
 * @param targetKey
 * @returns
 */
export const getValueByKey = <T>(
  obj: { [key: string]: T },
  targetKey: string
): unknown => {
  if (!obj) {
    return "";
  }
  let result;
  // 检查当前对象是否包含目标 key
  if (obj[targetKey]) {
    return obj[targetKey];
  }

  // 遍历对象的所有属性
  const keys = Array.from(Object.keys(obj));
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (Object.hasOwn(obj, key) && typeof obj[key] === "object") {
      // 如果属性的值是一个对象，则进行递归调用
      result = getValueByKey(obj[key] as { [key: string]: T }, targetKey);
      // 如果找到目标值，立即返回
      if (result !== undefined) {
        break;
      }
    }
  }
  // 如果未找到目标值，返回 undefined
  return result;
};

export const showSystemMessage = (message: string) => {
  vscode.window.showInformationMessage(message);
};
export const showSystemWarningMessage = (message: string) => {
  vscode.window.showWarningMessage(message);
};

export const download = (url: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve(data);
        });
      })
      .on("error", (error) => {
        console.error("download err: ", error);
        reject(error);
      });
  });
};
