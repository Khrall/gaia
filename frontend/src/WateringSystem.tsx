import React, { useEffect, useState } from 'react';
import { Input, Button, Header, Checkbox, Message } from 'semantic-ui-react';
import io from 'socket.io-client';

import './WateringSystem.scss';


const socket = io('https://meus-gaia.ddns.net');

type SystemState = {
  pumpActive: boolean;
  pumpDisabled: boolean;
  pumpCronJobPattern: string;
  pumpCronJobDurationMilliSeconds: number,
}

const setPumpDisabled = (newPumpState: boolean) => socket.emit("setPumpDisabled", newPumpState);
const setPumpCronJobPattern = (pattern: string) => socket.emit("setPumpCronJobPattern", pattern);
const setPumpCronJobDurationMilliSeconds = (duration: number) => socket.emit("setPumpCronJobDurationMilliSeconds", duration);


const WateringSystem = () => {
  const [cronJobPattern, setCronJobPattern] = useState<string>('');
  const [cronJobDurationMilliSeconds, setCronJobDurationMilliSeconds] = useState<number | ''>('');
  const [connectionError, setConnectionError] = useState<string>('');
  const [systemState, setSystemState] = useState<SystemState>({
    pumpActive: false,
    pumpDisabled: false,
    pumpCronJobPattern: '*/1 * * * *',
    pumpCronJobDurationMilliSeconds: 5000
  });

  useEffect(() => {
    // Custom events
    socket.on("systemState", (state: SystemState) => {
      setSystemState(state);
      setConnectionError('');
    });
  }, []);

  useEffect(() => {
    // Generic events
    socket.on('connect', () => setConnectionError(''));
    socket.on('disconnect', () => setConnectionError('disconnect'));
    socket.on('connect_error', () => setConnectionError('connect_error'));
    socket.on('error',
      (error: Error) => setConnectionError((error && error.message) || 'Empty Error Message')
    );
  }, []);

  return (
    <div className="Watering-system">
      {connectionError && (
        <Message color="red">
          <Message.Header>Connection Error</Message.Header>
          <p>{connectionError}</p>
        </Message>
      )}

      <div>
        <div className="toggle">
          <Header as="h2" className="toggle-header">
            Automated Watering System
          </Header>

          <Checkbox
            toggle
            checked={!systemState.pumpDisabled}
            onClick={() => setPumpDisabled(!systemState.pumpDisabled)}
          />
        </div>

        {!systemState.pumpDisabled && (
          <div>{`The pump is currently ${systemState.pumpActive
            ? '💦 PUMPING 💦'
            : 'doing nothing 😴'
            }`}</div>
        )}

      </div>

      <div className="input-group">
        <Header as="h3">
          Watering Cycle
          </Header>

        <p>Current pattern: <code>{systemState.pumpCronJobPattern}</code></p>

        <div>
          <Input
            placeholder="Enter pattern"
            value={cronJobPattern}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCronJobPattern(e.target.value)}
          />
          <Button onClick={() => {
            setPumpCronJobPattern(cronJobPattern);
            setCronJobPattern('')
          }}>
            Update pattern
          </Button>
        </div>
      </div>

      <div className="input-group">
        <Header as="h3">
          Watering Duration
        </Header>
        <p>{`Current duration: ${systemState.pumpCronJobDurationMilliSeconds} ms`}</p>

        <div>
          <Input
            placeholder="Enter duration"
            value={cronJobDurationMilliSeconds}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCronJobDurationMilliSeconds(parseInt(e.target.value))}
            type="number"
            label={{ basic: true, content: 'ms' }}
            labelPosition='right'
          />
          <Button onClick={() => {
            if (cronJobDurationMilliSeconds) {
              setPumpCronJobDurationMilliSeconds(cronJobDurationMilliSeconds);
              setCronJobDurationMilliSeconds('');
            }
          }}>
            Set new duration
          </Button>
        </div>
      </div>
    </div>
  );
}

export default WateringSystem;
