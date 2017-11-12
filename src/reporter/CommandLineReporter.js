import clc from 'cli-color';

export default class CommandLineReporter {

  constructor(lineBufferFactory, lineFactory) {

    this.lineBufferFactory = lineBufferFactory;
    this.lineFactory = lineFactory;
  }

  report(throughput) {

    const outputBuffer = this.lineBufferFactory.createLineBuffer({
      x: 0,
      y: 0,
      width: 'console',
      height: 'console',
    });

    const line = this.lineFactory.createLine(outputBuffer);

    line
      .column(`${throughput}`, 20, [clc.cyan])
      .column('events/sec', 20, [clc.cyan])
      .fill()
      .store();

    outputBuffer.output();
  }
}
