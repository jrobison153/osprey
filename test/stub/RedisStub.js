import redisClientFakeFactory from 'redis-fake';

export default class RedisStub {

  constructor() {

    this.theClient = redisClientFakeFactory();
  }

  createClient() {

    return this.theClient;
  }
}
