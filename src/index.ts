import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { init } from "raspi";
import { Serial } from "raspi-serial";

dotenv.config();
const PORT = process.env.PORT || 3000;

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

type ControllerData = {
  x: number,
  y: number,
};

init(() => {
  const serial = new Serial({
    portId: "/dev/serial0",
    baudRate: 9600,
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
      // let byteDataX = Math.max(0, Math.min(255, data.x));
      // let byteDataY = Math.max(0, Math.min(255, data.y));

      // データを送信
      const buffer = Buffer.from([data.x, data.y]);
      serial.write(buffer, () => {
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

