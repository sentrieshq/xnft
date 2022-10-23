import ReactXnft, { View, Tab } from "react-xnft";
import { PublicKey } from "@solana/web3.js";
import { theme } from "./utils/theme";
import { Stake } from "./screens/Stake";
import { Overview } from "./screens/Overview";
import { Route } from "./typings/routes";
import { getTabComponent } from "./utils/utils";
import { getTokens } from "./utils/tokenOps";
import { useSentryStore } from "./hooks/useSentryStore";

ReactXnft.events.on("connect", async () => {
  const sentries = await getTokens(
    window.xnft.solana.publicKey,
    window.xnft.solana.connection
  );

  useSentryStore.setState({ sentries });
});

export function App() {
  return (
    <View
      style={{
        backgroundColor: theme.bgLight,
        height: "100%",
        overflow: "hidden",
      }}
    >
      <Tab.Navigator
        // @ts-ignore
        options={({ route }: { route: NavigatorRoute }) => ({
          tabBarActiveTintColor: theme.brand,
          tabBarIcon: ({ focused }) => getTabComponent(route, focused),
        })}
      >
        <Tab.Screen
          name={Route.Overview}
          disableLabel={true}
          component={() => <Overview />}
        />
        <Tab.Screen
          name={Route.Stake}
          disableLabel={true}
          component={() => <Stake />}
        />
      </Tab.Navigator>
    </View>
  );
}
