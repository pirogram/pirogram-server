export const logger = require('fluent-logger');

logger.configure('feserv', {
   host: 'localhost',
   port: 24224,
   timeout: 3.0,
   reconnectInterval: 1000 // 1 sec
});