import LineSpy from './LineSpy';

export default class LineFactorySpy {

  constructor() {

    this.createLineArg = {};
    this.theCreatedLine = undefined;
  }

  createLine(buffer) {

    this.createLineArg = buffer;
    this.theCreatedLine = new LineSpy();

    return this.theCreatedLine;
  }
}
