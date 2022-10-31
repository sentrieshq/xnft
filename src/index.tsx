import ReactXnft, { AnchorDom } from "react-xnft";
import { App } from "./App";
import { SWRConfig } from "swr";
import { EnvironmentProvider } from "./providers/EnvironmentProvider";

ReactXnft.render(
  <AnchorDom>
    <EnvironmentProvider defaultCluster="mainnet-beta">
      <SWRConfig
        value={{
          refreshInterval: 3000,
          fetcher: (resource, init) =>
            fetch(resource, init).then((res) => res.json()),
        }}
      >
        <App />
      </SWRConfig>
    </EnvironmentProvider>
  </AnchorDom>
);
