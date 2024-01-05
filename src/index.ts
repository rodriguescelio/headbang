import "reflect-metadata";
import { container } from "tsyringe";
import Headbang from "./headbang";
import { config as configDotEnv } from "dotenv";
import { getLogger } from "log4js";

configDotEnv();

getLogger().level = 'debug';

const app = container.resolve(Headbang);

app.init().then(() => app.start());

