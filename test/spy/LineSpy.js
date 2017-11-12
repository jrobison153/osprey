
export default class LineSpy {

  constructor() {

    this.columnCallArgs = [];
    this.fillCalled = false;
    this.storeCalled = false;
  }

  column(text) {

    this.columnCallArgs.push(text);
    return this;
  }

  fill() {

    this.fillCalled = true;
    return this;
  }

  store() {

    this.storeCalled = true;
    return this;
  }
}
