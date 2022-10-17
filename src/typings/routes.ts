export enum Route {
  Overview = "Overview",
  Stake = "Stake",
  Unstake = "Unstake",
}

export type NavigatorRoute = {
  name: keyof typeof Route;
};
