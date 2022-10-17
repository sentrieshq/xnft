import { Text } from "react-xnft";
import { theme } from "../utils/theme";

type LabelProps = {
  children: React.ReactNode;
  variant: "brand" | "accent";
};

export function Label(props: LabelProps) {
  const { children, variant = "brand" } = props;

  const brandCSS = {
    color: theme.brand,
  };

  const accentCSS = {
    color: theme.accent,
  };

  const styles: Record<
    LabelProps["variant"],
    typeof brandCSS | typeof accentCSS
  > = {
    brand: brandCSS,
    accent: accentCSS,
  };

  return (
    <Text
      style={{
        fontSize: "0.7rem",
        borderRadius: "999px",
        padding: "0.4em 0.8em",
        border: "1px solid currentColor",
        display: "inline-block",
        cursor: "default",
        ...styles[variant],
      }}
    >
      {children}
    </Text>
  );
}
