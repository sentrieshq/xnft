import ReactXnft, { AnchorDom } from "react-xnft";
import { App } from "./App";
import { SWRConfig } from "swr";
import { EnvironmentProvider } from "./providers/EnvironmentProvider";
import { StakePoolMetadataProvider } from "./providers/StakePoolMetadataProvider";

ReactXnft.render(
  <AnchorDom>
    <EnvironmentProvider defaultCluster="mainnet-beta">
      <SWRConfig
        value={{
          refreshInterval: 30000,
          fetcher: (resource, init) =>
            fetch(resource, init).then((res) => res.json()),
        }}
      >
        <StakePoolMetadataProvider>
          <App />
        </StakePoolMetadataProvider>
      </SWRConfig>
    </EnvironmentProvider>
  </AnchorDom>
);
