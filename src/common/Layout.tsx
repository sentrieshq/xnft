import { View, Image, Loading, ScrollBar } from "react-xnft";
import { theme } from "../utils/theme";

type LayoutProps = {
  children: React.ReactNode;
  hideBg?: boolean;
  isLoading?: boolean;
};

export function Layout(props: LayoutProps) {
  const { children, hideBg = false, isLoading = false } = props;

  if (isLoading) {
    return (
      <View
        style={{
          width: "100%",
          height: "calc(100vh - 7em)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: theme.bg,
        }}
      >
        <Loading />
      </View>
    );
  }

  const bg = hideBg
    ? {}
    : {
        backgroundImage:
          "url(https://res.cloudinary.com/aukaco/image/upload/v1665861224/bg_wwsoix.png)",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "top center",
      };

  return (
    <ScrollBar>
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
              maxWidth: "128px",
            }}
            src="https://res.cloudinary.com/aukaco/image/upload/v1665917235/logo_bv6uam.png"
          />
        </View>
        <View>{children}</View>
      </View>
    </ScrollBar>
  );
}
