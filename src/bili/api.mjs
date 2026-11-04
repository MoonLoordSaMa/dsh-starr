import crypto from "node:crypto";
import { fail } from "../starrcore/store.mjs";
export function selectBiliMediaUrl(primary, backups = []) {
  // 平台主地址可能是P2P节点或自定义端口，优先使用同次响应里的标准CDN备用地址。
  for (const value of [primary, ...(Array.isArray(backups) ? backups : [])]) {
    try {
      const url = new URL(value);
      if (
        url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        !url.port &&
        [
          ".bilivideo.com",
          ".bilivideo.cn",
          ".hdslb.com",
          ".akamaized.net",
        ].some((suffix) => url.hostname.endsWith(suffix))
      )
        return url.href;
    } catch {}
  }
  throw fail("B站本次未返回可用的标准CDN地址，请稍后更换音源重试", 409);
}
export const exactJSON = (text) =>
  JSON.parse(text, (key, value, context) =>
    typeof value === "number" &&
    Number.isInteger(value) &&
    !Number.isSafeInteger(value) &&
    context?.source
      ? context.source
      : value,
  );
export function biliClient(cookie, { request = fetch } = {}) {
  if (
    typeof cookie !== "string" ||
    !/(?:^|;\s*)SESSDATA=/.test(cookie) ||
    !/(?:^|;\s*)bili_jct=/.test(cookie) ||
    /[\r\n]/.test(cookie)
  )
    throw fail("请配置含 SESSDATA 与 bili_jct 的 B站 Cookie", 409);
  const csrf = /(?:^|;\s*)bili_jct=([^;]+)/.exec(cookie)?.[1];
  let wbiKey = "";
  const signingOrder = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
    33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
    61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
    36, 20, 34, 44, 52,
  ];
  const signed = (values) => {
    if (!wbiKey) throw fail("B站签名尚未初始化，请先验证登录", 409);
    const data = { ...values, wts: Math.floor(Date.now() / 1000) },
      query = Object.keys(data)
        .sort()
        .map(
          (key) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(String(data[key]).replace(/[!'()*]/g, ""))}`,
        )
        .join("&");
    return {
      ...data,
      w_rid: crypto
        .createHash("md5")
        .update(query + wbiKey)
        .digest("hex"),
    };
  };
  const call = async (host, pathname, params = {}, body, signal) => {
    if (
      ![
        "api.bilibili.com",
        "api.vc.bilibili.com",
        "api.live.bilibili.com",
      ].includes(host)
    )
      throw fail("B站接口域名无效", 403);
    const url = new URL(`https://${host}${pathname}`);
    for (const [key, value] of Object.entries(params))
      url.searchParams.set(key, String(value));
    let response;
    try {
      response = await request(url, {
        method: body ? "POST" : "GET",
        redirect: "error",
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(20000)])
          : AbortSignal.timeout(20000),
        headers: {
          Cookie: cookie,
          Referer: "https://www.bilibili.com/",
          "User-Agent": "Mozilla/5.0",
          ...(body
            ? { "Content-Type": "application/x-www-form-urlencoded" }
            : {}),
        },
        ...(body
          ? { body: new URLSearchParams({ ...body, csrf, csrf_token: csrf }) }
          : {}),
      });
    } catch {
      throw Object.assign(fail("B站请求未取得回执", 503), {
        code: "BILI_TRANSPORT",
        uncertain: !!body,
      });
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw Object.assign(fail(`B站接口 HTTP ${response.status}`, 502), {
        code: `BILI_HTTP_${response.status}`,
        risk: response.status === 429,
        uncertain: !!body,
      });
    }
    const chunks = [];
    let bytes = 0;
    for await (const chunk of response.body) {
      bytes += chunk.length;
      if (bytes > 2097152)
        throw Object.assign(fail("B站响应超过限制", 502), {
          code: "BILI_PROTOCOL",
          uncertain: !!body,
        });
      chunks.push(chunk);
    }
    let result;
    try {
      result = exactJSON(Buffer.concat(chunks).toString());
    } catch {
      throw Object.assign(fail("B站返回无效协议响应", 502), {
        code: "BILI_PROTOCOL",
        uncertain: !!body,
      });
    }
    if (result.code !== 0)
      throw Object.assign(fail(`B站拒绝操作（${result.code}）`, 502), {
        code: `BILI_CODE_${result.code}`,
        risk: [-412, -352, -509].includes(result.code),
      });
    return result.data;
  };
  return {
    async media(bvid, signal) {
      if (!/^BV[A-Za-z0-9]{10}$/.test(bvid)) throw fail("视频编号无效");
      const video = await call(
        "api.bilibili.com",
        "/x/web-interface/view",
        { bvid },
        undefined,
        signal,
      );
      if (!video?.cid) throw fail("没有可读取的视频分P", 404);
      const data = await call(
        "api.bilibili.com",
        "/x/player/wbi/playurl",
        signed({ bvid, cid: video.cid, qn: 16, fnval: 16, fourk: 0 }),
        undefined,
        signal,
      );
      const stream = (data?.dash?.video || [])
        .filter((v) => v.codecid === 7)
        .sort((a, b) => a.bandwidth - b.bandwidth)[0];
      const audio = (data?.dash?.audio || []).sort(
        (a, b) => a.bandwidth - b.bandwidth,
      )[0];
      const videoStream = stream || data?.durl?.[0];
      if (!videoStream)
        throw fail("该视频没有可访问画面流，可能受登录、地区或付费限制", 409);
      const videoUrl = selectBiliMediaUrl(
        videoStream.baseUrl || videoStream.base_url || videoStream.url,
        videoStream.backupUrl || videoStream.backup_url,
      );
      const audioUrl = audio
        ? selectBiliMediaUrl(
            audio.baseUrl || audio.base_url,
            audio.backupUrl || audio.backup_url,
          )
        : videoUrl;
      return {
        title: String(video.title || bvid),
        aid: String(video.aid),
        videoUrl,
        audioUrl,
        duration: Number(video.duration) || 0,
      };
    },
    async dynamic(id, signal) {
      if (!/^\d{1,30}$/.test(id)) throw fail("动态编号无效");
      const data = await call(
          "api.bilibili.com",
          "/x/polymer/web-dynamic/v1/detail",
          { id, features: "itemOpusStyle" },
          undefined,
          signal,
        ),
        item = data?.item,
        major = item?.modules?.module_dynamic?.major;
      if (!item?.id_str) throw fail("动态不存在或无权读取", 404);
      return {
        id: String(item.id_str),
        author: String(item.modules?.module_author?.mid || ""),
        text: String(
          item.modules?.module_dynamic?.desc?.text ||
            major?.opus?.summary?.text ||
            "",
        ),
        pics: (major?.opus?.pics || major?.draw?.items || [])
          .slice(0, 9)
          .map((pic) => ({
            img_src: pic.url || pic.src,
            img_width: pic.width,
            img_height: pic.height,
          })),
      };
    },
    async search(q, signal) {
      if (typeof q !== "string" || !q.trim() || q.length > 100)
        throw fail("搜索词应为1–100字");
      const data = await call(
        "api.bilibili.com",
        "/x/web-interface/wbi/search/type",
        signed({ search_type: "video", keyword: q, page: 1, page_size: 10 }),
        undefined,
        signal,
      );
      return (data?.result || []).slice(0, 10).map((row) => ({
        bvid: row.bvid,
        title: String(row.title || "").replace(/<[^>]*>/g, ""),
        author: row.author,
        description: String(row.description || "").slice(0, 1000),
      }));
    },
    async profile(mid, signal) {
      if (!/^\d{1,22}$/.test(mid)) throw fail("账号编号无效");
      const data = await call(
        "api.bilibili.com",
        "/x/space/wbi/acc/info",
        signed({ mid }),
        undefined,
        signal,
      );
      return {
        mid: String(data.mid),
        name: String(data.name || ""),
        sign: String(data.sign || "").slice(0, 1000),
        level: data.level,
      };
    },
    async watchHistory(signal) {
      const data = await call(
        "api.bilibili.com",
        "/x/web-interface/history/cursor",
        { ps: 20, type: "archive" },
        undefined,
        signal,
      );
      return (data?.list || []).slice(0, 20).map((row) => ({
        title: row.title,
        bvid: row.history?.bvid,
        author: row.author_name,
        viewAt: row.view_at,
      }));
    },
    async favorites(mid, signal) {
      const data = await call(
        "api.bilibili.com",
        "/x/v3/fav/folder/created/list-all",
        { up_mid: mid },
        undefined,
        signal,
      );
      return (data?.list || []).slice(0, 30).map((row) => ({
        id: String(row.id),
        title: row.title,
        count: row.media_count,
      }));
    },
    async uploadImage(bytes, mime, signal) {
      const form = new FormData();
      form.append(
        "file_up",
        new Blob([bytes], { type: mime }),
        mime === "image/png" ? "image.png" : "image.jpg",
      );
      form.append("category", "daily");
      form.append("csrf", csrf);
      let response;
      try {
        response = await request(
          "https://api.bilibili.com/x/dynamic/feed/draw/upload_bfs",
          {
            method: "POST",
            redirect: "error",
            headers: {
              Cookie: cookie,
              Referer: "https://t.bilibili.com/",
              "User-Agent": "Mozilla/5.0",
            },
            body: form,
            signal: signal || AbortSignal.timeout(30000),
          },
        );
      } catch {
        throw Object.assign(fail("图片上传未取得回执", 503), {
          uncertain: true,
        });
      }
      const raw = await response.text();
      if (raw.length > 65536) throw fail("图片回执超过限制", 502);
      let result;
      try {
        result = exactJSON(raw);
      } catch {
        throw fail("图片回执无效", 502);
      }
      if (!response.ok || result.code !== 0 || !result.data?.image_url)
        throw fail("图片上传未获得有效地址", 502);
      const data = result.data,
        url = new URL(data.image_url);
      if (url.protocol !== "https:" || !url.hostname.endsWith(".hdslb.com"))
        throw fail("图片资源地址无效", 502);
      return {
        img_src: url.href,
        img_width: data.image_width,
        img_height: data.image_height,
        img_size: data.img_size,
      };
    },
    async writeDynamic({ id, text, pics = [] }, signal) {
      const endpoint = id ? "edit" : "create",
        url = new URL(
          `https://api.bilibili.com/x/dynamic/feed/${endpoint}/dyn`,
        );
      for (const [key, value] of Object.entries(signed({ csrf })))
        url.searchParams.set(key, String(value));
      let response;
      try {
        response = await request(url, {
          method: "POST",
          redirect: "error",
          signal: signal || AbortSignal.timeout(20000),
          headers: {
            Cookie: cookie,
            Referer: "https://t.bilibili.com/",
            Origin: "https://t.bilibili.com",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0",
          },
          body: JSON.stringify({
            ...(id ? { dyn_id_str: id } : {}),
            dyn_req: {
              content: { contents: [{ raw_text: text, type: 1, biz_id: "" }] },
              scene: pics.length ? 2 : 1,
              ...(pics.length ? { pics } : {}),
              meta: {
                app_meta: { from: "create.dynamic.web", mobi_app: "web" },
              },
            },
          }),
        });
      } catch {
        throw Object.assign(fail("动态操作未取得回执", 503), {
          uncertain: true,
        });
      }
      const raw = await response.text();
      if (raw.length > 65536)
        throw Object.assign(fail("动态回执超过限制", 502), { uncertain: true });
      let result;
      try {
        result = exactJSON(raw);
      } catch {
        throw Object.assign(fail("动态回执无效", 502), { uncertain: true });
      }
      if (!response.ok || result.code !== 0)
        throw fail("平台拒绝动态操作", 502);
      const messageId = String(
        result.data?.dyn_id_str || result.data?.dyn_id || id || "",
      );
      if (!messageId)
        throw Object.assign(fail("动态编号缺失，结果待核对", 502), {
          uncertain: true,
        });
      if (id) {
        const current = await this.dynamic(id, signal);
        if (current.text !== text)
          throw Object.assign(fail("平台已受理，但回读正文尚未一致", 409), {
            uncertain: true,
          });
      }
      return { status: "sent", messageId, deliveryVerified: !!id };
    },
    async deleteDynamic(id, signal) {
      await call(
        "api.vc.bilibili.com",
        "/dynamic_svr/v1/dynamic_svr/rm",
        {},
        { dynamic_id: id },
        signal,
      );
      return {
        status: "accepted",
        messageId: id,
        deliveryVerified: false,
        detail: "平台已受理删除，页面最终状态请回读核对",
      };
    },
    async likeDynamic(id, signal) {
      await call(
        "api.vc.bilibili.com",
        "/dynamic_like/v1/dynamic_like/thumb",
        {},
        { dynamic_id: id, up: "1" },
        signal,
      );
      return { status: "accepted", messageId: id, deliveryVerified: false };
    },
    async feed(self, signal) {
      const data = await call(
        "api.bilibili.com",
        "/x/polymer/web-dynamic/v1/feed/space",
        { host_mid: self, offset: "" },
        undefined,
        signal,
      );
      return (data?.items || [])
        .slice(0, 20)
        .filter((item) => /^\d+$/.test(String(item.id_str || "")))
        .map((item) => ({
          id: String(item.id_str),
          author: String(item.modules?.module_author?.mid || ""),
          time: Number(item.modules?.module_author?.pub_ts || 0),
          text: String(
            item.modules?.module_dynamic?.desc?.text ||
              item.modules?.module_dynamic?.major?.archive?.title ||
              "公开动态",
          ).slice(0, 2000),
        }));
    },
    async me(signal) {
      const data = await call(
        "api.bilibili.com",
        "/x/web-interface/nav",
        {},
        undefined,
        signal,
      );
      if (!data?.isLogin || !data.mid)
        throw Object.assign(fail("B站登录凭据已失效", 401), {
          code: "BILI_AUTH",
        });
      if (data.wbi_img) {
        const source = [data.wbi_img.img_url, data.wbi_img.sub_url]
          .map((url) => String(url).split("/").at(-1).split(".")[0])
          .join("");
        wbiKey = signingOrder
          .map((index) => source[index] || "")
          .join("")
          .slice(0, 32);
      }
      return { selfId: String(data.mid), name: String(data.uname || "") };
    },
    async candidates(signal) {
      const data = await call(
        "api.bilibili.com",
        "/x/web-interface/popular",
        { pn: 1, ps: 30 },
        undefined,
        signal,
      );
      return (data?.list || []).map((v) => ({
        bvid: String(v.bvid),
        title: String(v.title || ""),
        description: String(v.desc || ""),
        author: String(v.owner?.name || ""),
        mid: String(v.owner?.mid || ""),
        duration: Number(v.duration) || 0,
        aid: String(v.aid || ""),
        cid: String(v.cid || ""),
      }));
    },
    async video(bvid, signal) {
      if (!/^BV[A-Za-z0-9]{10}$/.test(bvid)) throw fail("视频编号无效");
      const video = await call(
        "api.bilibili.com",
        "/x/web-interface/view",
        { bvid },
        undefined,
        signal,
      );
      let transcript = "",
        transcriptAvailable = false;
      if (video?.cid && wbiKey) {
        const player = await call(
          "api.bilibili.com",
          "/x/player/wbi/v2",
          signed({ bvid, cid: video.cid }),
          undefined,
          signal,
        );
        const track =
          player?.subtitle?.subtitles?.find((s) =>
            String(s.lan).startsWith("zh"),
          ) || player?.subtitle?.subtitles?.[0];
        if (track?.subtitle_url) {
          const url = new URL(
            String(track.subtitle_url).startsWith("//")
              ? "https:" + track.subtitle_url
              : track.subtitle_url,
          );
          if (
            url.protocol === "https:" &&
            url.hostname.endsWith(".hdslb.com") &&
            !url.username &&
            !url.password
          ) {
            const response = await request(url, {
              redirect: "error",
              signal: signal || AbortSignal.timeout(20000),
            });
            if (response.ok) {
              let size = 0;
              const chunks = [];
              for await (const chunk of response.body) {
                size += chunk.length;
                if (size > 1048576) throw fail("字幕超过读取上限", 502);
                chunks.push(chunk);
              }
              const data = JSON.parse(Buffer.concat(chunks));
              transcript = (data.body || [])
                .map((row) => String(row.content || ""))
                .join("\n")
                .slice(0, 18000);
              transcriptAvailable = !!transcript;
            }
          }
        }
      }
      return {
        bvid,
        aid: String(video?.aid || ""),
        title: String(video?.title || ""),
        description: String(video?.desc || "").slice(0, 4000),
        author: String(video?.owner?.name || ""),
        mid: String(video?.owner?.mid || ""),
        duration: Number(video?.duration) || 0,
        transcript,
        transcriptAvailable,
        visualVerified: false,
        note: transcriptAvailable
          ? "这是标题、简介和字幕资料；没有读取完整画面或声音"
          : "仅有视频资料，没有可读字幕；不能声称已看完整视频",
      };
    },
    async publish(text, signal) {
      // 动态发布使用 JSON 正文与 WBI 参数；与其他表单写接口分开。
      const url = new URL("https://api.bilibili.com/x/dynamic/feed/create/dyn");
      for (const [key, value] of Object.entries(signed({ csrf })))
        url.searchParams.set(key, String(value));
      let response;
      try {
        response = await request(url, {
          method: "POST",
          redirect: "error",
          signal: signal || AbortSignal.timeout(20000),
          headers: {
            Cookie: cookie,
            Referer: "https://t.bilibili.com/",
            Origin: "https://t.bilibili.com",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0",
          },
          body: JSON.stringify({
            dyn_req: {
              content: { contents: [{ raw_text: text, type: 1, biz_id: "" }] },
              scene: 1,
              meta: {
                app_meta: { from: "create.dynamic.web", mobi_app: "web" },
              },
            },
          }),
        });
      } catch {
        throw Object.assign(fail("动态发布未取得回执", 503), {
          uncertain: true,
          code: "BILI_TRANSPORT",
        });
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw Object.assign(fail(`动态接口 HTTP ${response.status}`, 502), {
          uncertain: true,
          risk: response.status === 429,
        });
      }
      const textResult = await response.text();
      if (textResult.length > 1048576)
        throw Object.assign(fail("动态回执超出限制", 502), { uncertain: true });
      let result;
      try {
        result = exactJSON(textResult);
      } catch {
        throw Object.assign(fail("动态回执无效", 502), { uncertain: true });
      }
      if (result.code !== 0)
        throw Object.assign(fail(`动态发布被拒绝（${result.code}）`, 502), {
          risk: [-412, -352, -509].includes(result.code),
        });
      const id = result.data?.dyn_id_str || result.data?.dyn_id;
      if (!id)
        throw Object.assign(fail("动态缺少编号，结果待核对", 502), {
          uncertain: true,
        });
      return { status: "sent", messageId: String(id) };
    },
    async dmHistory(self, target, signal) {
      const data = await call(
        "api.vc.bilibili.com",
        "/svr_sync/v1/svr_sync/fetch_session_msgs",
        {
          talker_id: target,
          sender_uid: self,
          session_type: 1,
          size: 30,
          mobi_app: "web",
          build: 0,
        },
        undefined,
        signal,
      );
      return (data?.messages || []).map((m) => {
        let text = "";
        try {
          text = String(JSON.parse(m.content).content || "");
        } catch {
          text = String(m.content || "");
        }
        return {
          messageId: String(m.msg_key || m.msg_seqno || ""),
          userId: String(m.sender_uid),
          text,
          time: Number(m.timestamp),
          type: "dm",
          target,
        };
      });
    },
    async commentFeed(signal) {
      const out = [];
      for (const kind of ["reply", "at"]) {
        const data = await call(
          "api.bilibili.com",
          `/x/msgfeed/${kind}`,
          { platform: "web", build: 0, mobi_app: "web" },
          undefined,
          signal,
        );
        for (const item of (data?.items || []).slice(0, 20)) {
          const meta = item.item || {},
            type = Number(meta.business_id),
            oid =
              /(?:t\.bilibili\.com|bilibili\.com\/opus)\/(\d+)/.exec(
                meta.uri || "",
              )?.[1] || String(meta.subject_id || "");
          if (![1, 11, 17].includes(type) || !/^\d+$/.test(oid)) continue;
          const root = String(meta.root_id || meta.source_id || ""),
            parent = String(meta.source_id || ""),
            mid = String(item.user?.mid || "");
          if (!/^\d+$/.test(root) || !/^\d+$/.test(parent)) continue;
          const detail = await call(
            "api.bilibili.com",
            "/x/v2/reply/reply",
            { type, oid, root, ps: 20, pn: 1 },
            undefined,
            signal,
          );
          const match = [
            ...(detail?.replies || []),
            ...(detail?.root ? [detail.root] : []),
          ]
            .filter(
              (r) =>
                String(r.mid) === mid &&
                (String(r.parent) === parent || String(r.rpid) === parent),
            )
            .sort((a, b) => Number(b.ctime) - Number(a.ctime))[0];
          if (!match?.content?.message) continue;
          out.push({
            messageId: String(match.rpid),
            userId: mid,
            senderName: String(item.user?.nickname || ""),
            text: String(match.content.message),
            time: Number(match.ctime),
            type: "comment",
            target: `${type}:${oid}:${root}`,
            comment: { type, oid, root, parent: String(match.rpid) },
          });
        }
      }
      return out;
    },
    async liveHistory(room, signal) {
      const data = await call(
        "api.live.bilibili.com",
        "/xlive/web-room/v1/dM/gethistory",
        { roomid: room, room_type: 0 },
        undefined,
        signal,
      );
      return (data?.room || []).map((m) => ({
        messageId: crypto
          .createHash("sha256")
          .update(`${room}:${m.uid}:${m.timeline}:${m.text}`)
          .digest("hex"),
        userId: String(m.uid),
        senderName: String(m.nickname || ""),
        text: String(m.text || ""),
        time: Math.floor(
          new Date(String(m.timeline).replace(" ", "T") + "+08:00").getTime() /
            1000,
        ),
        type: "live",
        target: room,
      }));
    },
    async send(self, message, text, signal) {
      let data, id;
      if (message.type === "dm") {
        data = await call(
          "api.vc.bilibili.com",
          "/web_im/v1/web_im/send_msg",
          {},
          {
            "msg[sender_uid]": self,
            "msg[receiver_id]": message.userId,
            "msg[receiver_type]": "1",
            "msg[msg_type]": "1",
            "msg[msg_status]": "0",
            "msg[content]": JSON.stringify({ content: text }),
            "msg[timestamp]": String(Math.floor(Date.now() / 1000)),
            "msg[dev_id]": crypto.randomUUID(),
            build: "0",
            mobi_app: "web",
          },
          signal,
        );
        id = data?.msg_key;
      } else if (message.type === "comment") {
        data = await call(
          "api.bilibili.com",
          "/x/v2/reply/add",
          {},
          { ...message.comment, message: text, plat: "1" },
          signal,
        );
        id = data?.rpid || data?.reply?.rpid;
      } else {
        data = await call(
          "api.live.bilibili.com",
          "/msg/send",
          {},
          {
            roomid: message.target,
            msg: text,
            color: "16777215",
            fontsize: "25",
            mode: "1",
            rnd: String(Math.floor(Date.now() / 1000)),
          },
          signal,
        );
      }
      return {
        status: id ? "sent" : "accepted",
        messageId: id ? String(id) : null,
        deliveryVerified: !!id,
      };
    },
  };
}
