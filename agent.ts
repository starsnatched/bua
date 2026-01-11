import { GUIAgent } from "@ui-tars/sdk";
import { NutJSOperator } from "@ui-tars/operator-nut-js";
import config from "./config.json";

interface Config {
  baseURL: string;
  apiKey: string;
  model: string;
  goal: string;
}

const typedConfig: Config = config;

const guiAgent = new GUIAgent({
  model: {
    baseURL: typedConfig.baseURL,
    apiKey: typedConfig.apiKey,
    model: typedConfig.model,
  },
  operator: new NutJSOperator(),
  onData: ({ data }) => {
    console.log(data);
  },
  onError: ({ data, error }) => {
    console.error(error, data);
  },
});

await guiAgent.run(typedConfig.goal);
