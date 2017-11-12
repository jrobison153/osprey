/* eslint-disable no-unused-expressions */
import { expect } from 'chai';
import CommandLineReporter from '../../../src/reporter/CommandLineReporter';
import LineBufferFactorySpy from '../../spy/LineBufferFactorySpy';
import LineFactorySpy from '../../spy/LineFactorySpy';

describe('CommandLineReporter Tests', () => {

  describe('when throughput data received from the batchWatcher', () => {

    let lineBufferFactorySpy;
    let lineFactorySpy;
    const throughput = 342234.343;

    before(() => {

      lineBufferFactorySpy = new LineBufferFactorySpy();
      lineFactorySpy = new LineFactorySpy();
      const commandLineReporter = new CommandLineReporter(lineBufferFactorySpy, lineFactorySpy);

      commandLineReporter.report(throughput);
    });

    it('creates a new LineBuffer', () => {

      expect(lineBufferFactorySpy.createLineBufferCallCount).to.equal(1);
    });

    it('sets the line buffer x coordinate', () => {

      expect(lineBufferFactorySpy.bufferOptions.x).to.equal(0);
    });

    it('sets the line buffer y coordinate', () => {

      expect(lineBufferFactorySpy.bufferOptions.y).to.equal(0);
    });

    it('sets the line buffer width', () => {

      expect(lineBufferFactorySpy.bufferOptions.width).to.equal('console');
    });

    it('sets the line buffer height', () => {

      expect(lineBufferFactorySpy.bufferOptions.height).to.equal('console');
    });

    it('creates a new line of data for the output buffer', () => {

      expect(lineFactorySpy.createLineArg).to.equal(lineBufferFactorySpy.theCreatedLineBuffer);
    });

    it('outputs the events/second to the command line', () => {

      expect(lineFactorySpy.theCreatedLine.columnCallArgs[0]).to.equal(throughput.toString());
    });

    it('outputs the events/second text to the command line', () => {

      expect(lineFactorySpy.theCreatedLine.columnCallArgs[1]).to.equal('events/sec');
    });

    it('fills the line', () => {

      expect(lineFactorySpy.theCreatedLine.fillCalled).to.be.true;
    });

    it('stores the line', () => {

      expect(lineFactorySpy.theCreatedLine.storeCalled).to.be.true;
    });

    it('outputs the buffer', () => {

      expect(lineBufferFactorySpy.theCreatedLineBuffer.outputCalled).to.be.true;
    });
  });
});
