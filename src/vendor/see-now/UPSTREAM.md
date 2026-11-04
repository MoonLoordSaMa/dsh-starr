来源：https://github.com/SAOS-3624/dsh-see-now
版本：0.0.10，提交 a21b62d9fbdaf7144034f8f350fa8a544fbd73b5
仅整合原版采集与关键帧拼图模块，保留 Apache-2.0 许可证和 NOTICE；Starr 的权限与模型调用由外层服务管理。
本地改动：capture.js 启动FFmpeg时增加 windowsHide，避免Windows闪出终端窗口。
本地改动：有有效帧的文件源正常到结尾时允许code 0；主动stop兼容Windows的非null退出码。屏幕源自行退出仍报错，避免将掉线误判为完成。
