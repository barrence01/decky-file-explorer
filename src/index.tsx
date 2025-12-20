import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  staticClasses
} from "@decky/ui";
import {
  addEventListener, 
  removeEventListener,
  definePlugin,
  toaster,
} from "@decky/api"
import { useState, useEffect } from "react";
import { FaServer } from "react-icons/fa";
import { ServerAPIProvider, useServerAPI } from "./contexts/ServerAPIContext";
import Content from "./components/Content";


function PluginContent() {
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