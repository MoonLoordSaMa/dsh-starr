# 远程唱歌字节节点

远程节点运行在安装好 SoulX 及其依赖的机器上。聊天、TTS 接口不能替代唱歌转换协议。客户端只上传本角色导入的音频字节，服务端不信任客户端文件路径。

启动前由管理员设置环境变量（不要将真实令牌写入版本控制）：

| 名称            | 用途与默认值                                       |
| --------------- | -------------------------------------------------- |
| STARR_SVC_TOKEN | 必填，至少 16 个字符的独立节点令牌                 |
| STARR_SVC_PORT  | 包装节点监听端口，默认 8201                        |
| STARR_SVC_HOST  | 默认 127.0.0.1；需要外部访问时由管理员选择监听地址 |
| SOULX_PORT      | 节点机器上已启动 SoulX 服务的本地端口，默认 8200   |

```powershell
node src/media/svc-node.mjs
```

对外访问应由已有的 HTTPS 反向代理转发到节点端口。客户端唱歌连接选择“远程音频字节节点”，地址填写 `https://你的节点/v1`，凭据环境变量名填写 DSH 启动环境中保存该令牌的变量名称。

协议提供 `GET /v1/health` 与 `POST /v1/svc/convert`，均校验 Bearer 令牌。转换请求包含 source/reference 的 base64 与 mime，以及 pitchShift、autoShift、vocalSep、nSteps、cfg；返回 `{ok:true,wav:<base64>}`。支持的输入为 WAV/MP3/FLAC/Ogg，单文件最多 15MB，客户端要求输出有 WAV 头部。节点将临时音频交给本机 SoulX `/convert`，结束后清理。

节点健康仅证明包装服务在线。需要通过真实模型转换、成品试听、超时与断线验证，才能确认远程机器可用。本版仅完成本地 HTTP 字节往返与模拟 SoulX 后端测试；不宣称真实远程模型已验证。
