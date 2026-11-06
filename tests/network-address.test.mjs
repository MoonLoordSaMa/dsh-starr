import test from "node:test";
import assert from "node:assert/strict";
import {
  isPublicAddress,
  hasOnlyPublicAddresses,
} from "../src/runtime/network.mjs";
import { downloadBiliMedia } from "../src/bili/media.mjs";
import { downloadNeteaseMedia } from "../src/media/netease.mjs";

test("网络地址校验允许公网IPv4和IPv6并拒绝本地、私有、保留地址", () => {
  for (const address of [
    "1.1.1.1",
    "123.58.180.105",
    "2001:4860:4860::8888",
    "2606:4700:4700::1111",
  ])
    assert.equal(isPublicAddress(address), true, address);

  for (const address of [
    "0.1.2.3",
    "10.0.0.1",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.1.1",
    "172.16.0.1",
    "192.0.2.1",
    "192.168.1.1",
    "198.18.0.1",
    "203.0.113.1",
    "224.0.0.1",
    "240.0.0.1",
    "::",
    "::1",
    "fc00::1",
    "fe80::1",
    "ff02::1",
    "2001:db8::1",
    "2002::1",
    "3fff::1",
    "not-an-ip",
  ])
    assert.equal(isPublicAddress(address), false, address);

  assert.equal(hasOnlyPublicAddresses([]), false);
  assert.equal(
    hasOnlyPublicAddresses([
      { address: "1.1.1.1" },
      { address: "2001:4860:4860::8888" },
    ]),
    true,
  );
  assert.equal(
    hasOnlyPublicAddresses([
      { address: "1.1.1.1" },
      { address: "192.168.1.1" },
    ]),
    false,
  );
});

test("网易云和B站媒体下载均允许经验证的公网IPv6地址", async () => {
  const publicIPv6 = "2001:4860:4860::8888";
  let requests = 0;
  const request = async (_url, options) => {
    requests++;
    assert.equal(options.redirect, "error");
    return new Response(Buffer.from("audio"));
  };
  const lookup = async (_hostname, options) => {
    assert.equal(options.all, true);
    return [{ address: publicIPv6, family: 6 }];
  };

  assert.deepEqual(
    await downloadNeteaseMedia("https://m801.music.126.net/a", {
      request,
      lookup,
    }),
    Buffer.from("audio"),
  );
  assert.deepEqual(
    await downloadBiliMedia("https://upos-sz-mirrorcoso1.bilivideo.com/a", {
      request,
      lookup,
    }),
    Buffer.from("audio"),
  );
  assert.equal(requests, 2);
});

test("网易云和B站仍拒绝解析到本地地址的媒体域名", async () => {
  let requests = 0;
  const request = async () => {
    requests++;
    return new Response(Buffer.from("must not fetch"));
  };
  const lookup = async () => [
    { address: "2001:4860:4860::8888", family: 6 },
    { address: "10.0.0.8", family: 4 },
  ];

  await assert.rejects(
    downloadNeteaseMedia("https://m801.music.126.net/a", { request, lookup }),
    /网络/,
  );
  await assert.rejects(
    downloadBiliMedia("https://upos-sz-mirrorcoso1.bilivideo.com/a", {
      request,
      lookup,
    }),
    /网络/,
  );
  assert.equal(requests, 0);
});
