# 上传GitHub前的源码准备

GitHub仓库存放源码、测试、文档、依赖锁文件与构建规则。角色、记忆库、表情原图、曲库音频、凭据、模型和备份保存在独立数据目录，不随源码上传。

```powershell
pnpm install --frozen-lockfile
pnpm release:audit
pnpm format:check
pnpm test
pnpm build
pnpm pack:source -- --out-dir '<仓库之外的交付目录>'
```

也可直接使用`node scripts/package-source.mjs --out-dir '<仓库之外的交付目录>'`。源码归档只读取Git的已跟踪及未忽略文件清单，不包含`.git`、`node_modules`和`dist`。脚本拒绝已跟踪进来的常见运行资料、凭据与模型，并检查常见服务密钥、私钥正文、会话凭据及个人机器路径；只报告文件名和原因，不回显匹配内容。这是有边界的静态检查，仍需在提交前阅读实际暂存差异。

源码ZIP供上传或保存源码使用，需要安装开发依赖后构建。最终用户在DSH里安装的是`pnpm pack:plugin`生成的`.tgz`插件包；对应ZIP仅用于解压归档。插件发行包已含构建后网页，按包清单分发，不带开发依赖或个人数据。

`package.json`中的`private: true`只防止误发布到npm，不影响上传GitHub。请先创建自己的远端仓库，再根据实际仓库地址设置Git远端并推送，不要使用文档中的占位地址。本轮准备工作不会自行创建公开仓库或推送个人账号。

`.github/workflows/ci.yml`在GitHub上执行发布检查、格式检查、测试与构建。Windows系统加密、本机模型、真实QQ或B站联调仍需在对应环境验收，持续集成（CI）通过不能替代这些验证。

原创代码与第三方代码许可分别见根目录`LICENSE`和[第三方说明](THIRD-PARTY.md)。GSAP仍遵守其标准许可，不把整个依赖链描述为MIT。
