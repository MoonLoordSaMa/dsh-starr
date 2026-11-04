// 状态只调节表达建议与已开启的停顿，不替代人设，也不伪装成人类生理。
export function expressionBehavior(state) {
  const emotions = state.organism?.emotions || [];
  const urgent = emotions.some(
    (e) => /急|兴奋|期待|焦急/.test(e.name) && e.intensity >= 55,
  );
  const tired = state.energy < 30;
  const tense = state.tension > 65;
  return {
    pace: tired ? 1.55 : urgent ? 0.6 : tense ? 1.2 : 1,
    guidance: [
      tired
        ? "精力偏低：说短一点，允许停顿，不强撑热闹"
        : urgent
          ? "此刻急切：短句可以更快一点，但先听清对方"
          : "按话题自然回应，别固定套用同一种语气",
      tense
        ? "紧张时少用连续追问，先回应一个具体细节"
        : "有自己的感受与小偏好，也允许不同意；不要把每句话变成任务汇报",
      "只有需要时分条；无新增信息、无需回应时可安静。未完事项在下次有关时自然接续，不重复催问",
    ].join("；"),
  };
}
export function replyDelay(
  config,
  state,
  length,
  position = 0,
  random = Math.random,
) {
  const base =
    config["chat.reply.delayMinMs"] +
    random() *
      (config["chat.reply.delayMaxMs"] - config["chat.reply.delayMinMs"]) +
    length * config["chat.reply.perCharMs"] +
    (position && random() < config["chat.reply.longPauseChance"]
      ? config["chat.reply.longPauseMs"]
      : 0);
  return Math.max(
    0,
    Math.min(
      config["chat.reply.maxDelayMs"],
      Math.round(
        base *
          (config["chat.reply.statePacing"]
            ? expressionBehavior(state).pace
            : 1),
      ),
    ),
  );
}
