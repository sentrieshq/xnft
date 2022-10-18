import { View, Text, Loading } from "react-xnft";
import { SentriesStakingData } from "../hooks/usePower";
import { theme } from "../utils/theme";

type StakedProps = Partial<
  Pick<SentriesStakingData, "nftCount" | "totalStaked" | "maxPowerLevelSol">
> & {
  isLoading: boolean;
};

export function Staked(props: StakedProps) {
  const { nftCount, totalStaked, maxPowerLevelSol, isLoading } = props;

  return isLoading ? (
    <Loading />
  ) : (
    <View style={{ lineHeight: "1.7" }}>
      <Text
        style={{
          marginTop: "-0.3em",
          fontSize: "2.65rem",
          fontWeight: "800",
        }}
      >
        {totalStaked} SOL
      </Text>
      <Text
        style={{
          color: theme.mutedText,
          marginTop: "-0.3em",
          fontSize: "1rem",
        }}
      >
        Staked with the Lode
      </Text>
      <Text
        style={{
          fontSize: "0.8rem",
          marginTop: "0.4em",
          color: theme.mutedText2,
        }}
      >
        {maxPowerLevelSol} ◎ to power up the {nftCount} Sentries NFTs
      </Text>
    </View>
  );
}
