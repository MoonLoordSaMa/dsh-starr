import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { lyricChorus, chooseSegment } from "../src/media/segments.mjs";
import { MusicCatalog } from "../src/media/music.mjs";
import { Singing } from "../src/media/singing.mjs";
import { StarrStore } from "../src/starrcore/store.mjs";
import { audioClip } from "../src/media/process.mjs";

const lyrics =
  "[00:00]作词：合成验收\n[00:10]这一句仅仅出现一次\n[00:30]合成星光第一句\n[00:35]合成星光第二句\n[01:30]合成星光第一句\n[01:35]合成星光第二句";
test("优先定位重复歌词副歌候选，区分标题线索、手动、开头与未定位回退", () => {
  assert.equal(lyricChorus(lyrics, 180).startSeconds, 28.5);
  assert.equal(
    chooseSegment({ lyrics, duration: 180 }).method,
    "lyrics-repeat",
  );
  assert.equal(chooseSegment({ title: "星光 副歌剪辑" }).method, "title-hint");
  assert.equal(chooseSegment({ lyrics, startSeconds: 60 }).startSeconds, 60);
  assert.equal(chooseSegment({ lyrics, segment: "opening" }).startSeconds, 0);
  assert.equal(
    chooseSegment({ lyrics: "[00:20]只有一句未重复的合成歌词" }).method,
    "fallback",
  );
  assert.equal(
    lyricChorus("[99:99]错误时间\n[00:01]作曲：合成\n[00:50]作曲：合成"),
    null,
  );
  assert.throws(() => chooseSegment({ startSeconds: -1 }), /起点/);
  assert.throws(
    () => chooseSegment({ startSeconds: 181, duration: 180 }),
    /时长/,
  );
});

test("B站默认先查高潮剪辑，无结果才回退；网易云从定位起点入库并持久保留依据", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-segment-")),
    store = new StarrStore(path.join(root, "runtime"));
  const { character } = store.setup({
    name: "合成片段角色",
    memoryRoot: path.join(root, "memory"),
    backupRoot: path.join(root, "backup"),
  });
  const singing = new Singing(store),
    queries = [],
    selected = [];
  const wav = Buffer.from("RIFF0000WAVEsynthetic");
  const music = new MusicCatalog(store, {
    singing,
    bili: {
      operations: {
        read: async (_id, input) => {
          queries.push(input.q);
          return input.q.endsWith("高潮")
            ? []
            : [{ bvid: "BV1d4411N7zD", title: "合成歌曲", author: "合成歌手" }];
        },
      },
    },
    netease: {
      audio: async (id) => ({
        id,
        title: "合成歌曲",
        artists: [],
        duration: 180,
        url: "https://m1.music.126.net/synthetic",
      }),
      lyrics: async () => lyrics,
    },
    download: async () => wav,
    clip: async (_config, bytes, options) => {
      selected.push(options.startSeconds);
      return bytes;
    },
  });
  t.after(() => {
    music.close();
    singing.close();
    store.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  const result = await music.search(character.id, {
    q: "合成歌曲",
    platform: "bili",
  });
  assert.deepEqual(queries, ["合成歌曲 高潮", "合成歌曲"]);
  assert.equal(result.segmentPreference, "chorus");
  const song = await music.source(character.id, {
    platform: "netease",
    id: "123",
  });
  assert.equal(song.segment.startSeconds, 28.5);
  assert.deepEqual(selected, [28.5]);
  assert.equal(
    singing.list(character.id).songs[0].segment.method,
    "lyrics-repeat",
  );
  const reopened = new StarrStore(store.dataRoot);
  try {
    assert.equal(
      new Singing(reopened).list(character.id).songs[0].segment.startSeconds,
      28.5,
    );
  } finally {
    reopened.close();
  }
});

test("FFmpeg按实际起点截取，后半段音频不会仍从开头取样", async () => {
  const rate = 8000,
    wav = Buffer.alloc(44 + rate * 4 * 2);
  wav.write("RIFF");
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(wav.length - 44, 40);
  for (let i = rate * 2; i < rate * 4; i++) wav.writeInt16LE(1000, 44 + i * 2);
  const opening = await audioClip({}, wav, { seconds: 1, startSeconds: 0 }),
    later = await audioClip({}, wav, { seconds: 1, startSeconds: 2.5 });
  const sample = (bytes) =>
    bytes.readInt16LE(bytes.indexOf(Buffer.from("data")) + 8 + 1000);
  assert.equal(sample(opening), 0);
  assert.ok(sample(later) > 900);
});
