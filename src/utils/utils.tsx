import { Tab, Image } from "react-xnft";
import { NavigatorRoute, Route } from "../typings/routes";
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

export function formatNumberToLocale(number: number | undefined) {
  if (!number) return 0;
  return Number(number).toLocaleString();
}

export function calculatePercentage(number?: number, total?: number) {
  if (!number || !total) return "0";

  const result = (number * 100) / total;

  return formatNumberToLocale(result) + "%";
}

export function valueOrDefault(prop: number | undefined, defaultProp: number) {
  return prop ? prop : defaultProp;
}

export function formatNumberToK(number: number | string) {
  const numberToFormat =
    typeof number === "string" ? parseFloat(number) : number;

  if (numberToFormat > 999) {
    return (numberToFormat / 1000).toFixed(2) + "k";
  }
}
