import { expect } from 'chai';
import WebSocketReporter from '../../../src/reporter/WebSocketReporter';
import WebSocketSpy from '../../spy/WebSocketSpy';

describe('WebSocketReporter Test', () => {

  describe('when reporting', () => {

    let socketSpy;

    beforeEach(() => {

      socketSpy = new WebSocketSpy();
      const reporter = new WebSocketReporter(socketSpy);

      reporter.report(14.23);
    });

    it('emits the ticker-decorated-throughput event on the web socket', () => {

      expect(socketSpy.lastEventName).to.equal('ticker-decorated-throughput');
    });

    it('emits the throughput with event ticker-decorated-throughput', () => {

      expect(socketSpy.throughput).to.equal(14.23);
    });
  });
});
