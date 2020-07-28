require('dotenv').config();

import * as express from 'express';
import { Socket } from 'socket.io';
import { CronJob, CronTime } from 'cron';
import { exec } from "child_process";

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

// Initialize GPIO pin
if (process.env.NODE_ENV === "production") {
  exec(`gpio mode ${process.env.PUMP_GPIO_PIN} out`);
}

let sockets: Socket[] = [];

io.on('connect', (socket: Socket) => {
  console.log('client connected');
  sockets.push(socket);
  socket.emit('systemState', state);
  socket.on('setPumpDisabled', (disabled: boolean) => {
    console.log(`Received "setPumpDisabled" event - target state is ${disabled}`);
    state.pumpDisabled = disabled;
    if (disabled) {
      stopPump();
    }
    emitState();
  });

  socket.on('setPumpCronJobPattern', (pattern: string) => {
    console.log(`Received "setPumpCronJobPattern" event - target pattern is ${pattern}`);
    state.pumpCronJobPattern = pattern;
    
    stopPump();
    clearTimeout(stopTimeoutId);
    cronJob.setTime(new CronTime(pattern));
    emitState();
  });

  socket.on('setPumpCronJobDurationMilliSeconds', (duration: number) => {
    console.log(`Received "setPumpCronJobDurationMilliSeconds" event - target duration is ${duration}`);
    state.pumpCronJobDurationMilliSeconds = duration;
  });
});

const stopPump = () => {
  console.log("Stopping pump");
  if (process.env.NODE_ENV === "production") {
    exec(`gpio write ${process.env.PUMP_GPIO_PIN} 0`);
  }
  state.pumpActive = false;
}

const startPump = () => {
  console.log("Starting pump");
  if (process.env.NODE_ENV === "production") {
    exec(`gpio write ${process.env.PUMP_GPIO_PIN} 1`);
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
      console.log(`Removing inactive socket with id "${currentSocket.id}"`);
      sockets = sockets.filter(socket => socket.id !== currentSocket.id);
    }
  });
}

server.listen(process.env.PORT, () => {
  console.log(`listening on *:${process.env.PORT}`);
});