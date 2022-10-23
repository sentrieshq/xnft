import { View, Text } from "react-xnft";
import { theme } from "../utils/theme";

type ProgressBarProps = {
  color: string;
  value: number;
};

export function ProgressBar(props: ProgressBarProps) {
  const { color, value } = props;

  const commonCSS = {
    height: "4px",
    borderRadius: "100px",
    position: "absolute",
    top: 0,
  };

  return (
    <View
      style={{
        position: "relative",
        width: "85%",
      }}
    >
      <View
        style={{
          ...commonCSS,
          width: value,
          backgroundColor: color,
          zIndex: 20,
        }}
      />
      <View
        style={{
          ...commonCSS,
          width: "100%",
          backgroundColor: theme.mutedText,
          zIndex: 10,
          opacity: 0.2,
        }}
      />
    </View>
  );
}
