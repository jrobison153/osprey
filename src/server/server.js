/* eslint-disable no-use-before-define */
import restify from 'restify';
import socketio from 'socket.io';
import redis from 'redis';
import BatchWatcher from '../watcher/BatchWatcher';
import CommandLineReporter from '../reporter/CommandLineReporter';
import WebSocketReporter from '../reporter/WebSocketReporter';
import LineBufferFactory from '../reporter/LineBufferFactory';
import LineFactory from '../reporter/LineFactory';

let serverPort = 8083;
let restifyServer;
let socket;


export const start = (batchWatcher, reporters) => {

  const theBatchWatcher = batchWatcher || new BatchWatcher(redis, Date);

  registerCommandLineReporter(reporters, theBatchWatcher);

  serverPort = process.env.PORT || 8083;

  restifyServer = restify.createServer();

  return new Promise((resolve) => {

    restifyServer.listen(serverPort, () => {

      console.info(`Osprey listening on port ${serverPort}`);

      configureResources(theBatchWatcher);

      initializeWebSocket();

      registerWebSocketReporter(reporters, theBatchWatcher);

      resolve();
    });
  });
};

export const stop = () => {

  socket.close();

  return new Promise((resolve) => {

    restifyServer.close(resolve);
  });
};

export const getPort = () => {

  return serverPort;
};

const configureResources = (theBatchWatcher) => {

  restifyServer.get('/health', (req, resp) => {

    resp.send('ok');
  });

  restifyServer.get('/decoration/throughput', (req, resp) => {

    resp.send({
      throughput: theBatchWatcher.getTickerDecoratedThroughput(),
    });
  });
};

const initializeWebSocket = () => {

  const io = socketio();

  socket = io.listen(restifyServer.server);
};

const registerCommandLineReporter = (reporters, batchWatcher) => {

  const commandLineReporter = (reporters && reporters.commandLine) ||
    new CommandLineReporter(new LineBufferFactory(), new LineFactory());

  batchWatcher.on('DECORATION_THROUGHPUT_UPDATED', commandLineReporter.report.bind(commandLineReporter));
};

const registerWebSocketReporter = (reporters, theBatchWatcher) => {

  const socketReporter = (reporters && reporters.webSocket) || new WebSocketReporter(socket);

  theBatchWatcher.on('DECORATION_THROUGHPUT_UPDATED', socketReporter.report.bind(socketReporter));
};
