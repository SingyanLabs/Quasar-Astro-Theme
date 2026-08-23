import {
  getReactMajorVersion,
  isSupportedReactVersion,
  versionsConfig
} from "./version.js";
function getRenderer(reactConfig) {
  return {
    name: "@astrojs/react",
    clientEntrypoint: reactConfig.client,
    serverEntrypoint: reactConfig.server
  };
}
function getContainerRenderer() {
  const majorVersion = getReactMajorVersion();
  if (!isSupportedReactVersion(majorVersion)) {
    throw new Error(`Unsupported React version: ${majorVersion}.`);
  }
  return getRenderer(versionsConfig[majorVersion]);
}
export {
  getContainerRenderer,
  getRenderer
};
