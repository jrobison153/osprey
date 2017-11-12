import redisClientFakeFactory from 'redis-fake';

export default class RedisSpy {

  constructor() {

    this.port = 6379;
    this.host = '127.0.0.1';
    this.options = undefined;
    this.theClient = redisClientFakeFactory();
  }

  createClient(port, host, options) {

    this.port = port;
    this.host = host;
    this.options = options;
    return this.theClient;
  }
}
