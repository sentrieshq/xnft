import { View, Text } from "react-xnft";
import { Metric } from "../common/Metric";
import { ProgressBar } from "../common/Progress";
import { SentriesDetailsData } from "../hooks/useSentries";
import { MAX_SENTRIES } from "../utils/constants";
import { theme } from "../utils/theme";
import {
  calculatePercentage,
  formatUSD,
  formatNumber,
  valueOrDefault,
} from "../utils/utils";

type StatsProps = Partial<
  Pick<
    SentriesDetailsData,
    "poweredSentries" | "stakedSentries" | "solPrice" | "floorPrice"
  >
>;

export function Stats(props: StatsProps) {
  const floorPrice = valueOrDefault(props.floorPrice, 0);
  const stakedSentries = valueOrDefault(props.stakedSentries, 0);
  const solPrice = valueOrDefault(props.solPrice, 0);
  const poweredSentries = valueOrDefault(props.poweredSentries, 0);

  const currentValueLocked = floorPrice * stakedSentries * solPrice;

  const stakedSentriesPct = calculatePercentage(stakedSentries, MAX_SENTRIES);
  const poweredUpSentriesPct = calculatePercentage(
    poweredSentries,
    MAX_SENTRIES
  );

  return (
    <View
      style={{
        padding: theme.containerPadding,
        paddingLeft: 0,
        paddingRight: 0,
      }}
    >
      <View
        style={{
          width: "100%",
          display: "grid",
          gridColumnGap: "0.5em",
          gridRowGap: "1.8em",
          gridTemplateColumns: "repeat(2, 1fr)",
          gridTemplateRows: "repeat(2, 1fr)",
        }}
      >
        <Metric
          title={`
            ${formatNumber(stakedSentries)} (${stakedSentriesPct})
          `}
          subtitle="Total Sentries Staked"
        >
          <ProgressBar
            value={parseFloat(stakedSentriesPct)}
            color={theme.brand}
          />
        </Metric>
        <Metric
          title={`
            ${formatNumber(poweredSentries)} (${poweredUpSentriesPct})
          `}
          subtitle="Powered Up Sentries"
        >
          <ProgressBar
            value={parseFloat(poweredUpSentriesPct)}
            color={theme.blue}
          />
        </Metric>
        <Metric
          title={formatUSD(currentValueLocked) as string}
          subtitle="Total Value Locked"
        >
          <ProgressBar
            value={parseFloat(stakedSentriesPct)}
            color={theme.accent}
          />
        </Metric>
      </View>
    </View>
  );
}
