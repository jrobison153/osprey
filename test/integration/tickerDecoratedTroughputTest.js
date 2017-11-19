/* eslint-disable no-use-before-define */
import { expect } from 'chai';
import redis from 'redis';
import io from 'socket.io-client';
import * as server from '../../src/server/server';

describe('tickerDecoratedThroughput Integration Tests', () => {

  describe('when TICKER_DECORATED events are published', () => {

    beforeEach(async () => {

      await server.start();
    });

    afterEach(async () => {

      server.stop();
    });

    it('reports the throughput to the command line via the default reporter', () => {

      return new Promise((resolve) => {

        const publisher = redis.createClient();
        publishMessages(publisher, 5, resolve);
      });
    });

    it('reports the throughput via the web socket reporter', async () => {

      const socket = io(`http://localhost:${server.getPort()}`);

      let socketedThroughputEventsCount = 0;

      await connectToServerWebSocket(socket);

      socket.on('ticker-decorated-throughput', () => {

        socketedThroughputEventsCount += 1;
      });

      await injectSystemActivity();

      expect(socketedThroughputEventsCount).to.equal(5);
    });
  });
});

const injectSystemActivity = () => {

  return new Promise((resolve) => {

    const publisher = redis.createClient();
    publishMessages(publisher, 5, resolve);
  });
};

const publishMessages = (publisher, numMessagesToPublish, resolve) => {

  if (numMessagesToPublish > 0) {

    const message = {
      name: 'TICKER_DECORATED',
      eventCreatedTimestamp: Date.now(),
    };

    publisher.publish('TICKER_BATCH_PROCESSING', JSON.stringify(message));

    setTimeout(() => {

      publishMessages(publisher, numMessagesToPublish - 1, resolve);
    }, 300);

  } else {

    resolve();
  }
};

const connectToServerWebSocket = (socket) => {

  return new Promise((resolve) => {

    socket.on('connect', () => {

      resolve();
    });

    socket.on('error', (error) => {

      throw new Error(error);
    });

    socket.on('connect_error', (error) => {

      throw new Error(error);
    });
  });
};

