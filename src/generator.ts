import {
  basicDataTypes,
  CustomRequest,
  JsonDataInfo,
  OnlyDataExport,
  ParameterInfo,
  ParamInfo,
  PathInfo,
  refPath,
  SchemaInfo,
  ServiceInfo,
} from "./constants";
import { readConfig } from "./readConf";
import { showInputBox } from "./showInputBox";
import {
  firstUpperCase,
  getValueByKey,
  saveTextFile,
  showSystemMessage,
} from "./utils";
import axios from "axios";

// 文件保存路径
let savepath = "";

// api数据
let apiJsonFile: JsonDataInfo | undefined = undefined;
let apiDefines = "";
let interfaceDefines = "";
let responseSubDefineMap: Map<string, string[]> = new Map();
let apiImports = "";
let apiList: string[] = [];

// 导出数据类型
let dataExport: OnlyDataExport = { opend: false, paramName: "" };
// 自定义请求代码
let customRequestCode: CustomRequest = {
  opend: false,
  importCode: "",
  requestCode: "",
};
// 服务列表
let serverList: ServiceInfo[] = [];

////////////////////////////////////////////////////////////////////////

//  读取服务列表， 不同服务api前缀不同
const getApiPre = (tag: string) => {
  return (
    serverList?.find?.(
      (server) => server.name.includes(tag) || tag.includes(server.name)
    )?.url || ""
  );
};

const getRefStructName = (ref: string) => {
  return ref?.replace(refPath, "");
};

const getFinalType = (dataType: string) => {
  switch (dataType) {
    case "integer":
    case "int32":
    case "float":
    case "double":
      return "number";
    case "file":
      return "File";
    default:
      return dataType;
  }
};

const createParam = (
  key: string,
  desc: string,
  dataType: string,
  required: boolean
) => {
  const type = getFinalType(dataType);
  return `
    /** ${desc || ""} */
    ${key}${required ? "" : "?"}: ${type};\n`;
};

const parseObjectStruct = (
  param: SchemaInfo,
  api: string,
  paramKey?: string
) => {
  const { properties, items, required, type } = param;

  // 普通类型
  if (basicDataTypes.includes(type)) {
    const paramname = dataExport?.opend
      ? dataExport?.paramName || "data"
      : "data";
    return createParam(
      paramname,
      "",
      type,
      param?.required?.includes(paramname) ?? false
    );
  }

  const createSubDefine = (name: string, subparams: SchemaInfo): string => {
    return `export interface ${name} {
${parseObjectStruct(subparams, api, name)}
}
`;
  };

  const setSubDefs = (subDef: string) => {
    const apiAllSubDefs = responseSubDefineMap.get(api) || [];
    apiAllSubDefs.push(subDef);
    responseSubDefineMap.set(api, apiAllSubDefs);
  };

  // 复杂类型
  let params: string[] = [];
  let propertyObj = properties;
  if (type === "object") {
    params = Object.keys(properties ?? {});
  } else if (type === "array") {
    params = Object.keys(items?.properties || {});
    propertyObj = (items?.properties || ({} as ParamInfo)) as ParamInfo;
  }

  if (!params.length) {
    return "";
  }

  let defines = "";
  params.forEach((key) => {
    const obj = propertyObj[key];
    const desc = `${obj?.description || ""} ${obj?.example ? "expamle: " : ""}${
      obj?.example || ""
    }`;
    const require = required?.includes?.(key) || false;

    // 引用类型解析
    if (`${obj?.$ref}`.includes(refPath)) {
      defines += createParam(
        key,
        desc,
        getRefStructName(`${obj?.$ref}`),
        require
      );
    }

    // 普通数据类型
    if (basicDataTypes.includes(obj?.type)) {
      defines += createParam(key, desc, obj.type, require);
    } else {
      // 复杂数据格式， object 和 array ， 需要继续往下一层解析
      let subParamName = paramKey
        ? `${paramKey}${firstUpperCase(key)}`
        : `${api?.replace(/Request|Response|/g, "")}${firstUpperCase(key)}`;

      // 对象类型解析
      if (obj.type === "object") {
        defines += createParam(key, desc, subParamName, require);
        const def = createSubDefine(subParamName, obj as unknown as SchemaInfo);
        setSubDefs(def);
      }

      // 数组类型解析
      if (obj.type === "array") {
        // 引用类型解析
        if (`${obj?.items?.$ref}`.includes(refPath)) {
          subParamName = getRefStructName(`${obj?.items?.$ref}` || "");
        }

        const itemType = `${obj?.items?.type}`;
        const isAlsoArray = itemType === "array";
        const isBasicType = basicDataTypes.includes(itemType || "");

        defines += createParam(
          key,
          desc,
          isBasicType
            ? `${getFinalType(itemType)}[]`
            : `${subParamName}${isAlsoArray ? "[]" : ""}[]`,
          require
        );
        if (!isBasicType) {
          setSubDefs(
            createSubDefine(
              subParamName,
              isAlsoArray
                ? (obj?.items as unknown as SchemaInfo)
                : (obj as unknown as SchemaInfo)
            )
          );
        }
      }
    }
  });

  return defines;
};

const defineAPI = (
  apiPath: string,
  requestDefine: string,
  responseDefine: string,
  apidata: PathInfo,
  reqMethod: string,
  responseData: SchemaInfo
) => {
  const apiname = createAPIName(apiPath);

  let headerContentType = apidata?.requestBody
    ? Object.keys(apidata?.requestBody?.content)?.[0]
    : "";
  headerContentType =
    reqMethod === "post" && !apidata?.requestBody
      ? "multipart/form-data"
      : headerContentType;

  const getResponseDefine = () => {
    const parserObj = dataExport?.opend
      ? (responseData?.properties?.[
          dataExport?.paramName || ""
        ] as unknown as SchemaInfo) || responseData
      : responseData;
    const { type } = parserObj;
    if (!dataExport?.opend) {
      return responseDefine;
    }
    // 普通类型
    if (basicDataTypes.includes(type)) {
      return type;
    }
    // 复杂类型 object / array
    return type === "array" ? `${responseDefine}[]` : responseDefine;
  };
  const respDefineName = getResponseDefine();

  if (customRequestCode.opend) {
    return `
/**
 * ${apidata?.description || apidata?.summary || ""}
 * ${apidata?.deprecated ? "@deprecated 接口已弃用" : ""}
*/
export const ${apiname} = (data${
      requestDefine === "{}" ? "?" : ""
    }: ${requestDefine}): Promise<${respDefineName}> => {
 return ${customRequestCode.requestCode
   .replace("@url", `'${getApiPre(apidata?.tags?.[0] || "")}${apiPath}'`)
   .replace("@method", `'${reqMethod}'`)
   .replace("@data", `data`)
   .replace(
     "@contentType",
     `'${headerContentType || "application/json;charset=utf-8"}'`
   )};
}\n`;
  }
  return `
/**
 * ${apidata?.description || apidata?.summary || ""}
 * ${apidata?.deprecated ? "@deprecated 接口已弃用" : ""}
 */
export const ${apiname} = (data${
    requestDefine === "{}" ? "?" : ""
  }: ${requestDefine}): Promise<${respDefineName}> => {
 return new Promise((resolve, reject) => {
    axios({
        method: '${reqMethod}',
        url: '${getApiPre(apidata?.tags?.[0] || "")}${apiPath}',
        ${reqMethod === "get" ? "params" : "data"}: data,
        headers: { "Content-Type":'${
          headerContentType || "application/json;charset=utf-8"
        }' },
    })
    .then((res) => resolve(${
      dataExport?.opend
        ? `res['${dataExport?.paramName ?? "data"}']`
        : 'res ?? ""'
    }))
    .catch((err) => {
        reject(err);
        });
    });
}\n`;
};

// 将 'user/login' 类型的接口名解析成驼峰式 UserLogin
const createAPIName = (api: string) => {
  const apiname = api
    .split("/")
    .map((str) => {
      if (str.includes("-")) {
        return str
          .split("-")
          .map((subStr) => {
            return firstUpperCase(subStr);
          })
          .join("");
      }
      return firstUpperCase(str);
    })
    .join("");

  return apiname;
};

const parseRefStruct = (param: SchemaInfo, paramName: string) => {
  return `export interface ${paramName} {
${parseObjectStruct(param, paramName)}
}
`;
};

// 解析返回数据结构体
const parseResoneDefine = (api: string, response: SchemaInfo) => {
  const parserObj = dataExport?.opend
    ? (response?.properties?.[
        dataExport?.paramName || ""
      ] as unknown as SchemaInfo) || response
    : response;

  // 整个response是个引用时
  const isRef = parserObj?.$ref;
  const structName = isRef ? getRefStructName(parserObj?.$ref || "") : api;

  apiImports += `import { ${structName} } from './Interface';`;

  if (isRef) {
    return "";
  }

  const defines = parseObjectStruct(parserObj, structName);
  const subDefines = responseSubDefineMap.get(structName) || [];
  // console.log('parseResoneDefine: ', api, defines, subDefines);

  return `export interface ${structName} {
${defines}
}\n
${subDefines.join("\n")}
`;
};

// 解析请求数据结构体
const parseRequestDefine = (
  api: string,
  parameters?: ParameterInfo[],
  requestBody?: SchemaInfo
) => {
  let defines = "";

  // 读取 parameters 对象
  if (parameters?.length) {
    const params = parameters?.filter((val) => val?.in !== "header"); // 放进header中的参数这边不解析
    // console.log(`解析: ${api}, parameters:`, params);
    for (let i = 0; i < params?.length; i += 1) {
      const obj = params[i];
      // parameters 里的参数只能配置基础数据类型，例如： string, number, boolean
      defines += createParam(
        obj.name,
        obj.description,
        obj.schema.type,
        obj.required
      );
    }
  }

  // 读取 requestBody 对象
  if (requestBody?.properties) {
    defines += parseObjectStruct(requestBody, api);
  }

  const subDefines = responseSubDefineMap.get(api) || [];

  apiImports += `
import { ${api} } from './Interface';\n`;

  return `export interface ${api} {
${defines}
}\n
${subDefines.join("\n")}
`;
};

const setTimeStamp = (timeStamp: string) => {
  return `\n // generated at: ${timeStamp}`;
};
const touchAPIFile = async (timeStamp: string) => {
  const isDefault = !customRequestCode.opend;
  const final = `${
    isDefault ? `import axios from 'axios'` : customRequestCode.importCode
  };
    ${apiImports}
    ${apiDefines}`;
  await saveTextFile(`${savepath}/Apis.ts`, final + setTimeStamp(timeStamp));
};

const touchInterfaceFile = async (timeStamp: string) => {
  await saveTextFile(
    `${savepath}/Interface.ts`,
    interfaceDefines + setTimeStamp(timeStamp)
  );
};

// 读取用户定义的插件自定义配置
const readConf = async () => {
  const conf = await readConfig();
  //   console.dir("readConf: ", conf);

  if (conf?.onlyExportData) {
    if (typeof conf.onlyExportData === "boolean") {
      dataExport.opend = conf.onlyExportData;
      if (dataExport.opend) {
        dataExport.paramName = "data";
      }
    } else {
      dataExport.opend = true;
      dataExport.paramName = conf.onlyExportData?.paramName || "data";
    }
  } else {
    dataExport = { opend: false, paramName: "" };
  }

  if (conf?.customRequestCode) {
    customRequestCode.opend = true;
    customRequestCode.requestCode = conf.customRequestCode.requestCode;
    customRequestCode.importCode =
      conf.customRequestCode?.importCode || `import axios from 'axios'`;
  } else {
    customRequestCode = { opend: false, importCode: "", requestCode: "" };
  }

  if (conf?.servers) {
    serverList = conf.servers;
  } else {
    serverList = [];
  }
};

const createModuleCodes = async () => {
  if (!apiJsonFile) {
    return;
  }

  await readConf();
  // console.log('createModuleCodes: ', apiJsonFile);

  apiImports = "";
  apiDefines = "";
  interfaceDefines = "";

  // 解析出api列表
  apiList = Object.keys(apiJsonFile.paths);
  apiList.forEach((api) => {
    const data = apiJsonFile?.paths[api];
    if (data) {
      const reqMethod = Object.keys(data)[0];
      const apidata = data[reqMethod];
      const apiname = createAPIName(api);
      const requestApi = `${apiname}Request`;
      const responseStruct = getValueByKey(
        apidata?.responses,
        "schema"
      ) as SchemaInfo;
      const responseApi = responseStruct?.$ref
        ? getRefStructName(responseStruct?.$ref)
        : `${apiname}Response`;

      // 创建api
      apiDefines += defineAPI(
        api,
        requestApi,
        responseApi,
        apidata,
        reqMethod,
        responseStruct
      );

      // 创建请求数据结构体
      interfaceDefines += parseRequestDefine(
        requestApi,
        apidata?.parameters,
        getValueByKey(apidata?.requestBody, "schema") as SchemaInfo
      );

      // 创建返回数据结构体
      interfaceDefines += parseResoneDefine(responseApi, responseStruct);

      // console.log('解析defines: ', interfaceDefines);
    }
  });

  // 解析ref结构体
  const componentList = Object.keys(apiJsonFile.components.schemas);
  componentList.forEach((key) => {
    const struct = apiJsonFile?.components?.schemas[key];
    if (!struct) {
      return;
    }

    interfaceDefines += parseRefStruct(
      struct as SchemaInfo,
      struct?.title || key
    );
  });

  const timeStamp = new Date().toLocaleString();

  // 写入接口文件
  await touchAPIFile(timeStamp);
  await touchInterfaceFile(timeStamp);

  showSystemMessage("接口文件生成成功!");
};

const loadApiData = async (url: string) => {
  axios
    .get(url)
    .then((response: any) => {
      // 检查HTTP响应状态
      if (response.status === 200) {
        // 响应数据包含在response.data中，它已经是JSON格式的对象
        const jsonData = response.data;
        apiJsonFile = jsonData;

        createModuleCodes();
      } else {
        showSystemMessage(
          "JSON文件下载失败，请检查网络连接或URL地址是否正确。"
        );
      }
    })
    .catch((error: any) => {
      console.error("Error downloading JSON file:", error);
    });
};

export const startCreateApi = (uri: string) => {
  savepath = uri;

  showInputBox(
    "请输入从Apifox导出的数据url:",
    (val) => {
      loadApiData(val);
    },
    "http://127.0.0.1:4523/export/openapi/1?version=3.0"
  );
};
