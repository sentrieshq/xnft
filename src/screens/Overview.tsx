import { View, Text } from "react-xnft";
import { Layout } from "../common/Layout";
import { theme } from "../utils/theme";

export function Overview() {
  return (
    <Layout>
      <View>
        <Text
          style={{
            fontWeight: "bold",
            fontSize: "1.2rem",
          }}
        >
          The Power Grid
        </Text>
        <Text
          style={{
            color: theme.mutedText,
          }}
        >
          Stake your Sentries, and power it up by locking SOL in our validator,
          The Lode
        </Text>
      </View>
    </Layout>
  );
}
