import LineBufferSpy from './LineBufferSpy';

export default class LineBufferFactorySpy {

  constructor() {

    this.createLineBufferCallCount = 0;
    this.bufferOptions = {};
    this.theCreatedLineBuffer = undefined;
  }

  createLineBuffer(bufferOptions) {

    this.createLineBufferCallCount += 1;
    this.bufferOptions = bufferOptions;
    this.theCreatedLineBuffer = new LineBufferSpy();

    return this.theCreatedLineBuffer;
  }
}
