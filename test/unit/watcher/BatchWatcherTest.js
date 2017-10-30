import { expect } from 'chai';
import RedisStub from '../../stub/RedisStub';
import FixedDateStub from '../../stub/FixedDateStub';
import BatchWatcher from '../../../src/watcher/BatchWatcher';

const MS_IN_A_SECOND = 1000;

describe('BatchWatcher Tests', () => {

  describe('when BATCH_TICKER_PROCESSING_STARTED event is received', () => {

    it('the id is stored with the time the event was received', () => {

      const redisStub = new RedisStub();
      const fixedDate = Date.now();
      const dateStub = new FixedDateStub(fixedDate);
      const batchWatcher = new BatchWatcher(redisStub, dateStub);

      const redisFake = redisStub.createClient();
      const eventId = 'abcdefg';
      const event = {
        name: 'BATCH_TICKER_PROCESSING_STARTED',
        payload: {
          id: eventId,
        },
      };

      redisFake.publish('TICKER_BATCH_PROCESSING', event);

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
          eventCreatedTimestamp: new Date(nowDate.getTime() - (10 * MS_IN_A_SECOND)),
        },
        {
          name: 'TICKER_DECORATED',
          eventCreatedTimestamp: new Date(nowDate.getTime() - (4 * MS_IN_A_SECOND)),
        },
        {
          name: 'TICKER_DECORATED',
          eventCreatedTimestamp: new Date(nowDate.getTime() - (2 * MS_IN_A_SECOND)),
        },
        {
          name: 'TICKER_DECORATED',
          eventCreatedTimestamp: nowDate,
        },
      ];

      const redisStub = new RedisStub();
      redisFake = redisStub.createClient();
      dateStub = new FixedDateStub(nowDate);
      batchWatcher = new BatchWatcher(redisStub, dateStub);
    });

    it('reports the throughput correctly if there are zero events in the window', () => {

      let expectedThroughput = 4 / 10;

      events.forEach((event) => {

        redisFake.publish('TICKER_BATCH_PROCESSING', event);
      });

      let tickerDecoratedThroughput = batchWatcher.getTickerDecoratedThroughput();

      expect(tickerDecoratedThroughput).to.equal(expectedThroughput);

      const event = {
        name: 'TICKER_DECORATED',
        eventCreatedTimestamp: new Date(nowDate.getTime() - (65 * MS_IN_A_SECOND)),
      };

      dateStub.shiftWindowForwardBySeconds(120);

      redisFake.publish('TICKER_BATCH_PROCESSING', event);

      expectedThroughput = 0;

      tickerDecoratedThroughput = batchWatcher.getTickerDecoratedThroughput();

      expect(tickerDecoratedThroughput).to.equal(expectedThroughput);
    });

    it('reports the throughput correctly if there is only one event', () => {

      const event = {
        name: 'TICKER_DECORATED',
        eventCreatedTimestamp: new Date(nowDate.getTime() - (10 * MS_IN_A_SECOND)),
      };

      redisFake.publish('TICKER_BATCH_PROCESSING', event);

      const expectedThroughput = 1 / 10;

      const tickerDecoratedThroughput = batchWatcher.getTickerDecoratedThroughput();

      expect(tickerDecoratedThroughput).to.equal(expectedThroughput);
    });

    it('reports the throughput correctly if there are multiple events in the window', () => {

      const expectedThroughput = 4 / 10;

      events.forEach((event) => {

        redisFake.publish('TICKER_BATCH_PROCESSING', event);
      });

      const tickerDecoratedThroughput = batchWatcher.getTickerDecoratedThroughput();

      expect(tickerDecoratedThroughput).to.equal(expectedThroughput);
    });

    it('discards events outside the 60 second throughput window', () => {

      events.unshift({
        name: 'TICKER_DECORATED',
        eventCreatedTimestamp: new Date(nowDate.getTime() - (65 * MS_IN_A_SECOND)),
      });

      const expectedThroughput = 4 / 10;

      dateStub.shiftWindowBackBySeconds(10);

      redisFake.publish('TICKER_BATCH_PROCESSING', events[0]);
      redisFake.publish('TICKER_BATCH_PROCESSING', events[1]);

      dateStub.resetWindow();

      redisFake.publish('TICKER_BATCH_PROCESSING', events[2]);
      redisFake.publish('TICKER_BATCH_PROCESSING', events[3]);
      redisFake.publish('TICKER_BATCH_PROCESSING', events[4]);

      const tickerDecoratedThroughput = batchWatcher.getTickerDecoratedThroughput();

      expect(tickerDecoratedThroughput).to.equal(expectedThroughput);
    });

    it('keeps the events in ascending order by eventCreatedTimestamp', () => {

      events = [
        {
          name: 'TICKER_DECORATED',
          eventCreatedTimestamp: new Date(nowDate.getTime() - (2 * MS_IN_A_SECOND)),
        },
        {
          name: 'TICKER_DECORATED',
          eventCreatedTimestamp: new Date(nowDate.getTime() - (4 * MS_IN_A_SECOND)),
        },
        {
          name: 'TICKER_DECORATED',
          eventCreatedTimestamp: new Date(nowDate.getTime() - (10 * MS_IN_A_SECOND)),
        },
        {
          name: 'TICKER_DECORATED',
          eventCreatedTimestamp: nowDate,
        },
      ];

      const expectedThroughput = 4 / 10;

      events.forEach((event) => {

        redisFake.publish('TICKER_BATCH_PROCESSING', event);
      });

      const tickerDecoratedThroughput = batchWatcher.getTickerDecoratedThroughput();

      expect(tickerDecoratedThroughput).to.equal(expectedThroughput);
    });

    it('discards new events outside the 60 second window', () => {

      events.push({
        name: 'TICKER_DECORATED',
        eventCreatedTimestamp: new Date(nowDate.getTime() - (65 * MS_IN_A_SECOND)),
      });

      const expectedThroughput = 4 / 10;

      events.forEach((event) => {

        redisFake.publish('TICKER_BATCH_PROCESSING', event);
      });

      const tickerDecoratedThroughput = batchWatcher.getTickerDecoratedThroughput();

      expect(tickerDecoratedThroughput).to.equal(expectedThroughput);
    });
  });
});
