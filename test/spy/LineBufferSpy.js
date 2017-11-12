
export default class LineBufferSpy {

  constructor() {

    this.outputCalled = false;
  }

  output() {

    this.outputCalled = true;
  }
}
