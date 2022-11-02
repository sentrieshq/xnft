import { View, Text, Button } from "react-xnft";
import { SentryData } from "../typings/tokenMetadata";
import { theme } from "../utils/theme";

export type ActiveFilter = "all" | "staked" | "unstaked";

type StakeFilterProps = {
  sentries: SentryData[];
  filters: ActiveFilter[];
  activeFilter: ActiveFilter;
  onClick: (filter: ActiveFilter) => void;
};

export function StakeFilter(props: StakeFilterProps) {
  const { sentries, filters, activeFilter, onClick } = props;
  const stakeStatus = getStakedAndUnstakedTokens(sentries);

  return (
    <View
      style={{
        backgroundColor: theme.bg,
        padding: theme.containerPadding,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Text
        style={{
          color: theme.mutedText,
          fontSize: "0.75rem",
        }}
      >
        Staked {stakeStatus.staked}/{sentries.length}
      </Text>
      <View
        style={{
          display: "flex",
          gap: "0.3em",
        }}
      >
        {filters.map((filter) => (
          <FilterButton
            onClick={() => onClick(filter)}
            active={filter === activeFilter}
          >
            {filter}
          </FilterButton>
        ))}
      </View>
    </View>
  );
}

function FilterButton({
  active,
  children,
  onClick,
  ...rest
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  const activeCSS = {
    backgroundColor: theme.accent,
    color: "white",
  };

  return (
    <Button
      onClick={onClick}
      {...rest}
      style={{
        fontSize: "0.75rem",
        minWidth: "48px",
        width: "auto",
        padding: "0.2em 1em",
        margin: 0,
        fontWeight: "normal",
        textTransform: "capitalize",
        color: theme.mutedText,
        backgroundColor: theme.bgLight,
        ...(active ? activeCSS : {}),
      }}
    >
      {children}
    </Button>
  );
}

function getStakedAndUnstakedTokens(tokens: SentryData[]): {
  staked: number;
  unstaked: number;
} {
  const stakeStatus = { staked: 0, unstaked: 0 };

  tokens.forEach((sentry) => {
    if (sentry.staked) {
      stakeStatus.staked = stakeStatus.staked + 1;
    } else {
      stakeStatus.unstaked = stakeStatus.unstaked + 1;
    }
  });

  return stakeStatus;
}
