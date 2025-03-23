"use strict";

// const scaleMultiplier = 1;

// const scaleProps = (obj) => {
//   return Object.fromEntries(
//     Object.entries(obj).map(([key, value]) => [key, value * scaleMultiplier])
//   );
// };

//UTILS

const worldLength = 4096;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const on = (event, callback, target = window) =>
  target.addEventListener(event, callback);

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

//TEXTURE LOADING

const TEXTURES = {};

const loadTexture = async (path) =>
  new Promise((resolve, reject) => {
    const tex = newImg();
    onFirst(
      "load",
      () => {
        TEXTURES[path] = tex;
        resolve();
      },
      tex
    );
    onFirst(
      "load",
      () => {
        reject();
      },
      tex
    );
    tex.src = `textures/${path}.webp`;
  });

const loadAllTextures = async (list) =>
  await Promise.all(list.map((path) => loadTexture(path)));

// collision

const isCollision = (entity1, entity2) => {
  const {
      x: x1,
      y: y1,
      z: z1,
      width: width1,
      length: length1,
      height: height1,
    } = entity1,
    {
      x: x2,
      y: y2,
      z: z2,
      width: width2,
      length: length2,
      height: height2,
    } = entity2;

  const maxX1 = x1 + width1;
  const maxY1 = y1 + length1;
  const maxZ1 = z1 + height1;

  const maxX2 = x2 + width2;
  const maxY2 = y2 + length2;
  const maxZ2 = z2 + height2;

  if (
    x1 <= maxX2 &&
    maxX1 >= x2 &&
    y1 <= maxY2 &&
    maxY1 >= y2 &&
    z1 <= maxZ2 &&
    maxZ1 >= z2
  ) {
    return entity2;
  } else {
    return false;
  }
};

const isGroupCollision = (entity1, group) => {
  const collision = group.find((entity) => isCollision(entity1, entity));
  return collision;
};

//CLASSES

class EasedValue {
  static instances = [];
  static ease(speed) {
    this.instances.forEach((instance) => instance.ease(speed));
  }
  constructor(easing, target, options) {
    this.eased = target;
    this.easing = easing;
    this.target = target;

    if (options) {
      this.min = options.min;
      this.max = options.max;
      this.wrap = options.wrap;
      this.clamp = options.clamp;
    }

    this.constructor.instances.push(this);
  }

  ease(speed) {
    if (this.clamp) {
      this.target = clamp(this.target, this.min, this.max);
      this.eased += (this.target - this.eased) * this.easing * speed;
    } else if (this.wrap) {
      if (this.target > this.max) {
        this.target = this.min;
        this.eased = this.eased - this.max;
      } else if (this.target < this.min) {
        this.target = this.max;
        this.eased = this.eased + this.max;
      } else {
        this.eased += (this.target - this.eased) * this.easing * speed;
      }
    } else {
      this.eased += (this.target - this.eased) * this.easing * speed;
    }
  }

  snap() {
    this.eased = this.target;
  }
}

class Entity {
  constructor(x, y, z, width, length, height) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.width = width;
    this.length = length;
    this.height = height;
  }
}

//INPUTS

const PRESSING = {},
  KEYS = new Map([
    ["a", "LEFT"],
    ["d", "RIGHT"],
    ["s", "DOWN"],
    ["w", "UP"],
    [" ", "SPACE"],
  ]);

on("keydown", (e) => !e.repeat && (PRESSING[KEYS.get(e.key)] = true));
on("keyup", (e) => (PRESSING[KEYS.get(e.key)] = false));

let LOCKED = false;

const VIEWPORT = document.getElementById("viewport");

on(
  "click",
  async (e) => {
    if (!LOCKED) {
      try {
        await e.target.requestPointerLock({ unadjustedMovement: true });
        // await VIEWPORT.requestFullscreen();
      } catch (err) {
        console.error("Error requesting pointer lock:", err);
      }
    }
  },
  document
);

on(
  "pointerlockchange",
  () => {
    LOCKED = Boolean(document.pointerLockElement);
  },
  document
);

//GLOBALS

const SCENE = document.getElementById("scene");
const angleX = new EasedValue(0.25, 90, { min: 0, max: 180, clamp: true });
const angleZ = new EasedValue(0.25, 180, { min: 0, max: 360, wrap: true });
// const perspective = 1024;

//OBJECTS

class Block extends Entity {
  static instances = [];

  constructor(x, y, z, width, length, height, omit = {}) {
    super(x, y, z, width, length, height);
    this.omit = {
      ...{
        back: y <= 0 || width === 0 || height === 0,
        left: x <= 0 || length === 0 || height === 0,
        bottom: z <= 0 || length === 0 || width === 0,
        front: y + length >= worldLength || width === 0 || height === 0,
        right: x + width >= worldLength || length === 0 || height === 0,
        top: length === 0 || width === 0,
      },
      ...omit,
    };

    this.constructor.instances.push(this);
  }
}

//walls

new Block(0, 0, 0, 4096, 0, 512);

new Block(4096, 0, 0, 0, 4096, 512);

new Block(0, 4096, 0, 4096, 0, 512);

new Block(0, 0, 0, 0, 4096, 512);

//

new Block(512, 512, 0, 256, 256, 64);

//floor
new Block(0, 0, 0, 4096, 4096, 0);
//

new Block(256, 128, 0, 0, 256, 192);

new Block(256, 128, 0, 256, 0, 192);

new Block(512, 896, 128, 256, 512, 96);

new Block(1024, 1024, 256, 384, 256, 32);

new Block(1536, 768, 384, 256, 512, 16);

new Block(1792, 1024, 0, 384, 512, 480);

new Block(256, 2048, 0, 64, 512, 256, { top: true });

new Block(512, 2048, 0, 64, 1024, 256, { top: true });

new Block(576, 2176, 0, 128, 128, 128, { left: true });

new Block(256, 2048, 256, 320, 1024, 32);

new Block(3840, 3840, 0, 256, 256, 256);

new Block(2048, 2048, 0, 384, 384, 1024);

new Block(1920, 1920, 384, 1280, 640, 64, { front: true });

new Block(2668, 2048, 0, 384, 384, 1024);

new Block(1920, 2560, 0, 1280, 640, 448);

new Block(2432, 3200, 0, 512, 320, 256, { back: true });

new Block(2432, 3520, 224, 512, 576, 32, { back: true });

//CAMERA-FACING SPRITES

class CameraFacingEntity extends Entity {
  static instances = [];
  constructor(x, y, z, width, length, height) {
    super(x, y, z, width, length, height);
    this.constructor.instances.push(this);
  }
}

//PLAYER

class Player extends Entity {
  constructor(
    x,
    y,
    z,
    width,
    length,
    height,
    acceleration,
    friction,
    maxSpeed,
    maxVSpeed
  ) {
    super(x, y, z, width, length, height);
    this.acceleration = acceleration;
    this.friction = friction;
    this.maxSpeed = maxSpeed;
    this.maxVSpeed = maxVSpeed;
    this.velocity = {
      x: 0,
      y: 0,
      z: 0,
    };
    this.canJump = true;
  }

  vectorBackward(angle) {
    return {
      x: sin(angle),
      y: cos(angle),
    };
  }

  vectorRight(angle) {
    return {
      x: cos(angle),
      y: sin(angle) * -1,
    };
  }

  forward(angle) {
    this.velocity.x -= this.vectorBackward(angle).x * this.acceleration;
    this.velocity.y -= this.vectorBackward(angle).y * this.acceleration;
  }

  backward(angle) {
    this.velocity.x += this.vectorBackward(angle).x * this.acceleration;
    this.velocity.y += this.vectorBackward(angle).y * this.acceleration;
  }

  left(angle) {
    this.velocity.x -= this.vectorRight(angle).x * this.acceleration;
    this.velocity.y -= this.vectorRight(angle).y * this.acceleration;
  }

  right(angle) {
    this.velocity.x += this.vectorRight(angle).x * this.acceleration;
    this.velocity.y += this.vectorRight(angle).y * this.acceleration;
  }

  clampVelocity() {
    // Calculate the magnitude (length) of the velocity vector
    const magnitude = Math.sqrt(
      Math.pow(this.velocity.x, 2) + Math.pow(this.velocity.y, 2)
    );

    // If the magnitude exceeds the maximum speed, normalize the velocity
    if (magnitude > this.maxSpeed) {
      const scale = this.maxSpeed / magnitude;

      // Normalize and scale the velocity vector to the max speed
      this.velocity.x *= scale;
      this.velocity.y *= scale;

      // console.log(scale);

      // this.velocity.z = clamp(this.velocity.z, -this.maxVSpeed, this.maxVSpeed);
    }
  }

  gravity() {
    this.velocity.z -= this.acceleration * 0.25;
  }

  checkCollision() {
    const { x, y, z, width, length, height, velocity } = this;

    const checkX = { x: x + velocity.x, y, z, width, length, height };
    const checkY = { x, y: y + velocity.y, z, width, length, height };
    const checkZ = { x, y, z: z + velocity.z, width, length, height };

    const xCol = isGroupCollision(checkX, Block.instances);
    const yCol = isGroupCollision(checkY, Block.instances);
    const zCol = isGroupCollision(checkZ, Block.instances);

    if (xCol) {
      if (velocity.x > 0) {
        this.x = xCol.x - width - 0.01;
      } else if (velocity.x < 0) {
        this.x = xCol.x + xCol.width + 0.01;
      }

      this.velocity.x = 0;
      this.velocity.y *= this.friction;
    }

    if (yCol) {
      if (velocity.y > 0) {
        this.y = yCol.y - length - 0.01;
      } else if (velocity.y < 0) {
        this.y = yCol.y + yCol.length + 0.01;
      }

      this.velocity.y = 0;
      this.velocity.x *= this.friction;
    }

    if (zCol) {
      if (velocity.z > 0) {
        this.z = zCol.z - height - 0.01;
      } else if (velocity.z < 0) {
        this.z = zCol.z + zCol.height + 0.01;
      }

      this.velocity.z = 0;

      if (!PRESSING.SPACE) {
        this.canJump = true;
      }
    } else {
      this.canJump = false;
    }
  }

  applyFriction() {
    this.velocity.x *= this.friction;
    this.velocity.y *= this.friction;
  }

  updatePosition() {
    this.x += this.velocity.x;
    this.y += this.velocity.y;
    this.z += this.velocity.z;
  }
}

const PLAYER = new Player(128, 128, 0, 64, 64, 96, 0.4, 0.85, 5, 8);

//temp visualization element
PLAYER.colBoxBottom = newDiv({ id: "player-col" });
PLAYER.colBoxTop = newDiv({ id: "player-col-top" });
PLAYER.spriteImg = newDiv({ id: "player-sprite" });

const resolveInputs = (angleZ, p) => {
  if (PRESSING.SPACE && p.canJump) {
    p.canJump = false;
    p.velocity.z = 6;
  }

  if (PRESSING.UP || PRESSING.DOWN || PRESSING.LEFT || PRESSING.RIGHT) {
    if (!(PRESSING.UP && PRESSING.DOWN)) {
      if (PRESSING.UP) {
        p.forward(angleZ);
      } else if (PRESSING.DOWN) {
        p.backward(angleZ);
      }
    } else {
      p.applyFriction();
    }

    if (!(PRESSING.LEFT && PRESSING.RIGHT)) {
      if (PRESSING.LEFT) {
        p.left(angleZ);
      } else if (PRESSING.RIGHT) {
        p.right(angleZ);
      }
    } else {
      p.applyFriction();
    }
  } else {
    p.applyFriction();
  }

  //SPLIT OUT FRICTION (MAY BE NEEDED TO MAKE FRICTION CORRECT WITH MULTIPLE KEYS DOWN)

  p.gravity();

  p.checkCollision();

  p.clampVelocity();

  p.updatePosition();
};

const resolveHiddenFaces = (angleZ) => {
  return {
    rightVis: angleZ > 270 - 45 && angleZ < 270 + 45 ? "none" : "unset",
    leftVis: angleZ > 90 - 45 && angleZ < 90 + 45 ? "none" : "unset",
    backVis: angleZ > 315 || angleZ < 45 ? "none" : "unset",
    frontVis: angleZ > 180 - 45 && angleZ < 180 + 45 ? "none" : "unset",
  };
};

const returnCSSText = (
  angleX,
  angleZ,
  pX,
  pY,
  pZ,
  pWidth,
  pLength,
  pHeight
) => {
  const sceneX = pX * -1 - pWidth * 0.5;
  const sceneY = pY * -1 - pLength * 0.5;
  const sceneZ = pZ * -1 - pHeight;

  // const { rightVis, leftVis, backVis, frontVis } = resolveHiddenFaces(angleZ);

  return `
  --angle-x:${angleX}deg;--angle-z:${angleZ}deg;
  --scene-x:${sceneX}px;--scene-y:${sceneY}px;--scene-z:${sceneZ}px;
  --player-x:${pX}px;--player-y:${pY}px;--player-z:${pZ}px;--player-height:${pHeight}px;
  --player-width:${pWidth}px;--player-length:${pLength}px`;
};

//--right-vis:${rightVis};--left-vis:${leftVis};--back-vis:${backVis};--front-vis:${frontVis}

//CURSOR LOOK

const SENSITIVITY = 0.5;

on("mousemove", (e) => {
  if (LOCKED) {
    angleZ.target -= e.movementX * SENSITIVITY;
    angleX.target -= e.movementY * SENSITIVITY;
  }
});

//LOOP

const TARGET_FPS = 60;
const SPEED_MULTIPLIER = 1 / (1000 / TARGET_FPS);
let then = performance.now();

const step = (timeStamp) => {
  SCENE.style.cssText = returnCSSText(
    angleX.eased,
    angleZ.eased,
    PLAYER.x,
    PLAYER.y,
    PLAYER.z,
    PLAYER.width,
    PLAYER.length,
    PLAYER.height
  );

  const mult = (timeStamp - then) * SPEED_MULTIPLIER;

  EasedValue.ease(mult);
  resolveInputs(angleZ.target, PLAYER);

  // console.log(isGroupCollision(PLAYER, Block.instances));
  // console.log(PLAYER.x, PLAYER.y);

  // console.log(angleZ.target);

  then = timeStamp;

  requestAnimationFrame(step);
};

//LAYER BUILDING

const compileLayers = (blocks) => {
  const sidesToLighting = {
    front: "rgba(0, 0, 0, 0.15)",
    back: "rgba(0, 0, 0, 0.3)",
    left: "rgba(0, 0, 0, 0.45)",
    right: "rgba(255, 255, 255, 0.15)",
    top: "rgba(0, 0, 0, 0)",
    bottom: "rgba(0, 0, 0, 0.55)",
  };
  //TOP FACES
  const uniqueTopVals = [
    ...new Set(blocks.map((block) => block.z + block.height)),
  ];

  const topFaceLayers = uniqueTopVals.map((val) => [
    val,
    blocks.filter((block) => block.z + block.height === val && !block.omit.top),
  ]);

  topFaceLayers.forEach(([zVal, items]) => {
    const x = Math.min(...items.map((item) => item.x));
    const y = Math.min(...items.map((item) => item.y));

    const width = Math.max(...items.map((item) => item.x + item.width)) - x;
    const height = Math.max(...items.map((item) => item.y + item.length)) - y;

    const cnvs = newCanvas({ width, height });
    const ctx = cnvs.getContext("2d");

    const pattern = ctx.createPattern(TEXTURES["grass"], "repeat");

    items.forEach((item) => {
      ctx.fillStyle = pattern;
      ctx.fillRect(item.x - x, item.y - y, item.width, item.length);
      ctx.fillStyle = sidesToLighting.top;
      ctx.fillRect(item.x - x, item.y - y, item.width, item.length);
      ctx.strokeRect(item.x - x, item.y - y, item.width, item.length);
    });

    ctx.fillStyle = "black";
    ctx.font = "100px serif";
    // ctx.fillText(zVal, 64, 64);

    cnvs.toBlob(
      (blob) => {
        const url = URL.createObjectURL(blob);
        const img = newImg({
          class: "side",
          style: `transform: translate3d(${x}px, ${y}px, ${zVal}px)`,
        });

        onFirst(
          "load",
          () => {
            URL.revokeObjectURL(url);
            SCENE.append(img);
          },
          img
        );

        img.src = url;
      },
      "image/webp",
      0.75
    );
  });

  //FRONT FACES

  const uniqueFrontVals = [
    ...new Set(blocks.map((block) => block.y + block.length)),
  ];

  const frontFaceLayers = uniqueFrontVals.map((val) => [
    val,
    blocks.filter(
      (block) => block.y + block.length === val && !block.omit.front
    ),
  ]);

  frontFaceLayers.forEach(([yVal, items]) => {
    const x = Math.min(...items.map((item) => item.x));
    const z = Math.min(...items.map((item) => item.z));

    const width = Math.max(...items.map((item) => item.x + item.width)) - x;
    const height = Math.max(...items.map((item) => item.z + item.height)) - z;

    const cnvs = newCanvas({ width, height });
    const ctx = cnvs.getContext("2d");

    const pattern = ctx.createPattern(TEXTURES["wall"], "repeat");

    items.forEach((item) => {
      ctx.fillStyle = pattern;
      ctx.fillRect(
        item.x - x,
        height + z - item.z - item.height,
        item.width,
        item.height
      );
      ctx.fillStyle = sidesToLighting.front;
      ctx.fillRect(
        item.x - x,
        height + z - item.z - item.height,
        item.width,
        item.height
      );
      ctx.strokeRect(
        item.x - x,
        height + z - item.z - item.height,
        item.width,
        item.height
      );
    });

    ctx.fillStyle = "black";
    ctx.font = "100px serif";
    // ctx.fillText(yVal, 64, 64);

    cnvs.toBlob(
      (blob) => {
        const url = URL.createObjectURL(blob);
        const img = newImg({
          class: "side",
          style: `transform: translate3d(${x}px, ${yVal - height * 0.5}px, ${
            z + height * 0.5
          }px) rotate3d(1, 0, 0, -90deg)`,
        });

        onFirst(
          "load",
          () => {
            URL.revokeObjectURL(url);
            SCENE.append(img);
          },
          img
        );

        img.src = url;
      },
      "image/webp",
      0.75
    );
  });

  //LEFT FACES

  const uniqueLeftVals = [...new Set(blocks.map((block) => block.x))];

  const leftFaceLayers = uniqueLeftVals.map((val) => [
    val,
    blocks.filter((block) => block.x === val && !block.omit.left),
  ]);

  leftFaceLayers.forEach(([xVal, items]) => {
    const y = Math.min(...items.map((item) => item.y));
    const z = Math.min(...items.map((item) => item.z));

    const width = Math.max(...items.map((item) => item.y + item.length)) - y;
    const height = Math.max(...items.map((item) => item.z + item.height)) - z;

    const cnvs = newCanvas({ width, height });
    const ctx = cnvs.getContext("2d");

    const pattern = ctx.createPattern(TEXTURES["wall"], "repeat");

    items.forEach((item) => {
      ctx.fillStyle = pattern;
      ctx.fillRect(
        item.y - y,
        height + z - item.z - item.height,
        item.length,
        item.height
      );
      ctx.fillStyle = sidesToLighting.left;
      ctx.fillRect(
        item.y - y,
        height + z - item.z - item.height,
        item.length,
        item.height
      );
      ctx.strokeRect(
        item.y - y,
        height + z - item.z - item.height,
        item.length,
        item.height
      );
    });

    ctx.fillStyle = "black";
    ctx.font = "100px serif";
    // ctx.fillText(xVal, 64, 64);

    cnvs.toBlob(
      (blob) => {
        const url = URL.createObjectURL(blob);
        const img = newImg({
          class: "side",
          style: `transform: translate3d(${xVal - width * 0.5}px, ${
            y + width * 0.5 - height * 0.5
          }px, ${
            z + 0.5 * height
          }px) rotate3d(1, 0, 0, -90deg) rotate3d(0, 1, 0, -90deg)`,
        });

        onFirst(
          "load",
          () => {
            URL.revokeObjectURL(url);
            SCENE.append(img);
          },
          img
        );

        img.src = url;
      },
      "image/webp",
      0.75
    );
  });

  //RIGHT FACES

  const uniqueRightVals = [
    ...new Set(blocks.map((block) => block.x + block.width)),
  ];

  const rightFaceLayers = uniqueRightVals.map((val) => [
    val,
    blocks.filter(
      (block) => block.x + block.width === val && !block.omit.right
    ),
  ]);

  rightFaceLayers.forEach(([xVal, items]) => {
    const y = Math.min(...items.map((item) => item.y));
    const z = Math.min(...items.map((item) => item.z));

    const width = Math.max(...items.map((item) => item.y + item.length)) - y;
    const height = Math.max(...items.map((item) => item.z + item.height)) - z;

    const cnvs = newCanvas({ width, height });
    const ctx = cnvs.getContext("2d");

    const pattern = ctx.createPattern(TEXTURES["wall"], "repeat");

    items.forEach((item) => {
      ctx.fillStyle = pattern;
      ctx.fillRect(
        width - item.length - item.y + y,
        height + z - item.z - item.height,
        item.length,
        item.height
      );
      ctx.fillStyle = sidesToLighting.right;
      ctx.fillRect(
        width - item.length - item.y + y,
        height + z - item.z - item.height,
        item.length,
        item.height
      );
      ctx.strokeRect(
        width - item.length - item.y + y,
        height + z - item.z - item.height,
        item.length,
        item.height
      );
    });

    ctx.fillStyle = "black";
    ctx.font = "100px serif";
    // ctx.fillText(xVal, 64, 64);

    cnvs.toBlob(
      (blob) => {
        const url = URL.createObjectURL(blob);
        const img = newImg({
          class: "side",
          style: `transform: translate3d(${xVal - width * 0.5}px, ${
            y + width * 0.5 - height * 0.5
          }px, ${
            z + 0.5 * height
          }px) rotate3d(1, 0, 0, -90deg) rotate3d(0, 1, 0, 90deg)`,
        });

        onFirst(
          "load",
          () => {
            URL.revokeObjectURL(url);
            SCENE.append(img);
          },
          img
        );

        img.src = url;
      },
      "image/webp",
      0.75
    );
  });

  //BACK FACES

  const uniqueBackVals = [...new Set(blocks.map((block) => block.y))];

  const backFaceLayers = uniqueBackVals.map((val) => [
    val,
    blocks.filter((block) => block.y === val && !block.omit.back),
  ]);

  backFaceLayers.forEach(([yVal, items]) => {
    const x = Math.min(...items.map((item) => item.x));
    const z = Math.min(...items.map((item) => item.z));

    const width = Math.max(...items.map((item) => item.x + item.width)) - x;
    const height = Math.max(...items.map((item) => item.z + item.height)) - z;

    const cnvs = newCanvas({ width, height });
    const ctx = cnvs.getContext("2d");

    const pattern = ctx.createPattern(TEXTURES["wall"], "repeat");

    items.forEach((item) => {
      ctx.fillStyle = pattern;
      ctx.fillRect(
        width - item.width - item.x + x,
        height + z - item.z - item.height,
        item.width,
        item.height
      );
      ctx.fillStyle = sidesToLighting.back;
      ctx.fillRect(
        width - item.width - item.x + x,
        height + z - item.z - item.height,
        item.width,
        item.height
      );
      ctx.strokeRect(
        width - item.width - item.x + x,
        height + z - item.z - item.height,
        item.width,
        item.height
      );
    });

    ctx.fillStyle = "black";
    ctx.font = "100px serif";
    // ctx.fillText(yVal, 64, 64);

    cnvs.toBlob(
      (blob) => {
        const url = URL.createObjectURL(blob);
        const img = newImg({
          class: "side",
          style: `transform: translate3d(${x}px, ${yVal - height * 0.5}px, ${
            z + height * 0.5
          }px) rotate3d(1, 0, 0, -90deg) rotate3d(0, 1, 0, 180deg)`,
        });

        onFirst(
          "load",
          () => {
            URL.revokeObjectURL(url);
            SCENE.append(img);
          },
          img
        );

        img.src = url;
      },
      "image/webp",
      0.75
    );
  });

  //BOTTOM FACES
  const uniqueBottomVals = [...new Set(blocks.map((block) => block.z))];

  const bottomFaceLayers = uniqueBottomVals.map((val) => [
    val,
    blocks.filter((block) => block.z === val && !block.omit.bottom),
  ]);

  bottomFaceLayers.forEach(([zVal, items]) => {
    const x = Math.min(...items.map((item) => item.x));
    const y = Math.min(...items.map((item) => item.y));

    const width = Math.max(...items.map((item) => item.x + item.width)) - x;
    const height = Math.max(...items.map((item) => item.y + item.length)) - y;

    const cnvs = newCanvas({ width, height });
    const ctx = cnvs.getContext("2d");

    const pattern = ctx.createPattern(TEXTURES["wall"], "repeat");

    items.forEach((item) => {
      ctx.fillStyle = pattern;
      ctx.fillRect(
        width - item.width - item.x + x,
        item.y - y,
        item.width,
        item.length
      );
      ctx.fillStyle = sidesToLighting.bottom;
      ctx.fillRect(
        width - item.width - item.x + x,
        item.y - y,
        item.width,
        item.length
      );
      ctx.strokeRect(
        width - item.width - item.x + x,
        item.y - y,
        item.width,
        item.length
      );
    });

    ctx.fillStyle = "black";
    ctx.font = "100px serif";
    // ctx.fillText(zVal, 64, 64);

    cnvs.toBlob(
      (blob) => {
        const url = URL.createObjectURL(blob);
        const img = newImg({
          class: "side",
          style: `transform: translate3d(${x}px, ${y}px, ${zVal}px) rotate3d(0, 1, 0, 180deg)`,
        });

        onFirst(
          "load",
          () => {
            URL.revokeObjectURL(url);
            SCENE.append(img);
          },
          img
        );

        img.src = url;
      },
      "image/webp",
      0.75
    );
  });
};

//

(async () => {
  await loadAllTextures(["grass", "wall"]);

  await compileLayers(Block.instances);

  setTimeout(
    () => console.log([...document.querySelectorAll(".side")].length),
    4000
  );

  SCENE.append(PLAYER.colBoxBottom, PLAYER.colBoxTop, PLAYER.spriteImg);

  step(performance.now());
})();
