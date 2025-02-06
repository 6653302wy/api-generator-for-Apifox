# api-generator-for-Apifox

## 说明

这是一个 vscode 插件，用于快速创建(由 Apifox 导出的 swagger3 数据) typescript 的 API 接口请求(Apis.ts)和定义(Interface.ts)文件。

## 使用

1. 选择文件夹，点击右键
2. 选择 `生成API文件(ts)` 命令
3. 生成的文件会保存在右键选择的文件夹下
4. 生成的 API 接口即可直接调用

## 插件配置说明

本插件提供了可以配置的选项（非必须）,可以在插件配置中配置自定义请求代码和服务列表等功能。配置文件需创建在项目**根目录**下，文件名为 `.apigenerator.json` 。

可配置的选项：

```json
{
  /**
   * （可选）是否只导出自定义字段的数据。boolean值或者{"paramName": "data"}
   *
   * - 若配置false，则导出接口返回的所有字段；
   * - 若配置true，则默认导出字段名为'data'的数据；
   * - 若配置了paramName， 则导出该字段内的数据；
   * 例如： 接口返回{"code": 0, "message": "success", "data": {"name": "wanpeng", "age": 25}}， 如果配置false则导出全部数据； 配置true，则导出的是data（默认）字段的数据：{"name": "wanpeng", "age": 25}
   */
  "onlyExportData": {
    "paramName": "data"
  },
  /**
   * （可选） 自定义请求代码； 不配置该字段，则默认使用axios请求， 请确保项目中有下载axios库
   */
  "customRequestCode": {
    // import 代码 （示例替换成你自己项目的代码）
    "importCode": "import { NetManager } from '@6653302wy/ts-utils'",
    // 请求体代码（示例替换成你自己项目的代码）
    "requestCode": "NetManager.inst.request(@url,{type: @method,@data,headerContentType: @contentType})"
  },
  /**
   * （可选，根据需要配置）服务列表
   * 项目中若有多个接口使用不同的 '前置URL' 时，可在此添加多个服务
   * 注意：name需要和接口的tag相同（可直接查看swagger.json文件中的tag字段）
   */
  "servers": [
    {
      "name": "测试项目/测试服务1",
      "url": "http://xxx.xx.xx.xx:8090/xxxxx"
    },
    {
      "name": "测试项目/测试服务2",
      "url": "http://xxx.xx.xx.xx:8081/xx"
    }
  ]
}
```

### 友链

该工具还有一个桌面版，有需要的可移步至[API 导出工具](https://github.com/6653302wy/export-defines-tool)查看
