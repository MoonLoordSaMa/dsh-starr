import path from "node:path";
import crypto from "node:crypto";

export const noteCategories = {
  moment: "笔记",
  person: "笔记",
  promise: "笔记",
  interest: "笔记",
  diary: "05-日记",
  summary: "笔记",
  self: "笔记",
};
export function safeName(value, fallback = "未命名", length = 60) {
  const text = String(value || "")
    .normalize("NFC")
    .replace(/[<>:"/\\|?*\x00-\x1f#^\[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, length)
    .replace(/[. ]+$/, "");
  return !text || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(text)
    ? fallback
    : text;
}
export function relativePath(value) {
  const normalized = String(value || "").replaceAll("\\", "/");
  if (
    !normalized ||
    path.isAbsolute(normalized) ||
    /^[a-z]:/i.test(normalized) ||
    normalized
      .split("/")
      .some(
        (part) =>
          !part || part === "." || part === ".." || /[:\x00-\x1f]/.test(part),
      )
  )
    throw Object.assign(new Error("笔记目录映射无效"), { status: 409 });
  return normalized;
}
export function readableNotePath(record) {
  const date =
    /^\d{4}-\d{2}-\d{2}/.exec(String(record.created))?.[0] || "未标日期";
  const suffix = crypto
    .createHash("sha256")
    .update(String(record.id))
    .digest("hex")
    .slice(0, 12);
  const title = safeName(record.title);
  const prefix = /^\d{4}(?:[-年]\d{1,2}|[- ]?W\d{1,2}|年|$)/.test(title)
    ? ""
    : `${date} - `;
  return `${noteCategories[record.kind] || "笔记"}/${prefix}${title} - ${suffix}.md`;
}
export function characterFolder(installation, characterId) {
  return relativePath(
    installation.vaultLayout?.characters?.[characterId] || characterId,
  );
}
export function characterRoot(installation, characterId) {
  return path.join(
    installation.memoryRoot,
    characterFolder(installation, characterId),
  );
}
export function notesRoot(installation, characterId) {
  return path.join(
    characterRoot(installation, characterId),
    installation.vaultLayout?.format === 2 ? "记忆笔记" : "notes",
  );
}
export function attachmentsRoot(installation, characterId) {
  return path.join(
    characterRoot(installation, characterId),
    installation.vaultLayout?.format === 2 ? "附件资料" : "attachments",
  );
}
