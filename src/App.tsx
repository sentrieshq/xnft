import ReactXnft, { View, Tab, useConnection, usePublicKey } from "react-xnft";
import { theme } from "./utils/theme";
import { Stake } from "./screens/Stake";
import { Overview } from "./screens/Overview";
import { Route } from "./typings/routes";
import { getTabComponent } from "./utils/utils";

ReactXnft.events.on("connect", () => {
  console.log("connectedd!");
});

export function App() {
  const connect = useConnection();
  const key = usePublicKey();
  connect
    .getAccountInfo(key)
    .then((res) => console.log(res))
    .catch((e) => console.error(e));
  return (
    <View
      style={{
        backgroundColor: theme.bg,
        height: "100%",
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
