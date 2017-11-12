/* eslint-disable no-use-before-define */
import redis from 'redis';
import * as server from '../../src/server/server';

describe('tickerDecoratedThroughput Integration Tests', () => {

  describe('when TICKER_DECORATED events are published', () => {

    before(async () => {

      await server.start();
    });

    after(async () => {

      server.stop();
    });

    it('reports the throughput to the command line via the default reporter', () => {

      return new Promise((resolve) => {

        const publisher = redis.createClient();
        publishMessagesBlocking(publisher, 5, resolve);
      });
    });
  });
});

const publishMessagesBlocking = (publisher, retryTimes, resolve) => {

  if (retryTimes > 0) {

    const message = {
      name: 'TICKER_DECORATED',
      eventCreatedTimestamp: Date.now(),
    };

    publisher.publish('TICKER_BATCH_PROCESSING', JSON.stringify(message));

    setTimeout(() => {

      publishMessagesBlocking(publisher, retryTimes - 1, resolve);
    }, 300);

  } else {

    resolve();
  }
};
