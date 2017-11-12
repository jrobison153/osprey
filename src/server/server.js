import restify from 'restify';
import redis from 'redis';
import BatchWatcher from '../watcher/BatchWatcher';
import CommandLineReporter from '../reporter/CommandLineReporter';
import LineBufferFactory from '../reporter/LineBufferFactory';
import LineFactory from '../reporter/LineFactory';

let serverPort = 8083;
let restifyServer;

export const start = (batchWatcher, reporter) => {

  const theBatchWatcher = batchWatcher || new BatchWatcher(redis, Date);

  const theReporter = reporter || new CommandLineReporter(new LineBufferFactory(), new LineFactory());

  theBatchWatcher.on('DECORATION_THROUGHPUT_UPDATED', theReporter.report.bind(theReporter));

  serverPort = process.env.PORT || 8083;

  restifyServer = restify.createServer();

  return new Promise((resolve) => {

    restifyServer.listen(serverPort, () => {

      console.info(`Osprey listening on port ${serverPort}`);

      restifyServer.get('/health', (req, resp) => {

        resp.send('ok');
      });

      restifyServer.get('/decoration/throughput', (req, resp) => {

        resp.send({
          throughput: theBatchWatcher.getTickerDecoratedThroughput(),
        });
      });

      resolve();
    });
  });
};

export const stop = () => {

  restifyServer.close();
};

export const getPort = () => {

  return serverPort;
};

