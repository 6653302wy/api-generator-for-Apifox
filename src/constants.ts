export interface PropertyInfo {
  type: string;
  description?: string;
  example?: string;
  items?: { [key: string]: PropertyInfo };
  // $ref "#/components/schemas/ResourceItem" 解析时取最后一个/后的内容
  $ref?: string;
}

export type ParamInfo = { [key: string]: PropertyInfo };

export interface SchemaInfo {
  type: string;
  properties: ParamInfo;
  // 必填参数列表
  required?: string[];
  /** type 为 array 时 */
  items?: { [key: string]: PropertyInfo };
  title?: string;
  // $ref "#/components/schemas/ResourceItem" 解析时取最后一个/后的内容
  $ref?: string;
}

export interface ParameterInfo {
  name: string;
  in: string;
  description: string;
  required: boolean;
  /** 在请求的 parameters 中，schema里的数据均为基础类型数据  */
  schema: PropertyInfo;
}

export interface ServerInfo {
  url: string;
  description: string;
}

export interface PathInfo {
  // 协议名
  summary: string;
  description: string;
  deprecated: boolean;
  tags: string[];
  // get请求中的请求参数 (只解析其中一个，有parameters就是走get,有body就是走post)
  parameters: ParameterInfo[];
  // post请求中的请求参数 (只解析其中一个，有parameters就是走get,有body就是走post)
  requestBody: {
    content: { "application/json": { schema: SchemaInfo } };
  };
  // 返回数据
  responses: {
    "200": { content: { "application/json": { schema: SchemaInfo } } };
  };
}
export interface JsonDataInfo {
  tags: { name: string }[];
  paths: { [key: string]: { [key: string]: PathInfo } };
  components: { schemas: { [key: string]: SchemaInfo } };
  servers: ServerInfo[];

  swagger?: string;
}

// 基础数据类型
export const basicDataTypes = [
  "string",
  "number",
  "integer",
  "boolean",
  "file",
  "float",
  "double",
];

export const refPath = "#/components/schemas/";

export interface CustomRequest {
  opend: boolean;
  importCode: string;
  requestCode: string;
}

export type OnlyDataExport = {
  opend: boolean;
  paramName: string;
};

export interface ServiceInfo {
  name: string;
  url: string;
  desc?: string;
}
