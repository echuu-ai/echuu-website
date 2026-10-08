# SEO / GEO 提交记录（Google / Bing / 百度）

开闸开关:`VITE_SITE_INDEXABLE=1`（Vercel Production）。衡量:`VITE_GA_MEASUREMENT_ID=G-8XQQQ40X3C`。
sitemap:`https://www.echuu.ai/sitemap.xml`（44 条 URL，zh/ja/en/ko 四语，构建期生成）。

## 站点验证方式（都已上线）

| 平台 | 方式 | 位置 | 值 |
|---|---|---|---|
| Google Search Console | HTML 文件 | `public/google1ce75437e060a433.html` | token 文件 |
| Bing Webmaster | meta 标签 | `index.html` `<head>` | `msvalidate.01` |
| 百度搜索资源平台 | meta 标签 | `index.html` `<head>` | `baidu-site-verification=codeva-OX9pghzoWG` |

> 这些验证记录**不要删**，删了会掉验证。token（百度推送准入密钥）是密码级，不进仓库、不外发。

## sitemap 提交

- Google Search Console → 站点地图 → `sitemap.xml`（提交后初期显示「无法抓取」属正常，几小时~2 天变成功）
- Bing → Sitemaps → `https://www.echuu.ai/sitemap.xml`
- 百度 → 普通收录 → sitemap（新站权限可能要养几天）

## 百度主动推送（API 提交）

百度抓 sitemap 很慢，主动推送更快。配额有限，**每批 5 条、按优先级（zh → ja → en → ko）推**。
命令里的 `你的TOKEN` 换成百度「普通收录 / API 提交」页面 `token=` 后那串（echuu.ai 的准入密钥）。

```bash
# 批 1（中文核心页）
printf '%s\n' "https://www.echuu.ai/website/zh/" "https://www.echuu.ai/website/zh/creators/" "https://www.echuu.ai/website/zh/blog/" "https://www.echuu.ai/website/zh/journal/" "https://www.echuu.ai/website/zh/gallery/" | curl -H 'Content-Type:text/plain' --data-binary @- "http://data.zz.baidu.com/urls?site=https://www.echuu.ai&token=你的TOKEN"

# 批 2（中文其余 + 博客）
printf '%s\n' "https://www.echuu.ai/website/zh/team/" "https://www.echuu.ai/website/zh/feedback/" "https://www.echuu.ai/website/zh/doodle/" "https://www.echuu.ai/website/zh/blog/cinematic-character-onboarding/" "https://www.echuu.ai/website/zh/blog/blendshape-character-continuity/" | curl -H 'Content-Type:text/plain' --data-binary @- "http://data.zz.baidu.com/urls?site=https://www.echuu.ai&token=你的TOKEN"

# 批 3（中文最后一篇 + 日文开始）
printf '%s\n' "https://www.echuu.ai/website/zh/blog/responsible-ai-disclosure/" "https://www.echuu.ai/website/ja/" "https://www.echuu.ai/website/ja/creators/" "https://www.echuu.ai/website/ja/blog/" "https://www.echuu.ai/website/ja/journal/" | curl -H 'Content-Type:text/plain' --data-binary @- "http://data.zz.baidu.com/urls?site=https://www.echuu.ai&token=你的TOKEN"

# 批 4（日文）
printf '%s\n' "https://www.echuu.ai/website/ja/gallery/" "https://www.echuu.ai/website/ja/team/" "https://www.echuu.ai/website/ja/feedback/" "https://www.echuu.ai/website/ja/doodle/" "https://www.echuu.ai/website/ja/blog/cinematic-character-onboarding/" | curl -H 'Content-Type:text/plain' --data-binary @- "http://data.zz.baidu.com/urls?site=https://www.echuu.ai&token=你的TOKEN"

# 批 5（日文博客 + 英文开始）
printf '%s\n' "https://www.echuu.ai/website/ja/blog/blendshape-character-continuity/" "https://www.echuu.ai/website/ja/blog/responsible-ai-disclosure/" "https://www.echuu.ai/website/en/" "https://www.echuu.ai/website/en/creators/" "https://www.echuu.ai/website/en/blog/" | curl -H 'Content-Type:text/plain' --data-binary @- "http://data.zz.baidu.com/urls?site=https://www.echuu.ai&token=你的TOKEN"

# 批 6（英文）
printf '%s\n' "https://www.echuu.ai/website/en/journal/" "https://www.echuu.ai/website/en/gallery/" "https://www.echuu.ai/website/en/team/" "https://www.echuu.ai/website/en/feedback/" "https://www.echuu.ai/website/en/doodle/" | curl -H 'Content-Type:text/plain' --data-binary @- "http://data.zz.baidu.com/urls?site=https://www.echuu.ai&token=你的TOKEN"

# 批 7（英文博客 + 韩文开始）
printf '%s\n' "https://www.echuu.ai/website/en/blog/cinematic-character-onboarding/" "https://www.echuu.ai/website/en/blog/blendshape-character-continuity/" "https://www.echuu.ai/website/en/blog/responsible-ai-disclosure/" "https://www.echuu.ai/website/ko/" "https://www.echuu.ai/website/ko/creators/" | curl -H 'Content-Type:text/plain' --data-binary @- "http://data.zz.baidu.com/urls?site=https://www.echuu.ai&token=你的TOKEN"

# 批 8（韩文）
printf '%s\n' "https://www.echuu.ai/website/ko/blog/" "https://www.echuu.ai/website/ko/journal/" "https://www.echuu.ai/website/ko/gallery/" "https://www.echuu.ai/website/ko/team/" "https://www.echuu.ai/website/ko/feedback/" | curl -H 'Content-Type:text/plain' --data-binary @- "http://data.zz.baidu.com/urls?site=https://www.echuu.ai&token=你的TOKEN"

# 批 9（韩文剩余，共 4 条）
printf '%s\n' "https://www.echuu.ai/website/ko/doodle/" "https://www.echuu.ai/website/ko/blog/cinematic-character-onboarding/" "https://www.echuu.ai/website/ko/blog/blendshape-character-continuity/" "https://www.echuu.ai/website/ko/blog/responsible-ai-disclosure/" | curl -H 'Content-Type:text/plain' --data-binary @- "http://data.zz.baidu.com/urls?site=https://www.echuu.ai&token=你的TOKEN"
```

返回 `{"success":N,"remain":当日剩余}` 即成功。配额当日有效、不累积。

## 推送记录（自己填）

| 批 | 语言 | 条数 | 推送日期 | success | remain | 备注 |
|---|---|---|---|---|---|---|
| 1 | zh | 5 | | | | |
| 2 | zh | 5 | | | | |
| 3 | zh/ja | 5 | | | | |
| 4 | ja | 5 | | | | |
| 5 | ja/en | 5 | | | | |
| 6 | en | 5 | | | | |
| 7 | en/ko | 5 | | | | |
| 8 | ko | 5 | | | | |
| 9 | ko | 4 | | | | |

## 期望值

Google / Bing 正常收录。**百度无备案 + Vercel 大陆抓取不稳**，推送成功 ≠ 收录，收录会慢且弱；认真做中文市场需 `.live` 备案 + 国内托管。见 [`website-beta-invite-design.md`](website-beta-invite-design.md) 同级的域名策略记录。
