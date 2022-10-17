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
