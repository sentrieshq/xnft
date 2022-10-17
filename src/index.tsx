import ReactXnft, { AnchorDom } from "react-xnft";
import { App } from "./App";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

ReactXnft.render(
  <AnchorDom>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </AnchorDom>
);
