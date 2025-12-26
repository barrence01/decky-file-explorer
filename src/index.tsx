import {
  staticClasses
} from "@decky/ui";
import {
  definePlugin,
} from "@decky/api"
import { FaServer } from "react-icons/fa";
import { ServerAPIProvider } from "./contexts/ServerAPIContext";
// import { serverAPI } from "./utils/ServerAPI";
import Content from "./components/Content";


function PluginContent() {
  // useEffect(() => {
  //   const onError = (event: ErrorEvent) => {
  //     serverAPI.error(`[deckyUI] [GLOBAL ERROR] ${event.message}`);
  //   };

  //   const onRejection = (event: PromiseRejectionEvent) => {
  //     serverAPI.error(`[deckyUI] [UNHANDLED PROMISE] ${String(event.reason)}`);
  //   };

  //   window.addEventListener("error", onError);
  //   window.addEventListener("unhandledrejection", onRejection);

  //   return () => {
  //     window.removeEventListener("error", onError);
  //     window.removeEventListener("unhandledrejection", onRejection);
  //   };
  // }, []);

  return (
    <ServerAPIProvider>
      <Content />
    </ServerAPIProvider>
  );
}

export default definePlugin(() => {
  console.log("Initializing deckyUI from DeckyFileExplorer")

  return {
    name: "DeckyFileExplorer",
    titleView: <div className={staticClasses.Title}>DeckyFileExplorer</div>,
    content: <PluginContent />,
    icon: <FaServer />,
    onDismount() {
      console.log("Unloading");
    },
  };
});