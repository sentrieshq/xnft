import { View, Text } from "react-xnft";
import { Label, LabelProps } from "../common/Label";
import { Layout } from "../common/Layout";
import { Metric } from "../common/Metric";
import { Staked } from "../features/Staked";
import { Stats } from "../features/Stats";
import { useAddress } from "../hooks/useAddress";
import { usePower } from "../hooks/usePower";
import { useSentries } from "../hooks/useSentries";
import { useValidator } from "../hooks/useValidator";
import { MAX_SENTRIES } from "../utils/constants";
import { theme } from "../utils/theme";
import {
  formatNumber,
  formatUSD,
  truncateString,
  valueOrDefault,
} from "../utils/utils";

type AddressPillProps = {
  address: string;
  variant?: LabelProps["variant"];
};

export function Overview() {
  const power = usePower();
  const sentries = useSentries();
  const validator = useValidator();
  const currentWalletAddress = useAddress();

  const floorPrice = valueOrDefault(sentries.data?.floorPrice, 0);
  const solPrice = valueOrDefault(sentries.data?.solPrice, 0);
  const marketCap = floorPrice * MAX_SENTRIES * solPrice;

  return (
    <Layout>
      <View
        style={{
          padding: theme.containerPadding,
          paddingTop: 0,
        }}
      >
        <View
          style={{
            paddingBottom: "1.2em",
          }}
        >
          <AddressPill address={currentWalletAddress} variant="accent" />
        </View>
        <Text
          style={{
            fontWeight: "bold",
            fontSize: "1.2rem",
          }}
        >
          The Power Grid
        </Text>
        <Text
          style={{
            color: theme.mutedText,
            fontSize: "0.8rem",
          }}
        >
          Stake your Sentries, and power it up by locking SOL in our validator,
          The Lode
        </Text>
        <View
          style={{
            display: "grid",
            width: "100%",
            gap: "0.5em",
            gridTemplateColumns: "repeat(2, 1fr)",
            marginTop: "1.2em",
          }}
        >
          <Metric
            title={
              formatNumber(validator.data?.totalSolStaked as number, true) + "◎"
            }
            subtitle="Total Stake Value"
          />
          <Metric
            title={formatUSD(marketCap)}
            subtitle="Total Sentries Market Cap"
          />
        </View>
      </View>
      <View
        style={{
          backgroundColor: theme.bgLight,
          padding: theme.containerPadding,
        }}
      >
        <Staked
          isLoading={!power.data && !power.error}
          nftCount={power.data?.nftCount}
          totalStaked={power.data?.totalStaked}
          maxPowerLevelSol={power.data?.maxPowerLevelSol}
        />
        <Stats
          poweredSentries={sentries.data?.poweredSentries}
          stakedSentries={sentries.data?.stakedSentries}
          solPrice={sentries.data?.solPrice}
          floorPrice={sentries.data?.floorPrice}
        />
      </View>
    </Layout>
  );
}

function AddressPill(props: AddressPillProps) {
  const { address, variant = "brand" } = props;
  const truncatedAddress = truncateString(address, 6);

  return <Label variant={variant}>{truncatedAddress}</Label>;
}
