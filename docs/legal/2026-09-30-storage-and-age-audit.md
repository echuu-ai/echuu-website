# 存储与16+条款核查 · 2026-09-30

轨道：integration，独立官网条款；只读平台源码与AWS配置，不调用删除接口、不修改云端、不切换运行环境。官网四語稿同步更新，仍未正式审定／部署。

## 用户确认

- 运营主体：Anngel LLC。
- 注册代理：NORTHWEST REGISTERED AGENT, LLC。
- 公开联系地址：732 S 6th ST, STE N, Las Vegas, NV 89101, USA。
- 最低内测年龄16岁。地址标为用户提供的注册代理地址，不据此认定公司成立州。注册州待公司登记资料核实。
- 用户依法对上传、发布和行为负责；不以“自己负责”排除监护人同意、法定撤销／退款／隐私权或平台义务。

## AWS在线配置证据

匿名HEAD读取桶响应头，加上现有应用凭据执行只读GetBucketLifecycleConfiguration / GetBucketVersioning / GetBucketReplication / GetBucketEncryption；未读取对象内容、未输出凭据、未修改云端。

| 桶 | 实際区域 | 生命周期 | 版本控制 | S3复制 | 默认加密 |
|---|---|---|---|---|---|
| nextjs-vtuber-assets | us-east-2，美国俄亥俄 | NoSuchLifecycleConfiguration | Enabled | ReplicationConfigurationNotFoundError | AES256 / SSE-S3 |
| echuu-storage | us-east-2，美国俄亥俄 | NoSuchLifecycleConfiguration | 空响应：未启用 | ReplicationConfigurationNotFoundError | AES256 / SSE-S3 |

没有生命周期配置只说明没有S3生命周期过期任务，不证明没有其他手动/定时删除，也不说明所有副本都不存在。无S3复制配置不排除手工复制或其他备份。素材桶普通DeleteObject可能只增加删除标记，历史版本仍保留。

## 平台代码证据（不是线上删除验收）

只读检出：/Users/cory/Desktop/echuu-cloud-backend，HEAD 8f616439f5a9eb02529fa8c5834cc11b68f08db7，工作区干净；线上部署commit未核实。

- backend/app/services/asset_user.py:delete_current_user_asset、asset_management.py:delete_admin_asset：调用对象删除后session.delete资产记录。S3错误阻止后续正常删除；对象不存在可继续。
- backend/app/storage/storage.py:delete_object：DeleteObject(Bucket,Key)，没有VersionId，不是所有历史版本清除。
- backend/app/api/routes/users.py:delete_user_me：删除用户数据库记录并commit，未在此链路发现关联S3对象清理。不能据账号删除返回成功承诺全部数据清除。
- backend/app/core/config.py：S3默认localhost MinIO/us-east-1，不是生产事实；实际AWS响应区域优先于默认值。签名URL900秒是访问授权有效期，非对象保存期限。
- 预研echuu-agent/echuu-web/backend/routers/analytics.py：CONTENT_RETENTION_DAYS persona/topic365、chat30；写入retention_days字段，不等于删除执行。未核实生产使用该分析路由。
- 预研services/s3_archive.py：streaming_content/session目录归档脚本与音频；未见本模块配置过期清理。

## 供应商与剩余边界

- AWS S3设置已在线读取。
- 平台agent/src/config.py与stt.py/tts.py：DashScope，默认qwen3-asr-flash、cosyvoice-v3-flash；agent/src/llm.py使用可覆盖base_url/model的OpenAI兼容适配器，不能凭包名断言实际调用OpenAI。
- LiveKit集成在平台/agent源码中存在；部署地址与持久化/录制留存尚未核实。
- 本轮没有访问云端部署环境变量或供应商管理控制台；实际启用模型、套餐、日志、训练退出、数据区域、数据库/备份保存均未认证。
- 阿里云官方说明不使用API数据训练模型，但需要核对实际项目账号/区域/产品适用条款，不能将其扩大为所有提供商的保证。
- 后续需后台提供：账号数据库区域、备份周期、各类内容保留期限、账号删除的对象清理任务与失败重试、素材旧版本删除策略、供应商实际部署清单与条款。不能把这些待办写成已实现。

## 年龄法律依据与措辞

- 中国民法典17–19条：18成年；16岁以上以自身劳动收入为主要生活来源者例外。例外不等于一概免除直播专项保护。
- 中国网络主播服务16–18岁监护人同意规则；需先完成适用审核。16+是产品门槛，不是自动具备完全合同能力。
- 美国依州法；Nevada NRS129.010：18岁或依法获得解放者具相应能力。未将Nevada法强制指定给所有用户。
- COPPA主要涉及13岁以下儿童；服务宣称16+不自动免除实际适用时的义务。
- 2026年直播打赏新通知检索出现年龄分级规定；未把2022年一刀切规则当成唯一现行规则。本稿将未成年人充值打赏暂不开启写成内测产品安排，后续开放另核实当时法律，不宣布所有未成年人付费依法一律无效。
- 2026-09-18未成年人网络规定是征求意见稿，不作为已生效法规引用。

来源：
- https://www.stats.gov.cn/gk/tjfg/xgfxfg/202503/t20250312_1958939.html
- https://www.cac.gov.cn/2022-05/07/c_1653537626423773.htm
- https://www.cac.gov.cn/2026-04/13/c_1777815804150225.htm
- https://www.leg.state.nv.us/division/Legal/LawLibrary/NRS/NRS-129.html
- https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions
- https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObject.html
- https://help.aliyun.com/en/model-studio/faq-about-alibaba-cloud-model-studio

## 验证

109项资源哈希通过；TypeScript和生产构建通过（既有大包提示保留）。仅条款内容与记录变更，未新增年龄核验或删除机制。未提交/推送/部署。
