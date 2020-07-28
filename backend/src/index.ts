require('dotenv').config();

import * as express from 'express';
import { Socket } from 'socket.io';
import { CronJob, CronTime } from 'cron';
import { exec } from "child_process";
import * as pino from 'pino';

const logger = pino();
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

type SystemState = {
  pumpActive: boolean;
  pumpDisabled: boolean;
  pumpCronJobPattern: string,
  pumpCronJobDurationMilliSeconds: number,
}

let state: SystemState = {
  pumpActive: false,
  pumpDisabled: false,
  pumpCronJobPattern: '* * * * *',
  pumpCronJobDurationMilliSeconds: 15000
}

let sockets: Socket[] = [];

io.on('connect', (socket: Socket) => {
  logger.info('client connected');
  sockets.push(socket);
  socket.emit('systemState', state);
  socket.on('setPumpDisabled', (disabled: boolean) => {
    logger.info(`Received "setPumpDisabled" event - target state is ${disabled}`);
    state.pumpDisabled = disabled;
    if (disabled) {
      stopPump();
    }
    emitState();
  });

  socket.on('setPumpCronJobPattern', (pattern: string) => {
    logger.info(`Received "setPumpCronJobPattern" event - target pattern is ${pattern}`);

    let cronTime: CronTime;
    try {
      cronTime = new CronTime(pattern);
    } catch (error) {
      logger.info("Invalid pattern provided, not doing anything ...");
      return;
    }

    state.pumpCronJobPattern = pattern;
    stopPump();
    clearTimeout(stopTimeoutId);
    cronJob.setTime(cronTime);
    emitState();
  });

  socket.on('setPumpCronJobDurationMilliSeconds', (duration: number) => {
    logger.info(`Received "setPumpCronJobDurationMilliSeconds" event - target duration is ${duration}`);
    state.pumpCronJobDurationMilliSeconds = duration;
    emitState();
  });
});

const stopPump = () => {
  logger.info("Stopping pump");
  if (process.env.NODE_ENV === "production") {
    exec(`gpio write ${process.env.PUMP_GPIO_PIN} 1`);
  }
  state.pumpActive = false;
}

const startPump = () => {
  logger.info("Starting pump");
  if (process.env.NODE_ENV === "production") {
    exec(`gpio write ${process.env.PUMP_GPIO_PIN} 0`);
  }
  state.pumpActive = true;
}

let stopTimeoutId: any;
const cronJob = new CronJob(state.pumpCronJobPattern, () => {
  if (!state.pumpDisabled) {
    startPump();
    emitState();
    stopTimeoutId = setTimeout(() => {
      stopPump();
      emitState();
    }, state.pumpCronJobDurationMilliSeconds);
  }
}, null, true, 'Europe/Oslo');

const emitState = () => {
  sockets.forEach(currentSocket => {
    if (currentSocket.connected) {
      currentSocket.emit('systemState', state);
    } else {
      logger.info(`Removing inactive socket with id "${currentSocket.id}"`);
      sockets = sockets.filter(socket => socket.id !== currentSocket.id);
    }
  });
}

// Initialize GPIO pin
if (process.env.NODE_ENV === "production") {
  exec(`gpio mode ${process.env.PUMP_GPIO_PIN} out`);
}
stopPump();

server.listen(process.env.PORT, () => {
  logger.info(`listening on *:${process.env.PORT}`);
});