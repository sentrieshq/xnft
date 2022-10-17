import { View, Image, Text } from "react-xnft";
import { useAddress } from "../hooks/useAddress";
import { truncateString } from "../utils/utils";
import { Label } from "./Label";

type LayoutProps = {
  children: React.ReactNode;
  hideBg?: boolean;
};

type AddressPillProps = {
  address: string;
};

export function Layout(props: LayoutProps) {
  const { children, hideBg = false } = props;
  const currentWalletAddress = useAddress();

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
        padding: "1.5em",
        color: "white",
        height: "100%",
      }}
    >
      <View>
        <Image
          style={{
            marginLeft: "-10px",
          }}
          src="https://res.cloudinary.com/aukaco/image/upload/v1665917235/logo_bv6uam.png"
        />
      </View>
      <AddressPill address={currentWalletAddress} />
      <View
        style={{
          marginTop: "0.8em",
        }}
      >
        {children}
      </View>
    </View>
  );
}

function AddressPill(props: AddressPillProps) {
  const { address } = props;
  const truncatedAddress = truncateString(address, 6);

  return <Label variant="brand">{truncatedAddress}</Label>;
}
