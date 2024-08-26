import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { init } from "raspi";
import { Serial } from "raspi-serial"

dotenv.config();
const PORT = process.env.PORT;

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
      const data = request.body.data;

      const buffer = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]);

      serial.write(data.toString());

      response.status(200).send("Success!");
    });

    app.listen(PORT, () => {
      console.log("Server running at PORT: ", PORT);
    }).on("error", (error) => {
      throw new Error(error.message);
    });
  });
});
