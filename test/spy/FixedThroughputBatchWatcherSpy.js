/* eslint-disable class-methods-use-this */

export default class FixedThroughputBatchWatcherSpy {

  constructor() {

    this.throughputUpdatedEventListeners = [];
  }

  getTickerDecoratedThroughput() {

    return 93425.34;
  }

  on(event, listener) {

    if (event === 'DECORATION_THROUGHPUT_UPDATED') {

      this.throughputUpdatedEventListeners.push(listener);
    }
  }
}
