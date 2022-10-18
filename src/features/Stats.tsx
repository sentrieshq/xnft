import React from "react";
import { View, Text } from "react-xnft";
import { SentriesDetailsData } from "../hooks/useSentries";
import { MAX_SENTRIES } from "../utils/constants";
import { theme } from "../utils/theme";
import {
  calculatePercentage,
  formatNumberToK,
  formatNumberToLocale,
  valueOrDefault,
} from "../utils/utils";

type StatsProps = Partial<
  Pick<
    SentriesDetailsData,
    "poweredSentries" | "stakedSentries" | "solPrice" | "floorPrice"
  >
>;

type ProgressBarProps = {
  color: string;
  value: number;
};

export function Stats(props: StatsProps) {
  const floorPrice = valueOrDefault(props.floorPrice, 0);
  const stakedSentries = valueOrDefault(props.stakedSentries, 0);
  const solPrice = valueOrDefault(props.solPrice, 0);
  const poweredSentries = valueOrDefault(props.poweredSentries, 0);

  const currentValueLocked = floorPrice * stakedSentries * solPrice;
  const marketCap = floorPrice * MAX_SENTRIES * solPrice;

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
        <View>
          <Text>
            {formatNumberToLocale(stakedSentries)}
            {` `}({stakedSentriesPct})
          </Text>
          <ProgressLabel>Total Sentries Staked</ProgressLabel>
          <ProgressBar
            value={parseFloat(stakedSentriesPct)}
            color={theme.brand}
          />
        </View>
        <View>
          <Text>
            {formatNumberToLocale(poweredSentries)}
            {` `}({poweredUpSentriesPct})
          </Text>
          <ProgressLabel>Powered Up Sentries</ProgressLabel>
          <ProgressBar
            value={parseFloat(poweredUpSentriesPct)}
            color={theme.blue}
          />
        </View>
        <View>
          <Text>
            ${formatNumberToK(currentValueLocked)}
            {` `}
          </Text>
          <ProgressLabel>Total Value Locked</ProgressLabel>
          <ProgressBar
            value={parseFloat(stakedSentriesPct)}
            color={theme.accent}
          />
        </View>
      </View>
    </View>
  );
}

function ProgressBar(props: ProgressBarProps) {
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

function ProgressLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        color: theme.mutedText,
        fontSize: "0.75rem",
      }}
    >
      {children}
    </Text>
  );
}
