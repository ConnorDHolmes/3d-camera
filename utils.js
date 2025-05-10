"use strict";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const on = (event, callback, target = window, once = false) =>
  target.addEventListener(event, callback, { once });

const onFirst = (event, callback, target = window) =>
  target.addEventListener(event, callback, { once: true });

const toRadians = (deg) => deg * (Math.PI / 180);

const sin = (angle) => Math.sin(toRadians(angle));

const cos = (angle) => Math.cos(toRadians(angle));

const newTag = (tag, { class: className, ...rest }) =>
  Object.assign(document.createElement(tag), className && { className }, rest);

const newDiv = (attributes = {}) => newTag("div", attributes);

const newImg = (attributes = {}) => newTag("img", attributes);

const newCanvas = (attributes = {}) => newTag("canvas", attributes);

//Consolidated Canvas class

class Canvas {
  constructor(attributes) {
    this.cnvs = newCanvas(attributes);
    this.ctx = this.cnvs.getContext("2d");
  }

  setFill(newFill) {
    this.ctx.fillStyle = newFill;
  }

  rect(x, y, width, height) {
    this.ctx.fillRect(x, y, width, height);
  }

  async createImg() {
    return new Promise((resolve, reject) =>
      this.cnvs.toBlob((blob) => {
        const img = newImg();
        const url = URL.createObjectURL(blob);
        on("load", () => URL.revokeObjectURL(url) && resolve(img), img, true);
        on("error", (err) => reject(err), img, true);
        img.src = url;
      }, "image/webp")
    );
  }
}
