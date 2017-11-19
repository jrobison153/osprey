/* eslint-disable no-unused-expressions */
import rp from 'request-promise';
import io from 'socket.io-client';
import { expect } from 'chai';
import * as server from '../../src/server/server';
import FixedThroughputBatchWatcherSpy from '../spy/FixedThroughputBatchWatcherSpy';
import ReporterStub from '../stub/ReporterStub';

describe('server tests', () => {

  let serverPort;

  describe('when the server starts', () => {

    describe('and the the watcher is configured', () => {

      let batchWatcherSpy;
      let commandLineReporterStub;

      beforeEach(async () => {

        batchWatcherSpy = new FixedThroughputBatchWatcherSpy();
        commandLineReporterStub = new ReporterStub();
        const webSocketReporterStub = new ReporterStub();

        const reporters = {
          commandLine: commandLineReporterStub,
          webSocket: webSocketReporterStub,
        };

        await server.start(batchWatcherSpy, reporters);
      });

      afterEach(() => {

        return server.stop();
      });

      it('registers the reporters as a listeners for TICKER_THROUGHPUT_UPDATED events', async () => {

        expect(batchWatcherSpy.throughputUpdatedEventListeners[0]()).to.equal('I am the stub');
        expect(batchWatcherSpy.throughputUpdatedEventListeners[1]()).to.equal('I am the stub');
      });
    });

    describe('and the default configuration is used', () => {

      beforeEach(async () => {

        await server.start();
      });

      afterEach(() => {

        server.stop();
      });

      it('defaults to port 8083 if env variable PORT not set', () => {

        expect(server.getPort()).to.equal(8083);
      });
    });

    describe('and the custom configuration is used', () => {

      const envBackup = [];

      beforeEach(async () => {

        envBackup.PORT = process.env.PORT;

        process.env.PORT = 9999;

        await server.start();
      });

      afterEach(() => {

        if (envBackup.PORT) {

          process.env.PORT = envBackup.PORT;
        } else {

          delete process.env.PORT;
        }

        server.stop();
      });

      it('sets the port to the PORT env variable if set', () => {

        expect(server.getPort()).to.equal('9999');
      });
    });

    describe('and the web socket is setup', () => {

      beforeEach(async () => {

        const batchWatcherStub = new FixedThroughputBatchWatcherSpy();

        await server.start(batchWatcherStub);

        serverPort = server.getPort();
      });

      afterEach(() => {

        return server.stop();
      });

      it('accepts a web socket connection', () => {

        let socketConnectionOpened = false;

        const socket = io(`http://localhost:${serverPort}`);

        return new Promise((resolve) => {

          socket.on('connect', () => {

            socketConnectionOpened = true;
            expect(socketConnectionOpened).to.be.true;
            resolve();
          });
        });
      });
    });
  });

  describe('when verifying REST resources', () => {

    let batchWatcherStub;

    beforeEach(async () => {

      batchWatcherStub = new FixedThroughputBatchWatcherSpy();

      await server.start(batchWatcherStub);

      serverPort = server.getPort();
    });

    afterEach(() => {

      server.stop();
    });

    describe('and a GET is issued to the health endpoint', () => {

      it('responds with an ok status', async () => {


        const healthResponse = await rp({
          uri: `http://localhost:${serverPort}/health`,
          resolveWithFullResponse: true,
        });

        expect(healthResponse.statusCode).to.equal(200);
        expect(JSON.parse(healthResponse.body)).to.equal('ok');
      });
    });

    describe('and a GET is issued to the decoration/throughput endpoint', () => {

      it('responds with the current throughput', async () => {

        const expectedThroughput = batchWatcherStub.getTickerDecoratedThroughput();

        const response = await rp({
          uri: `http://localhost:${serverPort}/decoration/throughput`,
          resolveWithFullResponse: true,
        });

        const currentThroughput = JSON.parse(response.body);

        expect(response.statusCode).to.equal(200);
        expect(currentThroughput.throughput).to.equal(expectedThroughput);
      });
    });
  });
});
