/* eslint-disable class-methods-use-this */
import { Line } from 'clui';

export default class LineFactory {

  createLine(outputBuffer) {

    return new Line(outputBuffer);
  }
}
