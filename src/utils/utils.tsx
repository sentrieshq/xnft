import { Tab, Image } from "react-xnft";
import { ActiveFilter } from "../features/StakeFilter";
import { NavigatorRoute, Route } from "../typings/routes";
import { SentryData } from "../typings/tokenMetadata";
import { Icon } from "./icons";

export function getTabComponent(route: NavigatorRoute, focused?: boolean) {
  const focusedStyles = focused
    ? { filter: "none" }
    : { filter: "grayscale(100%)" };

  const commonCSS = {
    width: "24px",
    height: "24px",
    ...focusedStyles,
  };

  if (route.name === Route.Overview) {
    return (
      <Tab.Icon element={<Image src={Icon.overview} style={commonCSS} />} />
    );
  }

  if (route.name === Route.Stake) {
    return <Tab.Icon element={<Image src={Icon.stake} style={commonCSS} />} />;
  }
}

export function truncateString(address: string, lengthToShow = 6) {
  const firstCharacterGroup = address.slice(0, lengthToShow);
  const secondCharacterGroup = address.slice(
    address.length - lengthToShow,
    address.length
  );

  return `${firstCharacterGroup}...${secondCharacterGroup}`;
}

export function formatNumber(
  number: number | undefined,
  short: boolean = false
) {
  if (!number) return "0";

  const formatter = Intl.NumberFormat("en", {
    notation: short ? "compact" : "standard",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return formatter.format(number);
}

export function calculatePercentage(number?: number, total?: number) {
  if (!number || !total) return "0";

  const formatter = Intl.NumberFormat("en", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    style: "percent",
  });

  const result = number / total;

  return formatter.format(result);
}

export function valueOrDefault(prop: number | undefined, defaultProp: number) {
  return prop ? prop : defaultProp;
}

export function formatUSD(number?: number) {
  if (!number) return "0";

  const formatCompactUSD = Intl.NumberFormat("en-US", {
    notation: "compact",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    currency: "USD",
  });

  return "$" + formatCompactUSD.format(number);
}

export function checkUniqueStake(selected: SentryData[]) {
  return selected.length
    ? selected.every((selectedElement) => selectedElement.staked) ||
        selected.every((selectedElement) => selectedElement.staked === false)
    : undefined;
}

export function whichStakeType(selected: SentryData[]) {
  if (selected.length === 0) return undefined;

  return !selected.every((selectedEntry) => selectedEntry.staked) // do the opposite of this truthy value
    ? "stake"
    : "unstake";
}
