import { expect } from 'chai';
import RedisSpy from '../../spy/RedisSpy';
import FixedDateStub from '../../stub/FixedDateStub';
import BatchWatcher from '../../../src/watcher/BatchWatcher';

const MS_IN_A_SECOND = 1000;

describe('BatchWatcher Tests', () => {

  describe('when creating the client', () => {

    let redisSpy;

    describe('and using default configuration', () => {

      beforeEach(() => {

        redisSpy = new RedisSpy();
        const fixedDate = Date.now();
        const dateStub = new FixedDateStub(fixedDate);

        // eslint-disable-next-line no-unused-vars
        const batchWatcher = new BatchWatcher(redisSpy, dateStub);
      });

      it('configures redis with the default port if env var REDIS_PORT not set', () => {

        expect(redisSpy.port).to.equal(6379);
      });

      it('configures redis with the default host if env var REDIS_HOST not set', () => {

        expect(redisSpy.host).to.equal('127.0.0.1');
      });

      it('configures redis with the default retry strategy', () => {

        expect(redisSpy.options.retry_strategy).to.equal(BatchWatcher.perpetualRetryStrategy);
      });
    });

    describe('and using configuration from the environment', () => {

      const envBackup = {};

      before(() => {

        envBackup.REDIS_PORT = process.env.REDIS_PORT;
        envBackup.REDIS_HOST = process.env.REDIS_HOST;

        process.env.REDIS_PORT = 9099;
        process.env.REDIS_HOST = 'redishost';
      });

      after(() => {

        if (envBackup.REDIS_PORT) {

          process.env.REDIS_PORT = envBackup.REDIS_PORT;
        } else {

          delete process.env.REDIS_PORT;
        }

        if (envBackup.REDIS_HOST) {

          process.env.REDIS_HOST = envBackup.REDIS_HOST;
        } else {

          delete process.env.REDIS_HOST;
        }
      });

      it('sets the port to the value of REDIS_PORT env var', () => {

        redisSpy = new RedisSpy();
        const fixedDate = Date.now();
        const dateStub = new FixedDateStub(fixedDate);

        // eslint-disable-next-line no-unused-vars
        const batchWatcher = new BatchWatcher(redisSpy, dateStub);

        expect(redisSpy.port).to.equal('9099');
      });

      it('sets the host to the value of REDIS_HOST env var', () => {

        redisSpy = new RedisSpy();
        const fixedDate = Date.now();
        const dateStub = new FixedDateStub(fixedDate);

        // eslint-disable-next-line no-unused-vars
        const batchWatcher = new BatchWatcher(redisSpy, dateStub);

        expect(redisSpy.host).to.equal('redishost');
      });
    });
  });

  describe('when BATCH_TICKER_PROCESSING_STARTED event is received', () => {

    it('the id is stored with the time the event was received', () => {

      const redisSpy = new RedisSpy();
      const fixedDate = Date.now();
      const dateStub = new FixedDateStub(fixedDate);
      const batchWatcher = new BatchWatcher(redisSpy, dateStub);

      const redisFake = redisSpy.createClient();
      const eventId = 'abcdefg';
      const event = {
        name: 'BATCH_TICKER_PROCESSING_STARTED',
        payload: {
          id: eventId,
        },
      };

      redisFake.publish('TICKER_BATCH_PROCESSING', JSON.stringify(event));

      const tickerProcessingBatches = batchWatcher.getBatches();
      expect(tickerProcessingBatches[eventId].batchStartTime).to.equal(fixedDate);
    });


  });

  describe('when TICKER_DECORATED event is received', () => {

    let nowDate;
    let redisFake;
    let batchWatcher;
    let events;
    let dateStub;

    beforeEach(() => {

      nowDate = new Date();

      events = [
        {
          name: 'TICKER_DECORATED',
          eventCreatedTimestamp: nowDate.getTime() - (10 * MS_IN_A_SECOND),
        },
        {
          name: 'TICKER_DECORATED',
          eventCreatedTimestamp: nowDate.getTime() - (4 * MS_IN_A_SECOND),
        },
        {
          name: 'TICKER_DECORATED',
          eventCreatedTimestamp: nowDate.getTime() - (2 * MS_IN_A_SECOND),
        },
        {
          name: 'TICKER_DECORATED',
          eventCreatedTimestamp: nowDate.getTime(),
        },
      ];

      const redisSpy = new RedisSpy();
      redisFake = redisSpy.createClient();
      dateStub = new FixedDateStub(nowDate);
      batchWatcher = new BatchWatcher(redisSpy, dateStub);
    });

    it('reports the throughput correctly if there are zero events in the window', () => {

      let expectedThroughput = 4 / 10;

      events.forEach((event) => {

        redisFake.publish('TICKER_BATCH_PROCESSING', JSON.stringify(event));
      });

      let tickerDecoratedThroughput = batchWatcher.getTickerDecoratedThroughput();

      expect(tickerDecoratedThroughput).to.equal(expectedThroughput);

      const event = {
        name: 'TICKER_DECORATED',
        eventCreatedTimestamp: nowDate.getTime() - (65 * MS_IN_A_SECOND),
      };

      dateStub.shiftWindowForwardBySeconds(120);

      redisFake.publish('TICKER_BATCH_PROCESSING', JSON.stringify(event));

      expectedThroughput = 0;

      tickerDecoratedThroughput = batchWatcher.getTickerDecoratedThroughput();

      expect(tickerDecoratedThroughput).to.equal(expectedThroughput);
    });

    it('reports the throughput correctly if there is only one event', () => {

      const event = {
        name: 'TICKER_DECORATED',
        eventCreatedTimestamp: nowDate.getTime() - (10 * MS_IN_A_SECOND),
      };

      redisFake.publish('TICKER_BATCH_PROCESSING', JSON.stringify(event));

      const expectedThroughput = 1 / 10;

      const tickerDecoratedThroughput = batchWatcher.getTickerDecoratedThroughput();

      expect(tickerDecoratedThroughput).to.equal(expectedThroughput);
    });

    it('reports the throughput correctly if there are multiple events in the window', () => {

      const expectedThroughput = 4 / 10;

      events.forEach((event) => {

        redisFake.publish('TICKER_BATCH_PROCESSING', JSON.stringify(event));
      });

      const tickerDecoratedThroughput = batchWatcher.getTickerDecoratedThroughput();

      expect(tickerDecoratedThroughput).to.equal(expectedThroughput);
    });

    it('emits events when the throughput is updated', (done) => {

      let emittedEventCount = 0;
      const expectedThroughput = 4 / 10;

      batchWatcher.on('DECORATION_THROUGHPUT_UPDATED', (data) => {

        emittedEventCount += 1;

        if (emittedEventCount === 4) {

          expect(emittedEventCount).to.equal(4);
          expect(data.toString()).to.equal(expectedThroughput.toString());

          done();
        }
      });

      events.forEach((event) => {

        redisFake.publish('TICKER_BATCH_PROCESSING', JSON.stringify(event));
      });
    });

    it('discards events outside the 60 second throughput window', () => {

      events.unshift({
        name: 'TICKER_DECORATED',
        eventCreatedTimestamp: nowDate.getTime() - (65 * MS_IN_A_SECOND),
      });

      const expectedThroughput = 4 / 10;

      dateStub.shiftWindowBackBySeconds(10);

      redisFake.publish('TICKER_BATCH_PROCESSING', JSON.stringify(events[0]));
      redisFake.publish('TICKER_BATCH_PROCESSING', JSON.stringify(events[1]));

      dateStub.resetWindow();

      redisFake.publish('TICKER_BATCH_PROCESSING', JSON.stringify(events[2]));
      redisFake.publish('TICKER_BATCH_PROCESSING', JSON.stringify(events[3]));
      redisFake.publish('TICKER_BATCH_PROCESSING', JSON.stringify(events[4]));

      const tickerDecoratedThroughput = batchWatcher.getTickerDecoratedThroughput();

      expect(tickerDecoratedThroughput).to.equal(expectedThroughput);
    });

    it('keeps the events in ascending order by eventCreatedTimestamp', () => {

      events = [
        {
          name: 'TICKER_DECORATED',
          eventCreatedTimestamp: nowDate.getTime() - (2 * MS_IN_A_SECOND),
        },
        {
          name: 'TICKER_DECORATED',
          eventCreatedTimestamp: nowDate.getTime() - (4 * MS_IN_A_SECOND),
        },
        {
          name: 'TICKER_DECORATED',
          eventCreatedTimestamp: nowDate.getTime() - (10 * MS_IN_A_SECOND),
        },
        {
          name: 'TICKER_DECORATED',
          eventCreatedTimestamp: nowDate.getTime(),
        },
      ];

      const expectedThroughput = 4 / 10;

      events.forEach((event) => {

        redisFake.publish('TICKER_BATCH_PROCESSING', JSON.stringify(event));
      });

      const tickerDecoratedThroughput = batchWatcher.getTickerDecoratedThroughput();

      expect(tickerDecoratedThroughput).to.equal(expectedThroughput);
    });

    it('discards new events outside the 60 second window', () => {

      events.push({
        name: 'TICKER_DECORATED',
        eventCreatedTimestamp: nowDate.getTime() - (65 * MS_IN_A_SECOND),
      });

      const expectedThroughput = 4 / 10;

      events.forEach((event) => {

        redisFake.publish('TICKER_BATCH_PROCESSING', JSON.stringify(event));
      });

      const tickerDecoratedThroughput = batchWatcher.getTickerDecoratedThroughput();

      expect(tickerDecoratedThroughput).to.equal(expectedThroughput);
    });
  });
});
