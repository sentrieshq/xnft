import { View, Text } from "react-xnft";
import { theme } from "../utils/theme";

type MetricProps = {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
};

export function Metric(props: MetricProps) {
  const { title, subtitle, children } = props;
  return (
    <View>
      <Text style={{ color: "white" }}>{title}</Text>
      <MetricLabel>{subtitle}</MetricLabel>
      {children ? children : null}
    </View>
  );
}

export function MetricLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        color: theme.mutedText,
        fontSize: "0.75rem",
      }}
    >
      {children}
    </Text>
  );
}
