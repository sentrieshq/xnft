import ReactXnft, { View, Tab } from "react-xnft";
import { theme } from "./utils/theme";
import { Stake } from "./screens/Stake";
import { Overview } from "./screens/Overview";
import { Route } from "./typings/routes";
import { getTabComponent } from "./utils/utils";

ReactXnft.events.on("connect", async () => {});

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
