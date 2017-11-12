/* eslint-disable no-unused-expressions */
import rp from 'request-promise';
import { expect } from 'chai';
import * as server from '../../src/server/server';
import FixedThroughputBatchWatcherSpy from '../spy/FixedThroughputBatchWatcherSpy';
import ReporterStub from '../stub/ReporterStub';

describe('server tests', () => {

  describe('when the server starts', () => {

    describe('and the the watcher is configured', () => {

      let batchWatcherSpy;
      let reporterStub;

      beforeEach(async () => {

        batchWatcherSpy = new FixedThroughputBatchWatcherSpy();
        reporterStub = new ReporterStub();
        await server.start(batchWatcherSpy, reporterStub);
      });

      afterEach(async () => {

        server.stop();
      });

      it('registers the reporter as a listener for TICKER_THROUGHPUT_UPDATED events', async () => {

        expect(batchWatcherSpy.throughputUpdatedEventListener()).to.equal('I am the stub');
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
  });

  describe('when verifying REST resources', () => {

    let serverPort;
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
