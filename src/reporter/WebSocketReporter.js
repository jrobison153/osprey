export default class WebSocketReporter {

  constructor(socket) {

    this.socket = socket;
  }

  report(througput) {

    this.socket.emit('ticker-decorated-throughput', througput);
  }
}
