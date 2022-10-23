import ReactXnft, { AnchorDom } from "react-xnft";
import { App } from "./App";
import { SWRConfig } from "swr";

ReactXnft.render(
  <AnchorDom>
    <SWRConfig
      value={{
        refreshInterval: 3000,
        fetcher: (resource, init) =>
          fetch(resource, init).then((res) => res.json()),
      }}
    >
      <App />
    </SWRConfig>
  </AnchorDom>
);
