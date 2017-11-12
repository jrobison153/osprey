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

      const redisStub = new RedisStub();
      redisFake = redisStub.createClient();
      dateStub = new FixedDateStub(nowDate);
      batchWatcher = new BatchWatcher(redisStub, dateStub);
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
