/* eslint-disable no-use-before-define */
import socketio from 'socket.io';
import express from 'express';
import redis from 'redis';
import BatchWatcher from '../watcher/BatchWatcher';
import CommandLineReporter from '../reporter/CommandLineReporter';
import WebSocketReporter from '../reporter/WebSocketReporter';
import LineBufferFactory from '../reporter/LineBufferFactory';
import LineFactory from '../reporter/LineFactory';

let serverPort = 8083;
let theServer;
let socket;
const expressApp = express();

export const start = (batchWatcher, reporters) => {

  const theBatchWatcher = batchWatcher || new BatchWatcher(redis, Date);

  registerCommandLineReporter(reporters, theBatchWatcher);

  serverPort = process.env.PORT || 8083;

  configureResources(theBatchWatcher);

  return new Promise((resolve) => {

    theServer = expressApp.listen(serverPort, () => {

      console.info(`Osprey listening on port ${serverPort}`);

      initializeWebSocket();

      registerWebSocketReporter(reporters, theBatchWatcher);

      resolve();
    });
  });
};

export const stop = () => {

  socket.close();

  return new Promise((resolve) => {

    theServer.close(resolve);
  });
};

export const getPort = () => {

  return serverPort;
};

const configureResources = (theBatchWatcher) => {

  expressApp.get('/health', (req, resp) => {

    resp.json('ok');
  });

  expressApp.get('/decoration/throughput', (req, resp) => {

    resp.json({
      throughput: theBatchWatcher.getTickerDecoratedThroughput(),
    });
  });
};

const initializeWebSocket = () => {

  socket = socketio.listen(theServer);
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
