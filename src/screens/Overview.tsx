import { View, Text } from "react-xnft";
import { Layout } from "../common/Layout";
import { Staked } from "../features/Staked";
import { Stats } from "../features/Stats";
import { usePower } from "../hooks/usePower";
import { useSentries } from "../hooks/useSentries";
import { theme } from "../utils/theme";

export function Overview() {
  const power = usePower();
  const sentries = useSentries();

  return (
    <Layout>
      <View
        style={{
          padding: theme.containerPadding,
          paddingTop: 0,
        }}
      >
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
          }}
        >
          Stake your Sentries, and power it up by locking SOL in our validator,
          The Lode
        </Text>
      </View>
      <View
        style={{
          backgroundColor: theme.bgLight,
          padding: theme.containerPadding,
        }}
      >
        <Staked
          isLoading={power.isLoading}
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
