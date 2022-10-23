import { View, Image } from "react-xnft";
import { theme } from "../utils/theme";

type LayoutProps = {
  children: React.ReactNode;
  hideBg?: boolean;
};

export function Layout(props: LayoutProps) {
  const { children, hideBg = false } = props;

  const bg = hideBg
    ? {}
    : {
        backgroundImage:
          "url(https://res.cloudinary.com/aukaco/image/upload/v1665861224/bg_wwsoix.png)",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "top center",
      };

  return (
    <View
      style={{
        ...bg,
        color: "white",
        height: "100%",
      }}
    >
      <View
        style={{
          padding: theme.containerPadding,
          paddingTop: "0.5em",
          paddingBottom: 0,
        }}
      >
        <Image
          style={{
            marginLeft: "-10px",
          }}
          src="https://res.cloudinary.com/aukaco/image/upload/v1665917235/logo_bv6uam.png"
        />
      </View>
      <View>{children}</View>
    </View>
  );
}
