import binaryInsert from 'binary-search-insert';

const MS_IN_A_SECOND = 1000;

export default class BatchWatcher {

  constructor(redis, date) {

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

    if (message.name === 'BATCH_TICKER_PROCESSING_STARTED') {

      this.handleBatchProcessingStartedEvent(message);

    } else if (message.name === 'TICKER_DECORATED') {

      this.handleTickerDecoratedEvent(message);
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
  }

  removeEventsOlderThanSixtySeconds() {

    const sixtySecondWindow = this.getThroughputWindow();

    this.tickerDecoratedEvents = this.tickerDecoratedEvents.filter((event) => {

      const eventCreationTime = new Date(event.eventCreatedTimestamp).getTime();

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

    const earliestEventTime = new Date(earliestEvent.eventCreatedTimestamp);
    const mostRecentEventTime = new Date(mostRecentEvent.eventCreatedTimestamp);

    const timeSpan = (mostRecentEventTime.getTime() - earliestEventTime.getTime()) / MS_IN_A_SECOND;

    this.currentDecorationThroughput = this.tickerDecoratedEvents.length / timeSpan;
  }

  calculateThroughputBetweenEventAndWindow() {

    const eventTime = new Date(this.tickerDecoratedEvents[0].eventCreatedTimestamp);
    const timeSpan = (this.date.now() - eventTime.getTime()) / MS_IN_A_SECOND;

    this.currentDecorationThroughput = this.tickerDecoratedEvents.length / timeSpan;
  }

  insertNewEventInAscendingOrder(event) {

    const sixtySecondWindow = this.getThroughputWindow();

    if (event.eventCreatedTimestamp >= sixtySecondWindow) {

      // binary insert on an Array is expensive, if performance issues present convert this
      // structure to a linked list
      binaryInsert(this.tickerDecoratedEvents, (existingEvent, newEvent) => {

        const existingEventTs = new Date(existingEvent.eventCreatedTimestamp).getTime();
        const newEventTs = new Date(newEvent.eventCreatedTimestamp).getTime();

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

    return this.date.now().getTime() - 60000;
  }
}

