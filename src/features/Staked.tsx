import { View, Text, Loading } from "react-xnft";
import { SentriesStakingData } from "../hooks/usePower";
import { theme } from "../utils/theme";
import { formatNumber } from "../utils/utils";

type StakedProps = Partial<
  Pick<SentriesStakingData, "nftCount" | "totalStaked" | "maxPowerLevelSol">
> & {
  isLoading: boolean;
};

export function Staked(props: StakedProps) {
  const { totalStaked, isLoading } = props;

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
        {formatNumber(totalStaked)} SOL
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
    </View>
  );
}
