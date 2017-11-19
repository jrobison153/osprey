export default class WebSocketSpy {

  constructor() {

    this.lastEventName = 'no events emitted yet';
    this.throughput = 'no throughput yet';
  }

  emit(eventName, data) {

    this.lastEventName = eventName;
    this.throughput = data;
  }
}
