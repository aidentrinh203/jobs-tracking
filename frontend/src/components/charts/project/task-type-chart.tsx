// components/charts/project/task-type-chart.tsx
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";
import {
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { ChartWrapper } from "../chart-wrapper";
import { useTranslation } from "react-i18next";

const chartConfig = {
  STORY: { label: "BIM Modeling", color: "#10B981" },
  TASK: { label: "Drafting", color: "#3B82F6" },
  BUG: { label: "Truss Design", color: "#F59E0B" },
  EPIC: { label: "Takeoff Estimating", color: "#8B5CF6" },
  SUBTASK: { label: "Revision", color: "#EF4444" },
};

interface TaskTypeChartProps {
  data: Array<{ type: string; _count: { type: number } }>;
}

export function TaskTypeChart({ data }: TaskTypeChartProps) {
  const { t } = useTranslation(["analytics"]);
  const safeData = Array.isArray(data) ? data : [];
  
  const translatedConfig = {
    STORY: { label: chartConfig.STORY.label, color: chartConfig.STORY.color },
    TASK: { label: chartConfig.TASK.label, color: chartConfig.TASK.color },
    BUG: { label: chartConfig.BUG.label, color: chartConfig.BUG.color },
    EPIC: { label: chartConfig.EPIC.label, color: chartConfig.EPIC.color },
    SUBTASK: { label: chartConfig.SUBTASK.label, color: chartConfig.SUBTASK.color },
  };

  const chartData = safeData.map((item) => ({
    name: translatedConfig[item.type as keyof typeof translatedConfig]?.label || item.type,
    value: item._count.type,
    color: translatedConfig[item.type as keyof typeof translatedConfig]?.color || "#8B5CF6",
  }));

  const typeOrder = ["STORY", "TASK", "BUG", "EPIC", "SUBTASK"];
  const sortedChartData =
    chartData &&
    [...chartData].sort((a, b) => {
      return typeOrder.indexOf(a.name.toUpperCase()) - typeOrder.indexOf(b.name.toUpperCase());
    });

  return (
    <ChartWrapper
      title={t("charts.task_type_distribution.title")}
      description={t("charts.task_type_distribution.description")}
      config={translatedConfig}
      className="border-[var(--border)]"
    >
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={sortedChartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          barSize={40}
        >
          <XAxis dataKey="name" tickLine={true} axisLine={true} tick={{ fontSize: 12 }} />
          <YAxis tickLine={true} axisLine={true} tick={{ fontSize: 12 }} allowDecimals={false} />
          <ChartTooltip
            content={
              <ChartTooltipContent hideLabel={true} className="bg-[var(--accent)] border-0" />
            }
            cursor={{ fill: "rgba(0, 0, 0, 0.00)" }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {sortedChartData?.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
          <ChartLegend content={<ChartLegendContent />} />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}
