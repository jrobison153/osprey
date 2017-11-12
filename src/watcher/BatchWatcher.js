import binaryInsert from 'binary-search-insert';
import { EventEmitter } from 'events';

const MS_IN_A_SECOND = 1000;

export default class BatchWatcher extends EventEmitter {

  constructor(redis, date) {

    super();

    this.redis = redis;
    this.date = date;

    this.tickerProcessingBatches = {};
    this.currentDecorationThroughput = 0.0;
    this.tickerDecoratedEvents = [];

    this.subscriber = this.redis.createClient();

    this.subscriber.on('message', this.handleMessageEvents.bind(this));

    this.subscriber.subscribe('TICKER_BATCH_PROCESSING');
  }

  handleMessageEvents(channel, message) {

    const messageAsObj = JSON.parse(message);

    if (messageAsObj.name === 'BATCH_TICKER_PROCESSING_STARTED') {

      this.handleBatchProcessingStartedEvent(messageAsObj);

    } else if (messageAsObj.name === 'TICKER_DECORATED') {

      this.handleTickerDecoratedEvent(messageAsObj);
    }
  }

  getTickerDecoratedThroughput() {

    return this.currentDecorationThroughput;
  }

  getBatches() {

    return Object.assign({}, this.tickerProcessingBatches);
  }

  handleBatchProcessingStartedEvent(message) {

    const batchStartTime = this.date.now();
    this.tickerProcessingBatches[message.payload.id] = {
      batchStartTime,
    };
  }

  handleTickerDecoratedEvent(event) {

    this.removeEventsOlderThanSixtySeconds();

    this.insertNewEventInAscendingOrder(event);

    this.calculateCurrentDecoratedTickerThroughput();

    this.emit('DECORATION_THROUGHPUT_UPDATED', this.currentDecorationThroughput);
  }

  removeEventsOlderThanSixtySeconds() {

    const sixtySecondWindow = this.getThroughputWindow();

    this.tickerDecoratedEvents = this.tickerDecoratedEvents.filter((event) => {

      const eventCreationTime = event.eventCreatedTimestamp;

      return eventCreationTime >= sixtySecondWindow;
    });
  }

  calculateCurrentDecoratedTickerThroughput() {

    if (this.tickerDecoratedEvents.length >= 2) {

      this.calculateThroughputBetweenEvents();

    } else if (this.tickerDecoratedEvents.length === 1) {

      this.calculateThroughputBetweenEventAndWindow();
    } else {

      this.currentDecorationThroughput = 0;
    }
  }

  calculateThroughputBetweenEvents() {

    const earliestEvent = this.tickerDecoratedEvents[0];
    const mostRecentEvent = this.tickerDecoratedEvents[this.tickerDecoratedEvents.length - 1];

    const earliestEventTime = earliestEvent.eventCreatedTimestamp;
    const mostRecentEventTime = mostRecentEvent.eventCreatedTimestamp;

    const timeSpan = (mostRecentEventTime - earliestEventTime) / MS_IN_A_SECOND;

    this.currentDecorationThroughput = this.tickerDecoratedEvents.length / timeSpan;
  }

  calculateThroughputBetweenEventAndWindow() {

    const eventTime = this.tickerDecoratedEvents[0].eventCreatedTimestamp;
    const timeSpan = (this.date.now() - eventTime) / MS_IN_A_SECOND;

    this.currentDecorationThroughput = this.tickerDecoratedEvents.length / timeSpan;
  }

  insertNewEventInAscendingOrder(event) {

    const sixtySecondWindow = this.getThroughputWindow();
    const eventTimestamp = event.eventCreatedTimestamp;

    if (eventTimestamp >= sixtySecondWindow) {

      // binary insert on an Array is expensive. If performance issues present, convert this
      // structure to a linked list
      binaryInsert(this.tickerDecoratedEvents, (existingEvent, newEvent) => {

        const existingEventTs = existingEvent.eventCreatedTimestamp;
        const newEventTs = newEvent.eventCreatedTimestamp;

        let compareResult;
        if (newEventTs < existingEventTs) {

          compareResult = 1;
        } else {

          compareResult = -1;
        }

        return compareResult;

      }, event);
    }
  }

  getThroughputWindow() {

    return this.date.now() - 60000;
  }
}

