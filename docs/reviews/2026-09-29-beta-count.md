# 内测人数

登录按钮下展示四语人数文案。2026-09-29 从指定 Google Sheet 的 Sheet1!A2:C1000 读取：105 个非空姓名、105 条有效邮箱记录、按去空格和大小写归一后 104 个唯一邮箱。按唯一有效邮箱计人数，未把行数或空白行算成人数。该表无邀请激活状态列，文案按用户指定「已加入内测」展示名单人数。

当前使用已核实快照 104，**自动同步尚未上线**，不声称实时。前端不下载源表、不包含姓名/邮箱。接口失败保留最后可用值。

## 自动同步接入

1. 在表格拥有者账户中创建 Google Apps Script，将 `integrations/google-sheets/beta-count.gs` 放入 Code.gs。
2. 部署为 Web App，以拥有者运行，允许任何人读取此只返回人数的接口；原表权限不变。
3. 用无登录窗口验证 /exec 地址返回 `{ "count": 104, "updatedAt": "..." }`，跨域 fetch 也需在官网验证。
4. 配置 `VITE_BETA_COUNT_ENDPOINT` 后重新构建。每次页面挂载请求一次，脚本缓存 5 分钟；8 秒超时、错误或非法返回时保留快照。不是持续实时推送。

脚本不接受参数或写入数据，仅从固定表的 Email 列计数。部署前尚未完成真实 Google 授权与跨域验证。

官方参考：https://developers.google.com/apps-script/guides/content 、https://developers.google.com/apps-script/guides/web
