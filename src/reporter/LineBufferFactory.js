/* eslint-disable class-methods-use-this */
import { LineBuffer } from 'clui';

export default class LineBufferFactory {

  createLineBuffer(config) {

    return new LineBuffer(config);
  }
}
