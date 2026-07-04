import { buildApp } from './app.js';
import { loadConfig } from './lib/config.js';

const config = loadConfig();
const app = buildApp(config);

app.listen({ host: config.HOST, port: config.PORT }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
