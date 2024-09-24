import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { init } from "raspi";
import { Serial } from "raspi-serial";
import { cors } from "cors";
const { Buffer } = require('node:buffer');

dotenv.config();
const PORT = process.env.PORT || 3000;

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());

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

  collect: boolean,

  left_firing: boolean,
  right_firing: boolean,
};

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

      let flags = 0;
      if (serialData!.flags.collect) { flags |= (1 << 7); }
      if (serialData!.flags.rightFiring) { flags |= (1 << 6); }
      if (serialData!.flags.leftFiring) { flags |= (1 << 5); }
      if (serialData!.flags.leftTurn) { flags |= (1 << 4); }
      if (serialData!.flags.rightTurn) { flags |= (1 << 3); }

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

