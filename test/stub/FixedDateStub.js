
export default class FixedDateStub {

  constructor(dateVal) {

    this.fixedDate = dateVal;
    this.originalDate = dateVal;
  }

  now() {

    return this.fixedDate;
  }

  shiftWindowBackBySeconds(seconds) {

    this.originalDate = this.fixedDate;
    this.fixedDate = new Date(this.fixedDate.getTime() - (seconds * 1000));
  }

  shiftWindowForwardBySeconds(seconds) {

    this.originalDate = this.fixedDate;
    this.fixedDate = new Date(this.fixedDate.getTime() + (seconds * 1000));

  }

  resetWindow() {

    this.fixedDate = this.originalDate;
  }
}
