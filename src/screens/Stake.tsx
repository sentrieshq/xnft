import { useState, useEffect } from "react";
import { View, Image, Text, Path, Svg, Button, Loading } from "react-xnft";
import { Layout } from "../common/Layout";
import { ActiveFilter, StakeFilter } from "../features/StakeFilter";
import { useTokens } from "../hooks/useTokens";
import { SentryData } from "../typings/tokenMetadata";
import { theme } from "../utils/theme";
import { checkUniqueStake, whichStakeType } from "../utils/utils";

type SentryRowProps = {
  tokenMetadata: SentryData;
  selected: boolean;
  onClick: (sentry: SentryData) => void;
};

export function Stake() {
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [selected, setSelected] = useState<SentryData[]>([]);
  const filters: ActiveFilter[] = ["all", "staked", "unstaked"];

  const { sentries, isLoading } = useTokens();

  useEffect(() => {
    if (selected.length) {
      setSelected([]); // Reset selection when switching filters
    }
  }, [activeFilter]);

  function handleSelection(sentry: SentryData) {
    return; // no-op / disable select on first release
    const isAlreadySelected = selected.some(
      (selectedEntry) => selectedEntry.name === sentry.name
    );

    if (isAlreadySelected) {
      setSelected((entry) =>
        entry.filter(
          (selectedToFilter) => selectedToFilter.name !== sentry.name
        )
      );

      return;
    }

    setSelected([...selected, sentry]);
  }

  const isOneOfAKind = checkUniqueStake(selected);
  const isIndeterminate = selected.length && !isOneOfAKind;
  const whichStake = whichStakeType(selected);

  return (
    <Layout hideBg={true} isLoading={isLoading}>
      <StakeFilter
        sentries={sentries}
        filters={filters}
        activeFilter={activeFilter}
        onClick={(filter) => setActiveFilter(filter)}
      />
      <View
        style={{
          position: "relative",
          backgroundColor: theme.bgLight,
          padding: theme.containerPadding,
          paddingTop: "0.5em",
          display: "flex",
          flexDirection: "column",
          gap: "0.5em;",
          minHeight: "100%",
        }}
      >
        {!sentries.length ? <EmptyState /> : null}
        {sentries
          .filter((sentry) => {
            if (activeFilter === "all") return sentry;
            if (activeFilter === "staked") return sentry.staked;
            if (activeFilter === "unstaked") return !sentry.staked;
          })
          .map((sentry) => (
            <SentryRow
              tokenMetadata={sentry}
              selected={selected.some((entry) => entry.name === sentry.name)}
              onClick={() => handleSelection(sentry)}
            />
          ))}
      </View>
      <View
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: `translate(-50%, ${selected.length ? "-5em" : 0})`,
          transition: "0.2s transform, opacity ease-in",
          visibility: selected.length ? "visible" : "hidden",
        }}
      >
        {isIndeterminate ? (
          <IndeterminateWarning />
        ) : (
          <ActionButton selected={selected} stakeType={whichStake} />
        )}
      </View>
    </Layout>
  );
}

function SentryRow(props: SentryRowProps) {
  const { tokenMetadata: sentry, selected, onClick } = props;

  return (
    <View
      onClick={onClick}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomColor: selected ? theme.bgLight : "#292929",
        borderBottomStyle: "solid",
        borderBottomWidth: "1px",
        borderRadius: selected ? "12px" : 0,
        padding: "0.8em",
        marginBottom: "0.5em",
        // cursor: "pointer", /* disable for first release */
        userSelect: "none",
        backgroundColor: selected ? theme.bg : "",
        transition: "all 0.2s ease-in-out",
      }}
    >
      <View
        style={{
          display: "flex",
          gap: "0.9em",
        }}
      >
        <Image
          src={sentry.image}
          alt={sentry.name}
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "12px",
          }}
        />
        <View>
          <Text style={{ color: "white" }}>{sentry.name}</Text>
          <View
            style={{
              display: "flex",
              gap: "0.3em",
            }}
          >
            <Text
              style={{
                fontSize: "0.75rem",
                color: theme.mutedText,
              }}
            >
              {sentry.staked ? "Staked" : "Not Staked"}
            </Text>
            <View
              style={{
                position: "relative",
                top: "-1px",
              }}
            >
              {sentry.staked ? (
                <Svg
                  viewBox="0 0 24 24"
                  fill={theme.accent}
                  width="16px"
                  height="16px"
                >
                  <Path
                    fillRule="evenodd"
                    d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                    clipRule="evenodd"
                  />
                </Svg>
              ) : null}
            </View>
          </View>
        </View>
      </View>
      <View
        style={{
          transform: `scale(${selected ? 1 : 0})`,
          transition: "transform 0.2s ease-in-out",
        }}
      >
        <View
          style={{
            backgroundColor: theme.accent,
            width: "10px",
            height: "10px",
            borderRadius: "100px",
            boxShadow: "0 0 0 4px #1f322c",
          }}
        />
      </View>
    </View>
  );
}

function ActionButton({
  selected,
  stakeType,
}: {
  selected: SentryData[];
  stakeType: "stake" | "unstake" | undefined;
}) {
  return (
    <Button
      style={{
        textTransform: "capitalize",
        width: "auto",
        backgroundColor: theme.brand,
        borderRadius: "100px",
      }}
    >
      {stakeType} ({selected.length})
    </Button>
  );
}

function IndeterminateWarning() {
  return (
    <View
      style={{
        backgroundColor: theme.bg,
        padding: "0.8em 1.2em",
        borderRadius: "12px",
        textAlign: "center",
      }}
    >
      <Text
        style={{
          fontSize: "0.75rem",
          color: theme.mutedText,
        }}
      >
        Select either staked or unstaked Sentries only.
      </Text>
    </View>
  );
}

function EmptyState() {
  return (
    <View
      style={{
        textAlign: "center",
        padding: "2em",
        border: "1px dashed",
        borderColor: "#303030",
        borderRadius: "12px",
      }}
    >
      <Text
        style={{
          fontSize: "0.9rem",
          color: theme.mutedText,
        }}
      >
        You have no Sentries in this wallet. No worries, You can buy Sentries on
        Magic Eden!
      </Text>
    </View>
  );
}
