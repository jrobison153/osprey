
export default class FixedThroughputBatchWatcherSpy {

  constructor() {

    this.throughputUpdatedEventListener = () => {};
  }

  getTickerDecoratedThroughput () {

    return 93425.34;
  }

  on(event, listener) {

    if (event === 'DECORATION_THROUGHPUT_UPDATED') {

      this.throughputUpdatedEventListener = listener;
    }
  }
}
