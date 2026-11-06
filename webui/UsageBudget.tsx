import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useResource, type PageProps } from "./main";
import { Badge } from "./components";
type Usage = {
  tokens: number;
  estimatedCostCNY: number;
  missingUsage: number;
  requests: number;
};
export function UsageBudget(props: PageProps) {
  const [revision, setRevision] = useState(0);
  const { data, error } = useResource<Usage>(
    `/api/characters/${props.character.id}/usage`,
    props.version + revision,
  );
  return (
    <div className="usage-budget">
      <div className="usage-facts" aria-live="polite">
        <div>
          <small>近 24 小时令牌</small>
          <strong>{data?.tokens.toLocaleString("zh-CN") ?? "—"}</strong>
        </div>
        <div>
          <small>按当前记账单价估算</small>
          <strong>
            {data ? `¥ ${data.estimatedCostCNY.toFixed(4)}` : "—"}
          </strong>
        </div>
        <div>
          <small>灵枢回响</small>
          <strong>{data?.requests.toLocaleString("zh-CN") ?? "—"}</strong>
        </div>
      </div>
      {data?.missingUsage ? (
        <p className="inline-error">
          其中 {data.missingUsage}{" "}
          次响应未报告完整用量；上方数值不能覆盖这些消耗
        </p>
      ) : null}
      {error && (
        <p role="alert" className="inline-error">
          {error}
        </p>
      )}
      <div className="form-footer">
        <Badge>
          {props.character.config["chat.budget.enabled"]
            ? "额度检查已启用"
            : "仅记录用量"}
        </Badge>
        <button
          type="button"
          className="ghost"
          onClick={() => setRevision((v) => v + 1)}
        >
          <RefreshCw size={14} />
          重数星筹
        </button>
      </div>
      <p className="footnote">
        统计覆盖本角色的 Starr-chat、日记与
        B站活动会话；缺失报告会单独提示。金额按记录时的配置单价估算，与服务商账单可能有差异
      </p>
    </div>
  );
}
