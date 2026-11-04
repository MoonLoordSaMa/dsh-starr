// 只返回固定故障分类，不把服务端正文、凭据或本地路径回显给网页。
export function modelFailure(error) {
  const codes = [],
    messages = [],
    seen = new Set();
  const visit = (value, depth = 0) => {
    if (!value || depth > 5 || seen.has(value)) return;
    seen.add(value);
    if (typeof value.code === "string") codes.push(value.code.toUpperCase());
    if (typeof value.kind === "string") codes.push(value.kind.toUpperCase());
    if (Number.isInteger(value.status)) codes.push(`HTTP_${value.status}`);
    if (Number.isInteger(value.statusCode))
      codes.push(`HTTP_${value.statusCode}`);
    if (typeof value.message === "string")
      messages.push(value.message.slice(0, 2000));
    visit(value.cause, depth + 1);
    visit(value.failure, depth + 1);
  };
  visit(error);
  const code = codes.join(" "),
    detail = messages.join(" ");
  const match = (expression) =>
    expression.test(code) || expression.test(detail);
  if (match(/QUOTA|CREDIT|BALANCE|HTTP_402|余额|额度/i))
    return {
      code: "MODEL_QUOTA",
      detail: "模型额度不足，请检查DSH账号或服务商余额与额度",
    };
  if (
    match(
      /AUTH|CREDENTIAL|ACCOUNT_SIGN_IN_REQUIRED|ACCOUNT_TOKEN_INVALID|HTTP_40[13]|\b40[13]\b|LOGIN|未登录|API.?KEY.{0,12}(?:INVALID|无效)/i,
    )
  )
    return {
      code: "MODEL_AUTH",
      detail: "模型登录或凭据无效，请到DSH模型设置重新登录或核对密钥",
    };
  if (match(/RATE_LIMIT|OVERLOAD|BUSY|HTTP_429|HTTP_50[234]|SERVER|429/i))
    return {
      code: "MODEL_BUSY",
      detail: "模型服务繁忙或限流，请稍后重试；持续失败时检查DSH模型服务",
    };
  if (match(/CONTEXT_WINDOW|CONTEXT_LENGTH|上下文.{0,10}(?:超|满)/i))
    return {
      code: "MODEL_CONTEXT",
      detail: "模型上下文超过容量，请在DSH整理该会话历史或调整注入预算",
    };
  if (match(/NO_ADAPTER|MODEL_NOT_FOUND|UNKNOWN_MODEL|HTTP_404/i))
    return {
      code: "MODEL_UNAVAILABLE",
      detail: "所选服务或模型不可用，请在DSH重新选择模型",
    };
  if (match(/TIMEOUT|TIMEDOUT|TIME.?OUT|DEADLINE|ABORT|取消|超时/i))
    return {
      code: "MODEL_TIMEOUT",
      detail: "模型请求取消或超时，请检查网络后重试",
    };
  if (
    match(/TRANSPORT|NETWORK|ECONN|ENOTFOUND|EAI_AGAIN|FETCH FAILED|TLS|CERT/i)
  )
    return {
      code: "MODEL_NETWORK",
      detail: "模型网络连接失败，请检查DSH代理、网络和服务地址",
    };
  if (match(/INVALID_REQUEST|INVALID_ARGS|UNSUPPORTED|HTTP_4\d\d/i))
    return {
      code: "MODEL_REQUEST",
      detail: "模型拒绝了请求格式或当前能力，请检查所选模型是否支持工具或图片",
    };
  return {
    code: "MODEL_FAILED",
    detail: "模型回合失败，请检查DSH模型日志与连接状态",
  };
}
