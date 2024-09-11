import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { init } from "raspi";
import { Serial } from "raspi-serial";
const { Buffer } = require('node:buffer');

dotenv.config();
const PORT = process.env.PORT || 3000;

const app = express();

let LEFT_BOTTON_VOLUME = -127;
let RIGHT_BOTTON_VOLUME = 127;
let FRONT_BOTTON_VOLUME = 127;
let BACK_BOTTON_VOLUME = -127;

//const motionBuffer = new ArrayBuffer(1);
//const motion = new Uint8Array(motionBuffer);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

type SerialData = {
  x: number,
  y: number,
  flags: Flags,
};

type Flags = {
  collect: boolean,
  leftTurn: boolean,
  rightTurn: boolean,
  leftFiring: boolean,
  rightFiring: boolean,
};

type Event = StopEvent | MoveEvent | TurnEvent;

type StopEvent = {
  type: "stop";
  value: null;
};

type MoveEvent = {
  type: "move";
  value: JoyStickXY;
};

type TurnEvent = {
  type: "turn";
  value: Turn;
};

type JoyStickXY = {
  x: number;
  y: number;
};
type Turn = "left" | "right";

type ControllerData = {
  event: Event,
  // 回収
  collect: boolean,
  // 発射
  left_firing: boolean,
  right_firing: boolean,
};

//let leftTurnFlag: boolean;
//let rightTurnFlag: boolean;


init(() => {
  const serial = new Serial({
    portId: "/dev/serial0",
    baudRate: 115200,
    dataBits: 8,
    stopBits: 1,
    parity: "none"
  });
  serial.open(() => {
    console.log("Serial port opened.");

    serial.on('data', (data) => {
      console.log('Data received:', data.toString());
    });

    app.get("/ping", (request: Request, response: Response) => {
      response.status(200).send();
    });

    app.post("/send", (request: Request, response: Response) => {
      const data: ControllerData = request.body;
      console.log(data);


      // dataが1バイトの範囲内にあるかを確認
      //Math.max(0, Math.min(255, data.joystick_x));
      //Math.max(0, Math.min(255, data.joystick_y));

      // let byteDataX = Math.max(0, Math.min(255, data.x));
      // let byteDataY = Math.max(0, Math.min(255, data.y));

      //if (event.type != "StopEvent") {
      //
      //  switch (data.event) {
      //    case "left":
      //      data.joystick_x = LEFT_BOTTON_VOLUME;
      //      data.joystick_y = 0;
      //      break;
      //    case "right":
      //      data.joystick_x = RIGHT_BOTTON_VOLUME;
      //      data.joystick_y = 0;
      //      break;
      //    case "front":
      //      data.joystick_x = 0;
      //      data.joystick_y = FRONT_BOTTON_VOLUME;
      //      break;
      //    case "back":
      //      data.joystick_x = 0;
      //      data.joystick_y = BACK_BOTTON_VOLUME;
      //      break;
      //    case "leftTurn":
      //      data.joystick_x = 0;
      //      data.joystick_y = 0;
      //      leftTurnFlag = true;
      //      rightTurnFlag = false;
      //      break;
      //    case "rightTurn":
      //      data.joystick_x = 0;
      //      data.joystick_y = 0;
      //      leftTurnFlag = false;
      //      rightTurnFlag = true;
      //      break;
      //  }
      //}

      let serialData: SerialData = {
        x: data.event.type === "move" ? data.event.value.x : 0,
        y: data.event.type === "move" ? data.event.value.y : 0,
        flags: {
          leftTurn: data.event.type === "turn" ? data.event.value === "left" : false,
          rightTurn: data.event.type === "turn" ? data.event.value === "right" : false,
          collect: data.collect,
          leftFiring: data.left_firing,
          rightFiring: data.right_firing
        }
      };
 
      // if (data.event.type == "stop") {
      //   serialData.x = 0;
      //   serialData.y = 0;
      //   serialData.flags.leftTurn = false;
      //   serialData.flags.rightTurn = false;

      // }
      // else if (data.event.type == "move") {
      //   serialData.x = data.event.value.x;
      //   serialData.y = data.event.value.y;
      //   serialData.flags.leftTurn = false;
      //   serialData.flags.rightTurn = false;
      // } else if (data.event.type == "turn") {
      //   serialData.x = 0;
      //   serialData.y = 0;

      //   if (data.event.value == "left") {
      //     serialData.flags.leftTurn = true;
      //     serialData.flags.rightTurn = false;
      //   }
      //   else {
      //     serialData.flags.leftTurn = false;
      //     serialData.flags.rightTurn = true;
      //   }
      // }
      // serialData.flags.collect = data.collect;
      // serialData.flags.leftFiring = data.left_firing;
      // serialData.flags.rightFiring = data.right_firing;

      let flags = 0; //初期化
      if (serialData!.flags.collect) { flags |= (1 << 7); }
      if (serialData!.flags.rightFiring) { flags |= (1 << 6); }
      if (serialData!.flags.leftFiring) { flags |= (1 << 5); }
      if (serialData!.flags.leftTurn) { flags |= (1 << 4); }
      if (serialData!.flags.rightTurn) { flags |= (1 << 3); }
      //if (data.left_winding) { value |= (1 << 4); }
      //if (data.right_winding) { value |= (1 << 3); }

      // データを送信
      const sendBuffer = Buffer.from([0x02, 0x03, serialData.x, serialData.y, flags, 0x03]);
      console.log(sendBuffer);
      serial.write(sendBuffer, () => {
        response.status(200).send();
      });
    });

    app.listen(PORT, () => {
      console.log("Server running at PORT: ", PORT);
    }).on("error", (error) => {
      console.error('Server error:', error);
      process.exit(1);
    });
  });
});

