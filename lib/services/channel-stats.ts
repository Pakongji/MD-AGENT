import type { DashboardData } from "@/lib/types/domain";
import { CHANNEL_SAMPLES, type Channel } from "@/lib/mock/samples";

export type ChannelRow = { channel: string; share: number; revenue: number | null; changeRate: number; conversionRate: number | null; note: string; alert: boolean; sample: boolean };

/** 업로드한 매출 원장이 있으면 실데이터 채널 집계, 없으면 샘플 비중입니다. */
export function channelRows(data: Pick<DashboardData, "channelStats">): ChannelRow[] {
  if (data.channelStats?.length) {
    return data.channelStats.map((row) => ({
      channel: row.channel, share: row.share, revenue: row.revenue, changeRate: row.changeRate, conversionRate: null,
      note: row.previousRevenue === 0 ? "직전 기간 자료 없음" : row.changeRate <= -10 ? "직전 기간보다 크게 줄었어요" : "",
      alert: row.previousRevenue > 0 && row.changeRate <= -10, sample: false,
    }));
  }
  return CHANNEL_SAMPLES.map((row) => ({ channel: row.channel, share: row.share, revenue: null, changeRate: row.changeRate, conversionRate: row.conversionRate, note: row.note, alert: Boolean(row.alert), sample: true }));
}

export function channelShareFrom(rows: ChannelRow[], channel: Channel | string) {
  if (channel === "전체") return 1;
  return rows.find((row) => row.channel === channel)?.share ?? 0;
}

/** 어떤 데이터가 업로드로 연결됐는지(업로드 이력 기준) */
export function connectedKinds(data: Pick<DashboardData, "dataImports">) {
  return [...new Set((data.dataImports ?? []).map((item) => item.kind))];
}
