// 宿主在渲染前要求结果可以无损表示为JSON；可选属性缺省时应省略。
export function jsonResult(value) {
  if (value && typeof value.then === "function") return value.then(jsonResult);
  if (value === undefined) return null;
  return JSON.parse(JSON.stringify(value));
}
