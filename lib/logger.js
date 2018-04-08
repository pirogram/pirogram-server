const config = require('config');
export const logger = require('fluent-logger');

logger.configure('feserv', {
   host: config.get('fluentd.host') || 'localhost',
   port: 24224,
   timeout: 3.0,
   reconnectInterval: 1000 // 1 sec
});